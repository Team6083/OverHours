// Pure parts of team reminders: rule and channel schemas, and the "unanswered" rule. Kept free of Prisma / Auth.js
// so it is easy to test.

import * as z from "zod";

import { addDays, isoWeekday } from "./attendance";

export const MAX_DAYS_AHEAD = 28;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** `config` of an "unanswered" rule. New fields must be optional so saved rules stay valid. */
export const unansweredConfigSchema = z.object({
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).transform(days => [...new Set(days)].sort()),
  daysAhead: z.number().int().min(1).max(MAX_DAYS_AHEAD),
});

/** A rule's condition: a new kind is a new branch here. An unknown kind fails to parse. */
const ruleConditionSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("unanswered"), config: unansweredConfigSchema }),
]);
export type RuleCondition = z.output<typeof ruleConditionSchema>;

/** `target` of a "slack-webhook" rule; the URL is unset until an admin adds it. */
export const slackWebhookTargetSchema = z.object({ url: z.url({ protocol: /^https$/ }).optional() });

/** Where a rule sends: a new channel is a new branch here. An unknown channel fails to parse. */
const ruleChannelSchema = z.discriminatedUnion("channel", [
  z.object({ channel: z.literal("slack-webhook"), target: slackWebhookTargetSchema }),
]);
export type RuleChannel = z.output<typeof ruleChannelSchema>;

/** Throws on an unknown kind or a config that doesn't fit it. */
export const parseRuleCondition = (rule: { kind: string; config: unknown }): RuleCondition =>
  ruleConditionSchema.parse({ kind: rule.kind, config: rule.config });

/** Throws on an unknown channel or a target that doesn't fit it. */
export const parseRuleChannel = (rule: { channel: string; target: unknown }): RuleChannel =>
  ruleChannelSchema.parse({ channel: rule.channel, target: rule.target });

/** What the admin page edits: the team's "unanswered" rule. */
export const reminderSettingsSchema = unansweredConfigSchema.extend({
  enabled: z.boolean(),
  time: z.string().regex(TIME_PATTERN),
});

export type ReminderSettings = z.output<typeof reminderSettingsSchema>;

/** The days members have to have answered: from tomorrow, the next `daysAhead` days that fall on `weekdays`. */
export function requiredDates(today: string, weekdays: number[], daysAhead: number): string[] {
  return Array.from({ length: daysAhead }, (_, i) => addDays(today, i + 1))
    .filter(date => weekdays.includes(isoWeekday(date)));
}

/** Whether a daily rule's time has passed at `time` (wall time in `TZ`). Whether it already went out is the delivery's job. */
export const isReminderDue = (rule: { enabled: boolean; sendTime: string }, time: string): boolean =>
  rule.enabled && TIME_PATTERN.test(rule.sendTime) && rule.sendTime <= time;

export type MissingMember = { email: string; name: string; dates: string[] };

/** Members with at least one required day they haven't answered, with those days. */
export function membersMissing(
  members: { id: string; email: string; name: string }[],
  required: string[],
  answered: { userId: string; date: string }[],
): MissingMember[] {
  const done = new Set(answered.map(entry => `${entry.userId} ${entry.date}`));

  return members
    .map(member => ({ email: member.email, name: member.name, dates: required.filter(date => !done.has(`${member.id} ${date}`)) }))
    .filter(member => member.dates.length > 0);
}
