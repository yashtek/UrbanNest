import crypto from "node:crypto";
import { getDB } from "../db/db";
import { AppError } from "../middleware/error.middleware";

const config = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith("<")) throw new AppError(`Configure ${name} for signup OTP`, 503);
  return value;
};
const requests = () => getDB().collection("otp_requests");
const scope = (phoneNumber: string) => ({ phoneNumber, purpose: "signup" });
const invalid = () => new AppError("Invalid or expired OTP. Request a new OTP if needed.", 400);

// Shared MongoDB lease serializes sends/verifications across server instances.
async function locked<T>(phoneNumber: string, work: () => Promise<T>): Promise<T> {
  const locks = getDB().collection<{ _id: string; until: Date; owner: string }>("signup_otp_locks");
  const owner = crypto.randomUUID();
  try {
    const lock = await locks.findOneAndUpdate({ _id: phoneNumber, until: { $lte: new Date() } },
      { $set: { until: new Date(Date.now() + 60_000), owner } }, { upsert: true, returnDocument: "after" });
    if (!lock) throw new AppError("OTP request in progress. Please wait.", 429);
  } catch (error: any) {
    if (error?.code === 11000) throw new AppError("OTP request in progress. Please wait.", 429);
    throw error;
  }
  try { return await work(); }
  finally { await locks.updateOne({ _id: phoneNumber, owner }, { $set: { until: new Date(0) } }); }
}

// Direct SendOTP API using only the account authkey; no template override.
export async function sendOtpRequest(action: "send" | "verify", phoneNumber: string, otp?: string) {
  const authkey = config("MSG91_AUTH_KEY");
  const url = new URL(action === "send" ? "https://control.msg91.com/api/v5/otp" : "https://control.msg91.com/api/v5/otp/verify");
  url.searchParams.set("mobile", phoneNumber.slice(1));
  if (action === "send") {
    url.searchParams.set("otp_expiry", "5");
  } else url.searchParams.set("otp", otp!);
  let response: Response;
  try {
    response = await fetch(url, {
      method: action === "send" ? "POST" : "GET", headers: { "Content-Type": "application/json", authkey },
      ...(action === "send" ? { body: "{}" } : {}),
      signal: AbortSignal.timeout(10_000), redirect: "error",
    });
  } catch { throw new AppError("MSG91 is unavailable. Please try again later.", 503); }
  if (response.status === 429) throw new AppError("MSG91 rate limit reached. Try again later.", 429);
  if (response.status >= 500) throw new AppError("MSG91 is unavailable. Please try again later.", 503);
  let data: any;
  try { data = await response.json(); } catch { throw new AppError("Unexpected MSG91 response", 502); }
  if (!response.ok || data?.type !== "success") {
    if (action === "verify") throw invalid();
    let reason = typeof data?.message === "string" ? data.message : "No rejection reason returned";
    for (const value of [authkey, phoneNumber, phoneNumber.slice(1)])
      if (value) reason = reason.split(value).join("[redacted]");
    reason = reason.replace(/[\r\n<>]/g," ").slice(0,240);
    throw new AppError(`MSG91 rejected OTP sending: ${reason}`, 502);
  }
  return data;
}

export const sendMsg91SignupOtp = (phoneNumber: string) => locked(phoneNumber, async () => {
  const current = await requests().findOne(scope(phoneNumber));
  const now = new Date();
  if (current?.verifiedAt && !current.resetUsedAt && current.expiresAt > now) throw new AppError("Phone already verified. Complete signup.", 409);
  const inWindow = current?.rateWindowStartedAt && Date.now() - current.rateWindowStartedAt.getTime() < 900_000;
  if ((inWindow && current.sendCount >= 3) || (current?.lastSentAt && Date.now() - current.lastSentAt.getTime() < 30_000))
    throw new AppError("Wait 30 seconds before resending. Maximum 3 sends per 15 minutes.", 429);
  const windowStart = inWindow ? current.rateWindowStartedAt : now;
  await requests().updateOne(scope(phoneNumber), { $set: { ...scope(phoneNumber), rateWindowStartedAt: windowStart,
    sendCount: inWindow ? current.sendCount + 1 : 1, lastSentAt: now,
    expiresAt: new Date(windowStart.getTime() + 900_000) } }, { upsert: true });
  const result = await sendOtpRequest("send", phoneNumber);
  const candidate = result.request_id ?? result.requestId ?? result.requestid ?? result.data?.requestId ?? result.message;
  // Send acceptance is not a delivery report. Keep only a plausible provider reference.
  const requestId = typeof candidate === "string" && /^[a-zA-Z0-9_-]{16,128}$/.test(candidate)
    && candidate !== process.env.MSG91_AUTH_KEY ? candidate : null;

  await requests().updateOne(scope(phoneNumber), { $set: { provider: "msg91-template", providerRequestId: requestId, deliveryStatus: "unknown", otpExpiresAt: new Date(Date.now()+300_000),
    attempts: inWindow ? (current.attempts ?? 0) : 0, updatedAt: new Date() },
    $unset: { codeHash: "", reqId: "", consumedAt: "", verifiedAt: "", resetUsedAt: "" } });
  return { status: "accepted", deliveryStatus: "unknown", requestId, resendAfter: 30, expiresIn: 300 };
});

export const verifyMsg91SignupOtp = (phoneNumber: string, input: { otp: string }) => locked(phoneNumber, async () => {
  const current = await requests().findOne(scope(phoneNumber));
  if (current?.provider !== "msg91-template" || current.consumedAt || !current.otpExpiresAt || current.otpExpiresAt <= new Date()) throw invalid();
  if (current.attempts >= 5) throw new AppError("Too many OTP attempts. Try again after 15 minutes.", 429);
  await requests().updateOne(scope(phoneNumber), { $inc: { attempts: 1 } });
  await sendOtpRequest("verify", phoneNumber, input.otp);
  const now = new Date();
  await requests().updateOne(scope(phoneNumber), { $set: { verifiedAt: now, consumedAt: now, updatedAt: now,
    expiresAt: new Date(Date.now()+600_000) }, $unset: { codeHash: "", resetUsedAt: "" } });
});
