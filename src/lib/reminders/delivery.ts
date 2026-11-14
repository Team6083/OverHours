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

/**
 * Claims a rule's run by inserting its delivery row. True when this call owns the run; false when another call
 * already has it (the unique index on rule and run key).
 */
export async function claimRun(ruleId: string, runKey: string): Promise<boolean> {
  try {
    await prisma.reminderDelivery.create({ data: { ruleId, runKey, result: "claimed" } });
    return true;
  } catch (error) {
    if ((error as { code?: unknown })?.code === "P2002") return false;
    throw error;
  }
}

export const finishRun = (ruleId: string, runKey: string, result: "sent" | "nobodyMissing") =>
  prisma.reminderDelivery.update({ where: { ruleId_runKey: { ruleId, runKey } }, data: { result } });

/** Gives a failed run back, so the next call retries it. */
export const releaseRun = (ruleId: string, runKey: string) =>
  prisma.reminderDelivery.deleteMany({ where: { ruleId, runKey } });

/** `&`, `<` and `>` are control characters in Slack text; `<!channel>` in a name would ping everyone. */
const escapeSlack = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const HEADER_MAX = 150;
const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/**
 * Slack Block Kit payload: the team as a header, the summary, then a bulleted list of members and their days, and
 * the link. `text` is the notification fallback. Members are listed by name: overlooking-bot doesn't turn emails
 * into Slack users yet, which a `user` element needs. The list is capped by the rule, so the size stays bounded.
 */
export function slackPayload(message: ReminderMessage) {
  const blocks: object[] = [
    { type: "header", text: { type: "plain_text", text: clip(message.title, HEADER_MAX) } },
    { type: "section", text: { type: "plain_text", text: message.summary } },
    { type: "divider" },
    {
      type: "rich_text",
      elements: [{
        type: "rich_text_list",
        style: "bullet",
        elements: message.recipients.map(recipient => ({
          type: "rich_text_section",
          elements: [
            { type: "text", text: recipient.name, style: { bold: true } },
            { type: "text", text: `  ${recipient.detail}` },
          ],
        })),
      }],
    },
  ];
  if (message.more) blocks.push({ type: "context", elements: [{ type: "plain_text", text: message.more }] });
  blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `<${message.link.url}|${escapeSlack(message.link.label)}>` }] });

  return { text: `*${escapeSlack(message.title)}*: ${escapeSlack(message.summary)}`, blocks };
}

/** Sends the message through the rule's channel; throws when it doesn't go through. */
export async function deliver(channel: RuleChannel, message: ReminderMessage): Promise<void> {
  switch (channel.channel) {
    case "slack-webhook": {
      const response = await fetch(channel.target.url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(slackPayload(message)),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return;
    }
  }
}
