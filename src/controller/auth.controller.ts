import { Context } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import * as auth from "../service/auth.service";
import {
  completeSignupSchema,
  loginSchema,
  phoneSchema,
  resetPasswordSchema,
  usernameQuerySchema,
  verifyOtpSchema,
} from "../validators/auth.validators";

const body = async <T>(c: Context, schema: { parse(value: unknown): T }) =>
  schema.parse(await c.req.json());
const ok = (
  c: Context,
  message: string,
  data?: unknown,
  status: 200 | 201 = 200,
) =>
  c.json(
    { success: true, message, ...(data === undefined ? {} : { data }) },
    status,
  );

export const sendSignupOtp = async (c: Context) => {
  const { phoneNumber } = await body(c, phoneSchema);
  await auth.sendSignupOtp(phoneNumber);
  return ok(c, "OTP sent if delivery is available");
};
export const verifySignupOtp = async (c: Context) => {
  const { phoneNumber, otp } = await body(c, verifyOtpSchema);
  await auth.verifySignupOtp(phoneNumber, otp);
  return ok(c, "Phone number verified");
};
export const completeSignup = async (c: Context) =>
  ok(
    c,
    "User registered successfully",
    await auth.completeSignup(await body(c, completeSignupSchema)),
    201,
  );
export const login = async (c: Context) =>
  ok(c, "Login successful", await auth.login(await body(c, loginSchema)));
export const logout = [
  authMiddleware,
  async (c: Context) => {
    await auth.logout(c.get("user").userId);
    return ok(c, "Logged out successfully");
  },
] as const;
export const me = [
  authMiddleware,
  async (c: Context) =>
    ok(c, "Authenticated user", await auth.getUser(c.get("user").userId)),
] as const;
export const verifyToken = [
  authMiddleware,
  async (c: Context) => {
    const token = c.get("user");
    return ok(c, "Token is valid", {
      user: await auth.getUser(token.userId),
      valid: true,
      expiresAt: token.exp ? new Date(token.exp * 1000).toISOString() : null,
    });
  },
] as const;
export const checkUsername = async (c: Context) => {
  const { username } = usernameQuerySchema.parse(c.req.query());
  return ok(c, "Username availability checked", {
    username,
    available: await auth.usernameAvailable(username),
  });
};
export const sendForgotPasswordOtp = async (c: Context) => {
  const { phoneNumber } = await body(c, phoneSchema);
  await auth.sendPasswordResetOtp(phoneNumber);
  return ok(c, "If that account exists, an OTP has been sent");
};
export const verifyForgotPasswordOtp = async (c: Context) => {
  const { phoneNumber, otp } = await body(c, verifyOtpSchema);
  await auth.verifyPasswordResetOtp(phoneNumber, otp);
  return ok(c, "OTP verified. You may now reset your password.");
};
export const resetPassword = async (c: Context) => {
  const input = await body(c, resetPasswordSchema);
  await auth.resetPassword(input.phoneNumber, input.password);
  return ok(c, "Password reset successfully. Please log in again.");
};
