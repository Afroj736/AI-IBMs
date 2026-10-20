import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  remember_me: z.boolean().optional()
});

export type LoginFormValues = z.infer<typeof loginSchema>;

export interface LoginRequestPayload {
  email: string;
  password: string;
}
