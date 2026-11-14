import "server-only";

import { calendarDateInZone } from "../attendance";
import { getTimeZone } from "../config";
import { objectIdSchema } from "../objectid";
import prisma from "../prisma";
import { canDeliver, claimRun, deliver, finishRun, releaseRun } from "../reminders/delivery";
import { evaluateRule, findUnanswered } from "../reminders/rules";
import {
  isReminderDue, parseRuleChannel, parseRuleCondition, ReminderSettings, reminderSettingsSchema, slackWebhookTargetSchema,
} from "../team-reminders";
import { toWallTime } from "../zoned-time";
import { getTeamTree, requireAdmin, TeamError } from "./team-dto";

export type TeamReminderDTO = {
  team: { id: string; name: string };
  settings: ReminderSettings;
  hasWebhook: boolean;
  /** Who would be reminded if it went out now. */
  missing: { name: string; dates: string[] }[];
};

const DEFAULT_SETTINGS: ReminderSettings = { enabled: false, weekdays: [], daysAhead: 7, time: "20:00" };

function assertValidId(id: string) {
  if (!objectIdSchema.safeParse(id).success) throw new TeamError("Invalid team id.");
}

/** The team's rule the admin page edits: its first "unanswered" rule through Slack. */
const findTeamRule = (teamId: string) => prisma.reminderRule.findFirst({
  where: { teamId, kind: "unanswered", channel: "slack-webhook" },
  orderBy: { createdAt: "asc" },
});

export async function getTeamReminder(teamId: string): Promise<TeamReminderDTO | null> {
  await requireAdmin();
  assertValidId(teamId);

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { id: true, name: true } });
  if (!team) return null;

  const rule = await findTeamRule(teamId);
  let settings = DEFAULT_SETTINGS;
  let hasWebhook = false;
  // A rule saved with values that no longer parse shows as unset rather than breaking the page; saving replaces it.
  if (rule) {
    try {
      const condition = parseRuleCondition(rule);
      if (condition.kind === "unanswered") settings = { ...condition.config, enabled: rule.enabled, time: rule.sendTime };
    } catch (error) {
      console.error(`Reminder rule ${rule.id} has an invalid config`, error);
    }
    try {
      hasWebhook = canDeliver(parseRuleChannel(rule));
    } catch (error) {
      console.error(`Reminder rule ${rule.id} has an invalid target`, error);
    }
  }

  const today = calendarDateInZone(new Date(), getTimeZone());
  const missing = await findUnanswered(await getTeamTree(), team.id, settings, today);

  return { team: { id: team.id, name: team.name }, settings, hasWebhook, missing: missing.map(member => ({ name: member.name, dates: member.dates })) };
}

export async function saveTeamReminder(teamId: string, input: unknown): Promise<void> {
  await requireAdmin();
  assertValidId(teamId);

  const parsed = reminderSettingsSchema.safeParse(input);
  if (!parsed.success) throw new TeamError("Invalid reminder settings.");
  const { enabled, time, weekdays, daysAhead } = parsed.data;
  const data = { enabled, sendTime: time, config: { weekdays, daysAhead } };

  const rule = await findTeamRule(teamId);
  if (rule) {
    await prisma.reminderRule.update({ where: { id: rule.id }, data });
  } else {
    await prisma.reminderRule.create({ data: { ...data, teamId, kind: "unanswered", channel: "slack-webhook", target: {} } });
  }
}

/** Null removes it. */
export async function setTeamReminderWebhook(teamId: string, url: string | null): Promise<void> {
  await requireAdmin();
  assertValidId(teamId);

  const value = url?.trim() || undefined;
  if (value) {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new TeamError("The webhook must be a URL.");
    }
    if (parsed.protocol !== "https:") throw new TeamError("The webhook must use https.");
  }
  const target = slackWebhookTargetSchema.parse(value ? { url: value } : {});

  const rule = await findTeamRule(teamId);
  if (rule) {
    await prisma.reminderRule.update({ where: { id: rule.id }, data: { target } });
  } else {
    await prisma.reminderRule.create({
      data: {
        teamId, enabled: DEFAULT_SETTINGS.enabled, kind: "unanswered", sendTime: DEFAULT_SETTINGS.time, channel: "slack-webhook", target,
        config: { weekdays: DEFAULT_SETTINGS.weekdays, daysAhead: DEFAULT_SETTINGS.daysAhead },
      },
    });
  }
}

export type ReminderRun = { ruleId: string; teamId: string; result: "sent" | "nobodyMissing" | "noWebhook" | "failed" };

/**
 * For the scheduler: sends each enabled rule that is due at `now` (once a day, after its time). A run is claimed
 * before sending so overlapping calls don't send twice; any failure after the claim releases it, so the next call
 * retries. A rule that can't send yet (no webhook) isn't claimed, so adding one later the same day still sends. A rule
 * failing doesn't stop the others.
 */
export async function sendDueReminders(now: Date, appUrl: string): Promise<ReminderRun[]> {
  const timeZone = getTimeZone();
  const wall = toWallTime(now, timeZone);
  const date = calendarDateInZone(now, timeZone);
  const time = `${String(wall.hour).padStart(2, "0")}:${String(wall.minute).padStart(2, "0")}`;

  const rules = await prisma.reminderRule.findMany({ where: { enabled: true }, orderBy: { createdAt: "asc" } });
  const due = rules.filter(rule => isReminderDue(rule, time));
  if (due.length === 0) return [];

  const tree = await getTeamTree();
  const teams = new Map(tree.map(team => [team.id, team]));
  const runs: ReminderRun[] = [];

  for (const rule of due) {
    const run = (result: ReminderRun["result"]) => runs.push({ ruleId: rule.id, teamId: rule.teamId, result });
    const team = teams.get(rule.teamId);
    if (!team) continue;

    let condition, channel;
    try {
      condition = parseRuleCondition(rule);
      channel = parseRuleChannel(rule);
    } catch (error) {
      console.error(`Reminder rule ${rule.id} has an unknown or invalid kind, config, channel or target`, error);
      run("failed");
      continue;
    }

    if (!canDeliver(channel)) {
      run("noWebhook");
      continue;
    }

    try {
      if (!await claimRun(rule.id, date)) continue;
    } catch (error) {
      console.error(`Failed to claim reminder rule ${rule.id}`, error);
      run("failed");
      continue;
    }

    let result: "sent" | "nobodyMissing";
    try {
      const message = await evaluateRule(condition, { team, tree, date, appUrl });
      if (message) await deliver(channel, message);
      result = message ? "sent" : "nobodyMissing";
    } catch (error) {
      console.error(`Failed to send reminder rule ${rule.id}`, error);
      await releaseRun(rule.id, date)
        .catch(releaseError => console.error(`Failed to release reminder rule ${rule.id}`, releaseError));
      run("failed");
      continue;
    }

    // Already sent, so a failure to record it keeps the claim rather than sending twice.
    await finishRun(rule.id, date, result)
      .catch(error => console.error(`Failed to record reminder rule ${rule.id}`, error));
    run(result);
  }

  return runs;
}
