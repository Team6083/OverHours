import "server-only";

import prisma from "../prisma";
import { RuleChannel } from "../team-reminders";
import type { ReminderMessage } from "./rules";

/** Whether the channel has somewhere to send yet; a rule that can't send isn't claimed. */
export function canDeliver(channel: RuleChannel): boolean {
  switch (channel.channel) {
    case "slack-webhook":
      return Boolean(channel.target.url);
  }
}

/** A failing run is tried at most this many times a day, then given up. */
export const MAX_FAILURES = 5;
/** Wait after the nth failure before the next try: 5, 10, 20, 40 minutes. */
export const retryDelayMs = (failures: number) => 5 * 60_000 * 2 ** (failures - 1);

/** Longer than a run can take: a run still `claimed` after this was abandoned (the process died mid-run). */
export const STALE_CLAIM_MS = 10 * 60 * 1000;

export type ClaimedRun = { remindedUserIds: string[]; failures: number };

/**
 * Claims a rule's run: inserts its delivery row, or takes over a failed run whose wait is over, or a run abandoned
 * while `claimed` for longer than `STALE_CLAIM_MS`. Each takeover is one conditional write, so only one call gets it.
 * An abandoned run counts as a failure, so a run that keeps dying is given up like one that keeps failing: then the
 * result is "gaveUp". Null when another call has the run, it finished or was given up, or its wait isn't over. The
 * claim says how many parts already went out and how often it failed.
 */
