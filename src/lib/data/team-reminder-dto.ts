import "server-only";
import { createTranslator } from "next-intl";

import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";
import { calendarDateInZone, isoWeekday, shortDate } from "../attendance";
import { getTimeZone } from "../config";
import { objectIdSchema } from "../objectid";
import prisma from "../prisma";
import { isReminderDue, membersMissing, MissingMember, ReminderSettings, reminderSettingsSchema, requiredDates } from "../team-reminders";
import { getTeamDescendants } from "../team-tree";
import { toWallTime } from "../zoned-time";
import { getTeamTree, requireAdmin, TeamError, TeamTreeEntry } from "./team-dto";

export type TeamReminderDTO = {
  team: { id: string; name: string };
  settings: ReminderSettings;
  hasWebhook: boolean;
  /** Who would be reminded if it went out now. */
  missing: { name: string; dates: string[] }[];
};

const reminderSelect = {
  id: true, name: true, reminderEnabled: true, reminderWeekdays: true, reminderDaysAhead: true,
  reminderTime: true, reminderWebhookUrl: true, reminderSentOn: true,
} as const;

function assertValidId(id: string) {
  if (!objectIdSchema.safeParse(id).success) throw new TeamError("Invalid team id.");
}

// Teams saved before these fields existed read them as null
const settingsOf = (team: { reminderEnabled: boolean; reminderWeekdays: number[]; reminderDaysAhead: number; reminderTime: string }): ReminderSettings => ({
  enabled: team.reminderEnabled ?? false,
  weekdays: team.reminderWeekdays ?? [],
  daysAhead: team.reminderDaysAhead ?? 7,
  time: team.reminderTime ?? "20:00",
});

/** Members of the team and of its sub-teams at any depth who haven't answered a required day. */
async function findMissing(tree: TeamTreeEntry[], teamId: string, settings: ReminderSettings, on: string): Promise<MissingMember[]> {
  const required = requiredDates(on, settings.weekdays, settings.daysAhead);
  if (required.length === 0) return [];

  const members = await prisma.user.findMany({
    where: { teamIds: { hasSome: [teamId, ...getTeamDescendants(tree, teamId).map(team => team.id)] } },
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });
  if (members.length === 0) return [];

  const answered = await prisma.attendanceEntry.findMany({
    where: { userId: { in: members.map(m => m.id) }, date: { in: required }, slot: "AllDay" },
    select: { userId: true, date: true },
  });
  return membersMissing(members, required, answered);
}

export async function getTeamReminder(teamId: string): Promise<TeamReminderDTO | null> {
  await requireAdmin();
  assertValidId(teamId);

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: reminderSelect });
  if (!team) return null;

  const settings = settingsOf(team);
  const today = calendarDateInZone(new Date(), getTimeZone());
  const missing = await findMissing(await getTeamTree(), team.id, settings, today);

  return {
    team: { id: team.id, name: team.name },
    settings,
    hasWebhook: Boolean(team.reminderWebhookUrl),
    missing: missing.map(member => ({ name: member.name, dates: member.dates })),
  };
}

export async function saveTeamReminder(teamId: string, input: unknown): Promise<void> {
  await requireAdmin();
  assertValidId(teamId);

  const parsed = reminderSettingsSchema.safeParse(input);
  if (!parsed.success) throw new TeamError("Invalid reminder settings.");
  const settings = parsed.data;

  await prisma.team.update({
    where: { id: teamId },
    data: {
      reminderEnabled: settings.enabled,
      reminderWeekdays: settings.weekdays,
      reminderDaysAhead: settings.daysAhead,
      reminderTime: settings.time,
    },
  });
}

/** Null removes it. */
export async function setTeamReminderWebhook(teamId: string, url: string | null): Promise<void> {
  await requireAdmin();
  assertValidId(teamId);

  const value = url?.trim() || null;
  if (value) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new TeamError("The webhook must be a URL.");
    }
    if (parsed.protocol !== "https:") throw new TeamError("The webhook must use https.");
  }

  await prisma.team.update({ where: { id: teamId }, data: { reminderWebhookUrl: value } });
}

const LOCALES = { en, "zh-TW": zhTW } as const;

/** `&`, `<` and `>` are control characters in Slack text; `<!channel>` in a name would ping everyone. */
const escapeSlack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** The Slack text for one team, in `REMINDER_LOCALE` (`en` or `zh-TW`, default `en`). */
function reminderText(teamName: string, missing: MissingMember[], url: string): string {
  const locale = process.env.REMINDER_LOCALE === "zh-TW" ? "zh-TW" : "en";
  const t = createTranslator({ locale, messages: LOCALES[locale], namespace: "TeamReminder" });
  const day = (date: string) => `${shortDate(date)} (${t(`weekday.${isoWeekday(date)}` as "weekday.1")})`;

  return [
    t("heading", { team: escapeSlack(teamName) }),
    ...missing.map(member => `• <@${member.email}> ${member.dates.map(day).join(", ")}`),
    t("footer", { url }),
  ].join("\n");
}

export type ReminderRun = { teamId: string; result: "sent" | "nobodyMissing" | "noWebhook" | "failed" };

/**
 * For the scheduler: sends each team's reminder that is due at `now` (once a day, after its time). A team is
 * claimed before sending so overlapping calls don't send twice; any failure after the claim releases it, so the
 * next call retries. A team without a webhook isn't claimed, so adding one later the same day still sends.
 */
export async function sendDueReminders(now: Date, appUrl: string): Promise<ReminderRun[]> {
  const timeZone = getTimeZone();
  const wall = toWallTime(now, timeZone);
  const date = calendarDateInZone(now, timeZone);
  const time = `${String(wall.hour).padStart(2, "0")}:${String(wall.minute).padStart(2, "0")}`;

  const teams = await prisma.team.findMany({ where: { reminderEnabled: true }, select: reminderSelect });
  const due = teams.filter(team => isReminderDue(team, { date, time }));
  if (due.length === 0) return [];

  const tree = await getTeamTree();
  const runs: ReminderRun[] = [];

  for (const team of due) {
    const webhookUrl = team.reminderWebhookUrl;
    if (!webhookUrl) {
      runs.push({ teamId: team.id, result: "noWebhook" });
      continue;
    }

    const previous = team.reminderSentOn;
    const claimed = await prisma.team.updateMany({
      where: { id: team.id, OR: [{ reminderSentOn: { isSet: false } }, { reminderSentOn: null }, { reminderSentOn: { not: date } }] },
      data: { reminderSentOn: date },
    });
    if (claimed.count === 0) continue;

    try {
      const missing = await findMissing(tree, team.id, settingsOf(team), date);
      if (missing.length === 0) {
        runs.push({ teamId: team.id, result: "nobodyMissing" });
        continue;
      }

      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reminderText(team.name, missing, `${appUrl}/attendance`) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      runs.push({ teamId: team.id, result: "sent" });
    } catch (error) {
      console.error(`Failed to send the attendance reminder of team ${team.id}`, error);
      await prisma.team.update({ where: { id: team.id }, data: { reminderSentOn: previous } })
        .catch(releaseError => console.error(`Failed to release the reminder of team ${team.id}`, releaseError));
      runs.push({ teamId: team.id, result: "failed" });
    }
  }

  return runs;
}
