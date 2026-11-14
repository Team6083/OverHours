import "server-only";
import { createTranslator } from "next-intl";

import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";
import { isoWeekday, shortDate } from "../attendance";
import type { TeamTreeEntry } from "../data/team-dto";
import prisma from "../prisma";
import { membersMissing, MissingMember, requiredDates, RuleCondition } from "../team-reminders";
import { getTeamDescendants } from "../team-tree";

/** What a rule wants said, independent of the channel that says it. Already translated; not escaped. */
export type ReminderMessage = {
  title: string;
  /** One line, e.g. "12 members haven't filled in 11/15–11/21". */
  summary: string;
  /** At most `MAX_LISTED`. `email` is for tagging once the channel can resolve it. */
  recipients: { email: string; name: string; detail: string }[];
  /** "and 4 more" when the list was cut, otherwise null. */
  more: string | null;
  link: { label: string; url: string };
};

/** Members listed by name in one message; the rest are counted, so the message stays short. */
export const MAX_LISTED = 15;

export type RuleContext = { team: { id: string; name: string }; tree: TeamTreeEntry[]; date: string; appUrl: string };

const LOCALES = { en, "zh-TW": zhTW } as const;

/** In `REMINDER_LOCALE` (`en` or `zh-TW`, default `en`). */
function translator() {
  const locale = process.env.REMINDER_LOCALE === "zh-TW" ? "zh-TW" : "en";
  return createTranslator({ locale, messages: LOCALES[locale], namespace: "TeamReminder" });
}

/** Members of the team and of its sub-teams at any depth who haven't answered a required day. */
export async function findUnanswered(
  tree: TeamTreeEntry[], teamId: string, config: { weekdays: number[]; daysAhead: number }, on: string,
): Promise<MissingMember[]> {
  const required = requiredDates(on, config.weekdays, config.daysAhead);
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

/** The message a rule's condition produces on `context.date`, or null when nobody needs reminding. */
export async function evaluateRule(condition: RuleCondition, context: RuleContext): Promise<ReminderMessage | null> {
  switch (condition.kind) {
    case "unanswered": {
      const missing = await findUnanswered(context.tree, context.team.id, condition.config, context.date);
      if (missing.length === 0) return null;

      const t = translator();
      const day = (date: string) => `${shortDate(date)} (${t(`weekday.${isoWeekday(date)}` as "weekday.1")})`;
      const span = (dates: string[]) => {
        const sorted = [...new Set(dates)].sort();
        return sorted.length === 1 ? day(sorted[0]) : `${shortDate(sorted[0])}–${shortDate(sorted[sorted.length - 1])}`;
      };

      return {
        title: context.team.name,
        summary: t("summary", { count: missing.length, span: span(missing.flatMap(member => member.dates)) }),
        recipients: missing.slice(0, MAX_LISTED).map(member => ({
          email: member.email,
          name: member.name,
          detail: member.dates.length === 1 ? day(member.dates[0]) : t("days", { count: member.dates.length, span: span(member.dates) }),
        })),
        more: missing.length > MAX_LISTED ? t("more", { count: missing.length - MAX_LISTED }) : null,
        link: { label: t("link"), url: `${context.appUrl}/attendance` },
      };
    }
  }
}
