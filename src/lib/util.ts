import { ComponentProps, JSX, JSXElementConstructor } from "react";

export function formatDuration(durationSec: number): string {
  const days = Math.floor(durationSec / 86400);
  const hours = Math.floor((durationSec % 86400) / 3600);
  const minutes = Math.floor((durationSec % 3600) / 60);
  const seconds = durationSec % 60;

  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);

  return parts.join(' ');
}

export function maskName(name: string): string {
  if (!name) return "";

  const length = name.length;

  if (length <= 1) {
    return "*"; // 太短就全遮
  } else if (length === 2) {
    return name[0] + "*";
  } else {
    return name[0] + "*".repeat(length - 2) + name[length - 1];
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ComponentPropsWithoutChildren<T extends keyof JSX.IntrinsicElements | JSXElementConstructor<any>>
  = Omit<ComponentProps<T>, 'children'>;
