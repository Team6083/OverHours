"use server";

import { z } from 'zod';

import { signIn } from "@/auth"

const SignupFormSchema = z.object({
    email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
    password: z.string().min(1, { message: 'Please enter a password.' }).trim(),
});

export type FormState =
    | {
        errors?: {
            email?: string[]
            password?: string[]
        }
        message?: string
    }
    | undefined

export async function signin(state: FormState, formData: FormData): Promise<FormState> {
    const validatedFields = SignupFormSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
    })


    if (!validatedFields.success) {
        return {
            errors: validatedFields.error.flatten().fieldErrors,
        }
    }

    await signIn('credentials', formData);
}