export async function claimRun(ruleId: string, runKey: string, now = new Date()): Promise<ClaimedRun | "gaveUp" | null> {
  try {
    await prisma.reminderDelivery.create({ data: { ruleId, runKey, result: "claimed", sentAt: now } });
    return { remindedUserIds: [], failures: 0 };
  } catch (error) {
    if ((error as { code?: unknown })?.code !== "P2002") throw error;
  }

  const key = { ruleId_runKey: { ruleId, runKey } };
  const retry = await prisma.reminderDelivery.updateMany({
    where: { ruleId, runKey, result: "failed", nextAttemptAt: { lte: now } },
    data: { result: "claimed", sentAt: now },
  });
  if (retry.count === 0) {
    const abandoned = await prisma.reminderDelivery.updateMany({
      where: { ruleId, runKey, result: "claimed", sentAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
      data: { sentAt: now, failures: { increment: 1 } },
    });
    if (abandoned.count === 0) return null;
    console.warn(`Took over reminder rule ${ruleId}'s run ${runKey}, abandoned while claimed`);
  }

  const row = await prisma.reminderDelivery.findUniqueOrThrow({ where: key });
  if (row.failures >= MAX_FAILURES) {
    await prisma.reminderDelivery.update({ where: key, data: { result: "gaveUp", nextAttemptAt: null } });
    return "gaveUp";
  }
  return { remindedUserIds: row.remindedUserIds, failures: row.failures };
}

/** Records the members whose reminder just went out, so a retry of the run leaves them out. */
export const recordReminded = (ruleId: string, runKey: string, userIds: string[]) =>
  prisma.reminderDelivery.update({ where: { ruleId_runKey: { ruleId, runKey } }, data: { remindedUserIds: { push: userIds } } });

export const finishRun = (ruleId: string, runKey: string, result: "sent" | "nobodyMissing") =>
  prisma.reminderDelivery.update({ where: { ruleId_runKey: { ruleId, runKey } }, data: { result } });

/**
 * Records a failed try: the run waits `retryDelayMs` before a later call may take it, keeping the parts already
 * sent, and after `MAX_FAILURES` it is given up for the day. Returns the result to report.
 */
export async function failRun(ruleId: string, runKey: string, claim: ClaimedRun, now = new Date()): Promise<"failed" | "gaveUp"> {
  const failures = claim.failures + 1;
  const gaveUp = failures >= MAX_FAILURES;
  await prisma.reminderDelivery.update({
    where: { ruleId_runKey: { ruleId, runKey } },
    data: gaveUp
      ? { result: "gaveUp", failures, nextAttemptAt: null }
      : { result: "failed", failures, nextAttemptAt: new Date(now.getTime() + retryDelayMs(failures)) },
  });
  return gaveUp ? "gaveUp" : "failed";
}

/** `&`, `<` and `>` are control characters in Slack text; `<!channel>` in a name would ping everyone. */
const escapeSlack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HEADER_MAX = 150;
/** Members on one bullet; a bigger group continues on the next bullet with the same days. */
export const MEMBERS_PER_BULLET = 30;
/** Rough JSON size of one message's list; past it the list goes on in another message, well inside Slack's limits. */
export const MESSAGE_LIST_BUDGET = 12_000;

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * `REMINDER_MENTION`: `on` tags members, `off` (default, and any other value) lists names and sends no email.
 * Tags are `user` elements whose `user_id` is the email, which overlooking-bot resolves to the Slack user.
 */
export const mentionsOn = () => process.env.REMINDER_MENTION === "on";

type Member = ReminderMessage["groups"][number]["members"][number];

/** One bullet: the days in bold, then the members on one line. */
function bullet(days: string, members: Member[], mention: boolean) {
  const people = mention
    ? members.flatMap((member, i) => [...(i > 0 ? [{ type: "text", text: " " }] : []), { type: "user", user_id: member.email }])
    : [{ type: "text", text: members.map(member => member.name).join(", ") }];
  return { type: "rich_text_section", elements: [{ type: "text", text: days, style: { bold: true } }, { type: "text", text: "  " }, ...people] };
}

const list = (bullets: object[]) => ({ type: "rich_text", elements: [{ type: "rich_text_list", style: "bullet", elements: bullets }] });

/**
 * Slack Block Kit payloads: the team as a header, the summary, a bulleted list with one bullet per group of members
 * missing the same days, and the link. `text` is the notification fallback. Everyone missing is listed; a list too
 * large for one message continues in the next ones, the link closing the last.
 */
export function slackPayloads(message: ReminderMessage, mention = mentionsOn()) {
  return slackParts(message, mention).map(part => part.payload);
}

/** `slackPayloads`, each with the ids of the members it lists. */
function slackParts(message: ReminderMessage, mention = mentionsOn()) {
  const bullets = message.groups.flatMap(group =>
    Array.from({ length: Math.ceil(group.members.length / MEMBERS_PER_BULLET) }, (_, i) => {
      const members = group.members.slice(i * MEMBERS_PER_BULLET, (i + 1) * MEMBERS_PER_BULLET);
      return { item: bullet(group.days, members, mention), ids: members.map(member => member.id) };
    }));

  const parts: { items: object[]; ids: string[] }[] = [{ items: [], ids: [] }];
  let size = 0;
  for (const { item, ids } of bullets) {
    const itemSize = JSON.stringify(item).length;
    if (parts[parts.length - 1].items.length > 0 && size + itemSize > MESSAGE_LIST_BUDGET) {
      parts.push({ items: [], ids: [] });
      size = 0;
    }
    parts[parts.length - 1].items.push(item);
    parts[parts.length - 1].ids.push(...ids);
    size += itemSize;
  }

  const title = escapeSlack(message.title);
  const link = { type: "context", elements: [{ type: "mrkdwn", text: `<${message.link.url}|${escapeSlack(message.link.label)}>` }] };
  return parts.map(({ items, ids }, i) => {
    const first = i === 0;
    const last = i === parts.length - 1;
    const page = parts.length > 1 ? ` (${i + 1}/${parts.length})` : "";
    const blocks: object[] = [
      ...(first ? [
        { type: "header", text: { type: "plain_text", text: clip(message.title, HEADER_MAX) } },
        { type: "section", text: { type: "plain_text", text: message.summary } },
        { type: "divider" },
      ] : []),
      list(items),
      ...(last ? [link] : []),
    ];
    return { payload: { text: first ? `*${title}*: ${escapeSlack(message.summary)}${page}` : `*${title}*${page}`, blocks }, memberIds: ids };
  });
}

/**
 * Sends the message through the rule's channel, calling `sent(ids)` with the members of each part once it is out.
 * Throws when a part doesn't go through.
 */
export async function deliver(
  channel: RuleChannel, message: ReminderMessage, sent: (memberIds: string[]) => Promise<unknown> = async () => {},
): Promise<void> {
  switch (channel.channel) {
    case "slack-webhook": {
      for (const { payload, memberIds } of slackParts(message)) {
        const response = await fetch(channel.target.url!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        await sent(memberIds);
      }
      return;
    }
  }
}
