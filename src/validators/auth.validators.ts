import { z } from "zod";

const phone = z
  .string()
  .trim()
  .regex(
    /^\+[1-9]\d{7,14}$/,
    "Phone number must be in E.164 format (for example +919876543210)",
  );
const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[a-z]/, "Password must contain a lowercase letter")
  .regex(/[A-Z]/, "Password must contain an uppercase letter")
  .regex(/\d/, "Password must contain a number")
  .regex(/[^A-Za-z0-9]/, "Password must contain a special character");
const otp = z.string().regex(/^\d{6}$/, "OTP must be a 6-digit code");

export const phoneSchema = z.object({ phoneNumber: phone });
export const verifyOtpSchema = z.object({ phoneNumber: phone, otp });
export const completeSignupSchema = z.object({
  phoneNumber: phone,
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(100),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("Invalid email address")
    .optional(),
  username: z
    .string()
    .trim()
    .min(5, "Username must be at least 5 characters")
    .max(30)
    .regex(
      /^[A-Za-z0-9_]+$/,
      "Username may contain only letters, numbers, and underscores",
    ),
  password,
});
export const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});
export const resetPasswordSchema = z.object({ phoneNumber: phone, password });
export const usernameQuerySchema = z.object({
  username: z
    .string()
    .trim()
    .min(5)
    .max(30)
    .regex(/^[A-Za-z0-9_]+$/),
});
