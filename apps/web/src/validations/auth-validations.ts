import { z } from 'zod';
import {
  emailValidation,
  passwordValidation,
  nameValidation,
  workspaceNameValidation,
  termsValidation,
} from './validation-utils';

export const loginSchema = z.object({
  email: emailValidation,
  password: passwordValidation,
});

export type LoginForm = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    name: nameValidation,
    email: emailValidation,
    password: passwordValidation,
    confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
    workspaceName: workspaceNameValidation,
    agreeToTerms: termsValidation,
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export type RegisterForm = z.infer<typeof registerSchema>;
