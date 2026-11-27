import "server-only";
import { createTranslator } from "next-intl";

import en from "../../../messages/en.json";
import zhTW from "../../../messages/zh-TW.json";
import { isoWeekday, shortDate } from "../attendance";
import type { TeamTreeEntry } from "../data/team-dto";
import prisma from "../prisma";
import { membersMissing, MissingMember, requiredDates, RuleCondition } from "../team-reminders";
import { getTeamAncestors, getTeamDescendants } from "../team-tree";

/** What a rule wants said, independent of the channel that says it. Already translated; not escaped. */
export type ReminderMessage = {
  title: string;
  /** One line, e.g. "12 members haven't filled in 11/15–11/21". */
  summary: string;
  /**
   * Every missing member, grouped by the days they are missing ("11/15–11/21 (7 days)"), most days first. `email`
   * is for the channel to tag them with, when it does.
   */
  groups: { days: string; members: { email: string; name: string }[] }[];
  link: { label: string; url: string };
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
  tree: TeamTreeEntry[], teamId: string, config: { weekdays: number[]; daysAhead: number; exemptTeamIds?: string[] }, on: string,
): Promise<MissingMember[]> {
  const required = requiredDates(on, config.weekdays, config.daysAhead);
  if (required.length === 0) return [];

  // The team itself and its ancestors can't be exempt: the page offers no button for them, so a stale one would stay hidden.
  const ignored = new Set([teamId, ...getTeamAncestors(tree, teamId).map(team => team.id)]);
  const exempt = new Set((config.exemptTeamIds ?? []).filter(id => !ignored.has(id))
    .flatMap(id => [id, ...getTeamDescendants(tree, id).map(team => team.id)]));
  const members = (await prisma.user.findMany({
    where: { teamIds: { hasSome: [teamId, ...getTeamDescendants(tree, teamId).map(team => team.id)] } },
    select: { id: true, email: true, name: true, teamIds: true },
    orderBy: { name: "asc" },
  })).filter(member => !member.teamIds.some(id => exempt.has(id)));
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

      // Members with the same count and span share a line, so the message grows with the cases, not the members.
      const groups = new Map<string, { count: number; first: string; days: string; members: { email: string; name: string }[] }>();
      for (const member of missing) {
        const dates = [...member.dates].sort();
        const key = `${dates.length} ${dates[0]} ${dates[dates.length - 1]}`;
        const days = dates.length === 1 ? day(dates[0]) : t("days", { count: dates.length, span: span(dates) });
        const group = groups.get(key) ?? { count: dates.length, first: dates[0], days, members: [] };
        group.members.push({ email: member.email, name: member.name });
        groups.set(key, group);
      }

      return {
        title: context.team.name,
        summary: t("summary", { count: missing.length, span: span(missing.flatMap(member => member.dates)) }),
        groups: [...groups.values()]
          .sort((a, b) => b.count - a.count || a.first.localeCompare(b.first))
          .map(group => ({ days: group.days, members: group.members })),
        link: { label: t("link"), url: `${context.appUrl}/attendance` },
      };
    }
  }
}
