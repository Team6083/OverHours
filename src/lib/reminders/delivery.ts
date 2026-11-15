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

/** Longer than a run can take: a run still `claimed` after this was abandoned (the process died mid-run). */
export const STALE_CLAIM_MS = 10 * 60 * 1000;

/**
 * Claims a rule's run by inserting its delivery row. True when this call owns the run; false when another call
 * already has it (the unique index on rule and run key) or it already finished. A run left `claimed` for longer than
 * `STALE_CLAIM_MS` is taken over, in one conditional write so only one call gets it.
 */
export async function claimRun(ruleId: string, runKey: string, now = new Date()): Promise<boolean> {
  try {
    await prisma.reminderDelivery.create({ data: { ruleId, runKey, result: "claimed", sentAt: now } });
    return true;
  } catch (error) {
    if ((error as { code?: unknown })?.code !== "P2002") throw error;
  }

  const { count } = await prisma.reminderDelivery.updateMany({
    where: { ruleId, runKey, result: "claimed", sentAt: { lt: new Date(now.getTime() - STALE_CLAIM_MS) } },
    data: { sentAt: now },
  });
  if (count > 0) console.warn(`Took over reminder rule ${ruleId}'s run ${runKey}, abandoned while claimed`);
  return count > 0;
}

export const finishRun = (ruleId: string, runKey: string, result: "sent" | "nobodyMissing") =>
  prisma.reminderDelivery.update({ where: { ruleId_runKey: { ruleId, runKey } }, data: { result } });

/** Gives a failed run back, so the next call retries it. */
export const releaseRun = (ruleId: string, runKey: string) =>
  prisma.reminderDelivery.deleteMany({ where: { ruleId, runKey } });

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
  const bullets = message.groups.flatMap(group =>
    Array.from({ length: Math.ceil(group.members.length / MEMBERS_PER_BULLET) }, (_, i) =>
      bullet(group.days, group.members.slice(i * MEMBERS_PER_BULLET, (i + 1) * MEMBERS_PER_BULLET), mention)));

  const parts: object[][] = [[]];
  let size = 0;
  for (const item of bullets) {
    const itemSize = JSON.stringify(item).length;
    if (parts[parts.length - 1].length > 0 && size + itemSize > MESSAGE_LIST_BUDGET) {
      parts.push([]);
      size = 0;
    }
    parts[parts.length - 1].push(item);
    size += itemSize;
  }

  const title = escapeSlack(message.title);
  const link = { type: "context", elements: [{ type: "mrkdwn", text: `<${message.link.url}|${escapeSlack(message.link.label)}>` }] };
  return parts.map((part, i) => {
    const first = i === 0;
    const last = i === parts.length - 1;
    const page = parts.length > 1 ? ` (${i + 1}/${parts.length})` : "";
    const blocks: object[] = [
      ...(first ? [
        { type: "header", text: { type: "plain_text", text: clip(message.title, HEADER_MAX) } },
        { type: "section", text: { type: "plain_text", text: message.summary } },
        { type: "divider" },
      ] : []),
      list(part),
      ...(last ? [link] : []),
    ];
    return { text: first ? `*${title}*: ${escapeSlack(message.summary)}${page}` : `*${title}*${page}`, blocks };
  });
}

/**
 * Sends the message through the rule's channel; throws when any part doesn't go through, so the run is released and
 * the next call sends it again.
 */
export async function deliver(channel: RuleChannel, message: ReminderMessage): Promise<void> {
  switch (channel.channel) {
    case "slack-webhook": {
      for (const payload of slackPayloads(message)) {
        const response = await fetch(channel.target.url!, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10_000),
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
      }
      return;
    }
  }
}
