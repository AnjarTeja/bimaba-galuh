import { z } from "zod";

export const LoginSchema = z.object({
  email: z.email().max(191),
  password: z.string().min(1).max(1024),
});

export const ForgotPasswordSchema = z.object({
  email: z.email().max(191),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(32).max(512),
  new_password: z.string().min(12).max(128),
});
