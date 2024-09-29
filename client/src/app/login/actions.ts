'use server';

import { signIn } from '@/auth';
import { signInSchema } from '@/app/lib/zod';
import { redirect } from 'next/navigation';

export type FormState =
  | {
    errors?: {
      email?: string[]
      password?: string[]
    }
    message?: string
  }
  | undefined;

// eslint-disable-next-line consistent-return
export async function signin(state: FormState, formData: FormData): Promise<FormState> {
  const validatedFields = signInSchema.safeParse({
    email: formData.get('email'),
    password: formData.get('password'),
  });

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await signIn('credentials', { ...validatedFields.data, redirect: false });
  } catch (error) {
    console.error(error);

    return {
      message: 'Wrong email or password',
    };
  }

  redirect('/');
}
