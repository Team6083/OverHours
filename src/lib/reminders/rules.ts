import "server-only";
import { createTranslator } from "next-intl";

import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";
import { isoWeekday, shortDate } from "../attendance";
import type { TeamTreeEntry } from "../data/team-dto";
import prisma from "../prisma";
import { membersMissing, MissingMember, requiredDates, RuleCondition } from "../team-reminders";
import { getTeamDescendants } from "../team-tree";

/** What a rule wants said, independent of the channel that says it. */
export type ReminderMessage = {
  title: string;
  heading: string;
  recipients: { email: string; detail: string }[];
  footer: string;
};

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
      return {
        title: context.team.name,
        heading: t("heading"),
        recipients: missing.map(member => ({ email: member.email, detail: member.dates.map(day).join(", ") })),
        footer: t("footer", { url: `${context.appUrl}/attendance` }),
      };
    }
  }
}
