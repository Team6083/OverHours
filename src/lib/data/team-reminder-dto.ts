import "server-only";
import { createTranslator } from "next-intl";

import { auth, Role } from "@/auth";
import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";
import { calendarDateInZone } from "../attendance";
import { getTimeZone } from "../config";
import { objectIdSchema } from "../objectid";
import prisma from "../prisma";
import {
  isoWeekday, isReminderDue, membersMissing, MissingMember, ReminderSettings, reminderSettingsSchema, requiredDates,
} from "../team-reminders";
import { getTeamDescendants } from "../team-tree";
import { toWallTime } from "../zoned-time";
import { TeamError } from "./team-dto";

export type TeamReminderDTO = {
  team: { id: string; name: string };
  settings: ReminderSettings;
  hasWebhook: boolean;
  canSetWebhook: boolean;
  /** Who would be reminded if it went out now; names only, since emails are for admins. */
  missing: { name: string; dates: string[] }[];
};

const reminderSelect = {
  id: true, name: true, leaderIds: true, reminderEnabled: true, reminderWeekdays: true, reminderDaysAhead: true,
  reminderTime: true, reminderWebhookUrl: true, reminderSentOn: true,
} as const;

function today(): string {
  return calendarDateInZone(new Date(), getTimeZone());
}

/** Signed in and an admin or a leader of the team; returns whether they are an admin. */
async function requireReminderAccess(teamId: string): Promise<{ isAdmin: boolean }> {
  const session = await auth();
  if (!session?.user.id) throw new Error("Unauthorized");
  if (!objectIdSchema.safeParse(teamId).success) throw new TeamError("Invalid team id.");

  const isAdmin = session.user.role === Role.ADMIN;
  if (!isAdmin && await prisma.team.count({ where: { id: teamId, leaderIds: { has: session.user.id } } }) === 0) {
    throw new Error("Forbidden");
  }

  return { isAdmin };
}

async function requireAdmin() {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");
  if (session.user.role !== Role.ADMIN) throw new Error("Forbidden");
}

/** Members of the team and of its sub-teams at any depth. */
async function teamMembers(teamId: string) {
  const tree = await prisma.team.findMany({ select: { id: true, parentTeamId: true } });
  const ids = [teamId, ...getTeamDescendants(tree.map(t => ({ id: t.id, parentTeamId: t.parentTeamId ?? undefined })), teamId).map(t => t.id)];
  return prisma.user.findMany({
    where: { teamIds: { hasSome: ids } },
    select: { id: true, email: true, name: true },
    orderBy: { name: "asc" },
  });
}

async function findMissing(teamId: string, settings: ReminderSettings, on: string): Promise<MissingMember[]> {
  const required = requiredDates(on, settings.weekdays, settings.daysAhead);
  if (required.length === 0) return [];

  const members = await teamMembers(teamId);
  if (members.length === 0) return [];

  const answered = await prisma.attendanceEntry.findMany({
    where: { userId: { in: members.map(m => m.id) }, date: { in: required }, slot: "AllDay" },
    select: { userId: true, date: true },
  });
  return membersMissing(members, required, answered);
}

const settingsOf = (team: { reminderEnabled: boolean; reminderWeekdays: number[]; reminderDaysAhead: number; reminderTime: string }): ReminderSettings => ({
  enabled: team.reminderEnabled ?? false,
  weekdays: team.reminderWeekdays ?? [],
  daysAhead: team.reminderDaysAhead ?? 7,
  time: team.reminderTime ?? "20:00",
});

/** Whether the signed-in user can set any team's reminder, for the menu link. */
export async function canSetTeamReminders(): Promise<boolean> {
  const session = await auth();
  if (!session?.user.id) return false;
  if (session.user.role === Role.ADMIN) return true;
  return await prisma.team.count({ where: { leaderIds: { has: session.user.id } } }) > 0;
}

/** The teams the signed-in user can set reminders for: every team for admins, otherwise the ones they lead. */
export async function getMyReminderTeams(): Promise<{ id: string; name: string; enabled: boolean }[]> {
  const session = await auth();
  if (!session?.user.id) return [];

  const teams = await prisma.team.findMany({
    where: session.user.role === Role.ADMIN ? {} : { leaderIds: { has: session.user.id } },
    select: { id: true, name: true, reminderEnabled: true },
    orderBy: { name: "asc" },
  });
  return teams.map(team => ({ id: team.id, name: team.name, enabled: team.reminderEnabled ?? false }));
}

