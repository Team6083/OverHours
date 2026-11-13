// Pure rules for the daily fill-in reminder of a team. Kept free of Prisma / Auth.js so it is easy to test.

import * as z from "zod";

import { addDays, isoWeekday } from "./attendance";

export const MAX_DAYS_AHEAD = 28;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const reminderSettingsSchema = z.object({
  enabled: z.boolean(),
  weekdays: z.array(z.number().int().min(1).max(7)).max(7).transform(days => [...new Set(days)].sort()),
  daysAhead: z.number().int().min(1).max(MAX_DAYS_AHEAD),
  time: z.string().regex(TIME_PATTERN),
});

export type ReminderSettings = z.output<typeof reminderSettingsSchema>;

/** The days members have to have answered: from tomorrow, the next `daysAhead` days that fall on `weekdays`. */
export function requiredDates(today: string, weekdays: number[], daysAhead: number): string[] {
  return Array.from({ length: daysAhead }, (_, i) => addDays(today, i + 1))
    .filter(date => weekdays.includes(isoWeekday(date)));
}

/** Whether today's reminder should go out at `now` (wall time in `TZ`): on, past its time, not handled today. */
export function isReminderDue(
  team: { reminderEnabled: boolean; reminderTime: string; reminderSentOn: string | null },
  now: { date: string; time: string },
): boolean {
  return team.reminderEnabled && TIME_PATTERN.test(team.reminderTime) && team.reminderTime <= now.time
    && team.reminderSentOn !== now.date;
}

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
