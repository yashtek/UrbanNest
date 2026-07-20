import bcrypt from "bcrypt";
import crypto from "node:crypto";
import { Collection } from "mongodb";
import { getDB } from "../db/db";
import { AppError } from "../middleware/error.middleware";

export enum OtpPurpose { SIGNUP = "signup", PASSWORD_RESET = "password_reset" }
type OtpRecord = { phoneNumber: string; purpose: OtpPurpose; codeHash: string; expiresAt: Date; attempts: number; sendCount: number; rateWindowStartedAt: Date; consumedAt?: Date; verifiedAt?: Date; resetUsedAt?: Date; updatedAt: Date };
export interface OtpProvider { sendOtp(phoneNumber: string, code: string, purpose: OtpPurpose): Promise<void>; }
class DevelopmentOtpProvider implements OtpProvider { async sendOtp(phoneNumber: string, code: string, purpose: OtpPurpose) { console.info(`[DEV OTP] ${purpose} for ${phoneNumber}: ${code}`); } }
const records = (): Collection<OtpRecord> => getDB().collection<OtpRecord>("otp_requests");
const provider: OtpProvider = new DevelopmentOtpProvider(); // Replace via DI/config for Firebase, Twilio, or MSG91.
const TTL_MS = 5 * 60_000, WINDOW_MS = 15 * 60_000, MAX_SENDS = 3, MAX_ATTEMPTS = 5, VERIFIED_TTL_MS = 10 * 60_000;
const record = (phoneNumber: string, purpose: OtpPurpose) => records().findOne({ phoneNumber, purpose });

export const ensureOtpIndexes = () => records().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export const otpService = {
  async send(phoneNumber: string, purpose: OtpPurpose) {
    const current = await record(phoneNumber, purpose); const time = new Date();
    const inWindow = current && time.getTime() - current.rateWindowStartedAt.getTime() < WINDOW_MS;
    if (current?.verifiedAt && !current.resetUsedAt) throw new AppError("OTP has already been verified", 409);
    if (inWindow && current!.sendCount >= MAX_SENDS) throw new AppError("Too many OTP requests. Try again later.", 429);
    const code = crypto.randomInt(100000, 1_000_000).toString();
    await records().updateOne(
      { phoneNumber, purpose },
      { $set: { codeHash: await bcrypt.hash(code, 10), expiresAt: new Date(Date.now() + TTL_MS), attempts: 0, sendCount: inWindow ? current!.sendCount + 1 : 1, updatedAt: time, rateWindowStartedAt: inWindow ? current!.rateWindowStartedAt : time }, $unset: { consumedAt: "", verifiedAt: "", resetUsedAt: "" }, $setOnInsert: { phoneNumber, purpose } },
      { upsert: true },
    );
    await provider.sendOtp(phoneNumber, code, purpose);
  },
  async verify(phoneNumber: string, purpose: OtpPurpose, code: string) {
    const current = await record(phoneNumber, purpose);
    if (!current || current.expiresAt <= new Date() || current.consumedAt || current.attempts >= MAX_ATTEMPTS || !await bcrypt.compare(code, current.codeHash)) {
      if (current && !current.consumedAt) await records().updateOne({ phoneNumber, purpose }, { $inc: { attempts: 1 }, $set: { updatedAt: new Date() } });
      throw new AppError("Invalid or expired OTP", 400);
    }
    const result = await records().updateOne({ phoneNumber, purpose, codeHash: current.codeHash, consumedAt: { $exists: false } }, { $set: { consumedAt: new Date(), verifiedAt: new Date(), updatedAt: new Date() } });
    if (!result.modifiedCount) throw new AppError("Invalid or expired OTP", 400);
  },
  async requireVerified(phoneNumber: string, purpose: OtpPurpose) {
    const current = await record(phoneNumber, purpose);
    if (!current?.verifiedAt || current.resetUsedAt || Date.now() - current.verifiedAt.getTime() > VERIFIED_TTL_MS) throw new AppError("Phone verification is required or has expired", 403);
  },
  async consumeVerified(phoneNumber: string, purpose: OtpPurpose) { await records().updateOne({ phoneNumber, purpose }, { $set: { resetUsedAt: new Date(), updatedAt: new Date() } }); },
};
