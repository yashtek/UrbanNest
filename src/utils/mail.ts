import nodemailer from "nodemailer";
import { AppError } from "../middleware/error.middleware";

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const baseUrl = Bun.env.FRONTEND_URL;
  const host = Bun.env.SMTP_HOST;
  const from = Bun.env.SMTP_FROM;
  if (!baseUrl || !host || !from) throw new AppError("Password reset email is not configured", 503);

  const url = new URL("/reset-password", baseUrl);
  url.searchParams.set("token", resetToken);
  const transporter = nodemailer.createTransport({
    host, port: Number(Bun.env.SMTP_PORT ?? 587), secure: Bun.env.SMTP_SECURE === "true",
    auth: Bun.env.SMTP_USER ? { user: Bun.env.SMTP_USER, pass: Bun.env.SMTP_PASSWORD } : undefined,
  });
  await transporter.sendMail({ from, to: email, subject: "Reset your UrbanNest password", text: `Use this link to reset your password. It expires in 24 hours: ${url.toString()}` });
}
