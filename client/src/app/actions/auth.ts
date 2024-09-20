"use server";

import axios from 'axios';
import { z } from 'zod';
import { redirect } from 'next/navigation';

import { createSession } from '@/app/lib/session';
import { AuthApi, Configuration } from '@/client';

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

    const authApi = new AuthApi(new Configuration({
        basePath: "http://localhost:8080",
    }));

    let token: string;
    try {
        const response = await authApi.authLoginPost(validatedFields.data);

        if (response.status !== 200 || !response.data.token_string) {
            return {
                message: 'An unknown error occurred.'
            };
        }

        token = response.data.token_string;
    } catch (error) {
        if (axios.isAxiosError(error)) {

            if (error.response?.status === 401) {
                const errMessage = error.response?.data?.error;

                return {
                    message: errMessage,
                }
            }
        }

        console.error(error);

        return {
            message: 'An unknown error occurred.'
        };
    }

    await createSession(token);

    redirect('/');
}