export async function getTeamReminder(teamId: string): Promise<TeamReminderDTO | null> {
  const { isAdmin } = await requireReminderAccess(teamId);

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: reminderSelect });
  if (!team) return null;

  const settings = settingsOf(team);
  const missing = await findMissing(team.id, settings, today());

  return {
    team: { id: team.id, name: team.name },
    settings,
    hasWebhook: Boolean(team.reminderWebhookUrl),
    canSetWebhook: isAdmin,
    missing: missing.map(member => ({ name: member.name, dates: member.dates })),
  };
}

export async function saveTeamReminder(teamId: string, input: unknown): Promise<void> {
  await requireReminderAccess(teamId);

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

/** Admins only, since the webhook receives member emails. Null removes it. */
export async function setTeamReminderWebhook(teamId: string, url: string | null): Promise<void> {
  await requireAdmin();
  if (!objectIdSchema.safeParse(teamId).success) throw new TeamError("Invalid team id.");

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

export async function setTeamLeaders(teamId: string, userIds: string[]): Promise<void> {
  await requireAdmin();
  if (![teamId, ...userIds].every(id => objectIdSchema.safeParse(id).success)) throw new TeamError("Invalid id.");

  await prisma.team.update({ where: { id: teamId }, data: { leaderIds: [...new Set(userIds)] } });
}

export async function getTeamLeaderIds(teamId: string): Promise<string[]> {
  await requireAdmin();
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { leaderIds: true } });
  return team?.leaderIds ?? [];
}

const LOCALES = { en, "zh-TW": zhTW } as const;

const shortDate = (date: string) => date.slice(5).replace("-", "/");

/** The Slack text for one team, in `REMINDER_LOCALE` (`en` or `zh-TW`, default `en`). */
export function reminderText(teamName: string, missing: MissingMember[], url: string): string {
  const locale = process.env.REMINDER_LOCALE === "zh-TW" ? "zh-TW" : "en";
  const t = createTranslator({ locale, messages: LOCALES[locale], namespace: "TeamReminder" });
  const day = (date: string) => `${shortDate(date)} (${t(`weekday.${isoWeekday(date)}` as "weekday.1")})`;

  return [
    t("heading", { team: teamName }),
    ...missing.map(member => `• <@${member.email}> ${member.dates.map(day).join(", ")}`),
    t("footer", { url }),
  ].join("\n");
}

export type ReminderRun = { teamId: string; result: "sent" | "nobodyMissing" | "noWebhook" | "failed" };

/**
 * For the scheduler: sends each team's reminder that is due at `now` (once a day, after its time). A team is
 * claimed before sending so overlapping calls don't send twice; a failed send is released to retry next call.
 */
export async function sendDueReminders(now: Date, appUrl: string): Promise<ReminderRun[]> {
  const timeZone = getTimeZone();
  const wall = toWallTime(now, timeZone);
  const date = calendarDateInZone(now, timeZone);
  const time = `${String(wall.hour).padStart(2, "0")}:${String(wall.minute).padStart(2, "0")}`;

  const teams = await prisma.team.findMany({ where: { reminderEnabled: true }, select: reminderSelect });
  const runs: ReminderRun[] = [];

  for (const team of teams.filter(t => isReminderDue(t, { date, time }))) {
    const previous = team.reminderSentOn;
    const claimed = await prisma.team.updateMany({
      where: { id: team.id, OR: [{ reminderSentOn: { isSet: false } }, { reminderSentOn: null }, { reminderSentOn: { not: date } }] },
      data: { reminderSentOn: date },
    });
    if (claimed.count === 0) continue;

    if (!team.reminderWebhookUrl) {
      runs.push({ teamId: team.id, result: "noWebhook" });
      continue;
    }

    const missing = await findMissing(team.id, settingsOf(team), date);
    if (missing.length === 0) {
      runs.push({ teamId: team.id, result: "nobodyMissing" });
      continue;
    }

    try {
      const response = await fetch(team.reminderWebhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: reminderText(team.name, missing, `${appUrl}/attendance`) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      runs.push({ teamId: team.id, result: "sent" });
    } catch (error) {
      console.error(`Failed to send the attendance reminder of team ${team.id}`, error);
      await prisma.team.update({ where: { id: team.id }, data: { reminderSentOn: previous } });
      runs.push({ teamId: team.id, result: "failed" });
    }
  }

  return runs;
}
