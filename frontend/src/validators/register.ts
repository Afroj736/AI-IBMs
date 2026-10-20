import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[0-9]/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");

export const registerSchema = z
  .object({
    business_name: z.string().min(2, "Business name is required"),
    owner_name: z.string().min(2, "Owner name is required"),
    mobile: z
      .string()
      .min(10, "Mobile number is required")
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile number"),
    email: z.string().min(1, "Email is required").email("Enter a valid email address"),
    gst_number: z.string().optional(),
    address: z.string().optional(),
    password: passwordSchema,
    confirm_password: z.string().min(1, "Please confirm your password"),
    accept_terms: z.boolean().refine((val) => val === true, {
      message: "You must accept the terms and conditions"
    })
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"]
  });

export type RegisterFormValues = z.infer<typeof registerSchema>;

export interface RegisterRequestPayload {
  name: string;
  business_name: string;
  owner_name: string;
  mobile: string;
  email: string;
  gst_number: string;
  address: string;
  password: string;
}

export function toRegisterPayload(values: RegisterFormValues): RegisterRequestPayload {
  const ownerName = values.owner_name.trim();
  return {
    name: ownerName,
    business_name: values.business_name.trim(),
    owner_name: ownerName,
    mobile: values.mobile.trim(),
    email: values.email.trim(),
    gst_number: values.gst_number?.trim() ?? "",
    address: values.address?.trim() ?? "",
    password: values.password
  };
}

export type PasswordStrength = "weak" | "medium" | "strong";

export interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Minimum 8 characters", test: (p) => p.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "One lowercase letter", test: (p) => /[a-z]/.test(p) },
  { id: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
  { id: "special", label: "One special character", test: (p) => /[^A-Za-z0-9]/.test(p) }
];

export function getPasswordStrength(password: string): PasswordStrength {
  const passed = PASSWORD_RULES.filter((rule) => rule.test(password)).length;
  if (passed <= 2) return "weak";
  if (passed <= 4) return "medium";
  return "strong";
}
