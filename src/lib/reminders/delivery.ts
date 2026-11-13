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

/** Slack text: the title in bold, then each recipient tagged by email (resolved by overlooking-bot). */
export const slackText = (message: ReminderMessage): string => [
  `*${escapeSlack(message.title)}*`,
  message.heading,
  ...message.recipients.map(recipient => `• <@${recipient.email}> ${recipient.detail}`),
  message.footer,
].join("\n");

/** Sends the message through the rule's channel; throws when it doesn't go through. */
export async function deliver(channel: RuleChannel, message: ReminderMessage): Promise<void> {
  switch (channel.channel) {
    case "slack-webhook": {
      const response = await fetch(channel.target.url!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: slackText(message) }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return;
    }
  }
}
