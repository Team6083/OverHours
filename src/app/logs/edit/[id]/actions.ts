'use server';

import { z } from 'zod';
import { forbidden, redirect, unauthorized } from 'next/navigation';
import prisma from '@/db';
import { auth } from '@/auth';

export type FormState =
  | {
    errors?: {
      inTime?: string[]
      outTime?: string[]
      status?: string[]
      notes?: string[]
    }
    message?: string
  }
  | undefined;

const signInSchema = z.object({
  inTime: z.string(),
  outTime: z.string().optional(),
  status: z.enum(['CurrentlyIn', 'Done', 'Locked']),
  notes: z.string().optional(),
});

// eslint-disable-next-line consistent-return
export async function saveTimeLog(formState: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();

  if (!session) {
    unauthorized();
  }

  if (session.user?.role !== 'admin') {
    forbidden();
  }

  const validatedFields = signInSchema.safeParse({
    inTime: formData.get('inTime'),
    outTime: formData.get('outTime'),
    status: formData.get('status'),
    notes: formData.get('notes'),
  });

  const id = formData.get('id')?.toString();
  if (id === undefined) {
    return {
      message: 'ID is required',
    };
  }

  const clearOutTime = formData.get('clearOutTime')?.toString();

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { inTime, outTime } = validatedFields.data;
  const inTimeDate = new Date(Date.parse(inTime));
  const outTimeDate = outTime && clearOutTime !== 'on' ? new Date(Date.parse(outTime)) : null;

  if (Number.isNaN(inTimeDate.getTime())) {
    return {
      errors: {
        inTime: ['In time is not a valid date'],
      },
    };
  }
  if (outTime && Number.isNaN(outTimeDate?.getTime())) {
    return {
      errors: {
        outTime: ['Out time is not a valid date'],
      },
    };
  }

  // Check if outTime is before inTime
  if (outTimeDate && inTimeDate > outTimeDate) {
    return {
      errors: {
        outTime: ['Out time must be after in time'],
      },
    };
  }

  if (validatedFields.data.status === 'CurrentlyIn' && outTimeDate) {
    return {
      errors: {
        status: ['Status must not be CurrentlyIn if out time is provided'],
      },
    };
  }

  if ((validatedFields.data.status === 'Done' || validatedFields.data.status === 'Locked') && !outTimeDate) {
    return {
      errors: {
        outTime: ['Out time is required for Done or Locked status'],
      },
    };
  }

  await prisma.timeLog.update({
    where: {
      id,
    },
    data: {
      inTime: inTimeDate,
      outTime: outTimeDate,
      status: validatedFields.data.status,
      notes: validatedFields.data.notes,
    },
  });

  redirect('/logs');
}
