'use server';

import { APITimeLog } from '@/types';
import { revalidatePath } from 'next/cache';

export async function punchIn(userId: string, time?: Date) {
  const response = await fetch('http://localhost:8081/v1/punchIn', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      time: time?.toISOString() ?? new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      const data: { error: string } = await response.json();
      throw new Error(data.error);
    }

    console.error('Failed to punch in', response.status, response.statusText);
    throw new Error('Failed to punch in');
  }

  revalidatePath('/');

  return response.json();
}

export async function punchOut(userId: string, time?: Date) {
  const response = await fetch('http://localhost:8081/v1/punchOut', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      userId,
      time: time?.toISOString() ?? new Date().toISOString(),
    }),
  });

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      const data: { error: string } = await response.json();
      throw new Error(data.error);
    }

    console.error('Failed to punch out', response.status, response.statusText);
    throw new Error('Failed to punch out');
  }

  revalidatePath('/');

  return response.json();
}

export type GetTimeLogsOptions = {
  userId: APITimeLog['userId'];
  status: APITimeLog['status'];
};

export async function getTimeLogs(opts?: Partial<GetTimeLogsOptions>): Promise<APITimeLog[]> {
  const url = new URL('timeLogs', 'http://localhost:8081/v1/');

  if (opts?.status) {
    url.searchParams.set('status', opts.status);
  } else if (opts?.userId) {
    url.searchParams.set('userId', opts.userId);
  }

  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      const data: { error: string } = await response.json();
      throw new Error(data.error);
    }

    console.error('Failed to fetch time logs', response.status, response.statusText);
    throw new Error('Failed to fetch time logs');
  }

  return (await response.json()).logs;
}
