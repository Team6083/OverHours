import { z } from 'zod';

// eslint-disable-next-line import/prefer-default-export
export const signInSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email.' }).trim(),
  password: z.string().min(1, { message: 'Please enter a password.' }).trim(),
});
