import crypto from "node:crypto";
import bcrypt from "bcrypt";
import { Resend } from "resend";
import { getDB } from "../db/db";
import { AppError } from "../middleware/error.middleware";

type Challenge = { _id: string; codeHash: string; expiresAt: Date; attempts: number; ready: boolean };
type Proof = { _id: string; email: string; expiresAt: Date };
const challenges = () => getDB().collection<Challenge>("signup_email_otps");
const proofs = () => getDB().collection<Proof>("signup_email_proofs");
const digest = (value: string) => crypto.createHash("sha256").update(value).digest("hex");
export const ensureEmailOtpIndexes = async () => {
  await challenges().createIndex({expiresAt:1},{expireAfterSeconds:0});
  await proofs().createIndex({expiresAt:1},{expireAfterSeconds:0});
  await getDB().collection("signup_email_limits").createIndex({expiresAt:1},{expireAfterSeconds:0});
};

export async function sendSignupEmailOtp(email: string) {
  const key = process.env.RESEND_KEY?.trim();
  if (!key) throw new AppError("Configure RESEND_KEY for signup email",503);
  const now = new Date();
  const limits = getDB().collection<{_id:string; count:number; lastSentAt:Date; expiresAt:Date}>("signup_email_limits");
  await limits.deleteOne({_id:email,expiresAt:{$lte:now}});
  try {
    const reserved = await limits.findOneAndUpdate({_id:email,count:{$lt:3},lastSentAt:{$lte:new Date(Date.now()-30_000)}},
      {$inc:{count:1},$set:{lastSentAt:now},$setOnInsert:{expiresAt:new Date(Date.now()+900_000)}},
      {upsert:true,returnDocument:"after"});
    if (!reserved) throw new AppError("Wait before resending OTP",429);
  } catch(error:any) {
    if(error?.code===11000)throw new AppError("Wait 30 seconds before resending. Maximum 3 emails per 15 minutes.",429);
    throw error;
  }
  const code = crypto.randomInt(100000,1_000_000).toString();
  const codeHash = await bcrypt.hash(code,10);
  const expiresAt = new Date(Date.now()+300_000);
  await challenges().replaceOne({_id:email},{codeHash,expiresAt,attempts:0,ready:false},{upsert:true});
  try {
    const resend = new Resend(key);
    const {data,error} = await resend.emails.send({
      from: process.env.RESEND_FROM?.trim() || "Umanage <onboarding@resend.dev>",
      to:[email], subject:"Your Umanage signup verification code",
      html:`<h2>Verify your email</h2><p>Your Umanage signup code is:</p><p style="font-size:28px;font-weight:bold;letter-spacing:4px">${code}</p><p>This code expires in 5 minutes. If you did not request it, ignore this email.</p>`,
      text:`Your Umanage signup code is ${code}. It expires in 5 minutes.`,
    });
    if(error || !data?.id) throw new AppError("Resend could not send the OTP email. Check sender configuration and try again.",502);
    const activated = await challenges().updateOne({_id:email,codeHash,expiresAt:{$gt:new Date()}},{$set:{ready:true}});
    if(!activated.modifiedCount)throw new AppError("OTP request expired or was replaced. Request a new code.",409);
    return {emailId:data.id,expiresIn:300,resendAfter:30};
  } catch(error) {
    await challenges().deleteOne({_id:email,codeHash});
    if(error instanceof AppError)throw error;
    throw new AppError("Email service unavailable. Please try again later.",503);
  }
}

export async function verifySignupEmailOtp(email: string, otp: string) {
  // Reserve each attempt atomically before comparing the hash.
  const current = await challenges().findOneAndUpdate({_id:email,ready:true,expiresAt:{$gt:new Date()},attempts:{$lt:5}},
    {$inc:{attempts:1}},{returnDocument:"after"});
  if(!current || !await bcrypt.compare(otp,current.codeHash))throw new AppError("Invalid or expired OTP (maximum 5 attempts).",400);
  const consumed = await challenges().findOneAndDelete({_id:email,codeHash:current.codeHash,ready:true,expiresAt:{$gt:new Date()}});
  if(!consumed)throw new AppError("OTP expired, replaced or already used",400);
  const verificationToken = crypto.randomBytes(32).toString("hex");
  await proofs().insertOne({_id:digest(verificationToken),email,expiresAt:new Date(Date.now()+300_000)});
  return {verificationToken,expiresIn:300};
}

export async function consumeSignupEmailProof(email: string, verificationToken: string) {
  const proof = await proofs().findOneAndDelete({_id:digest(verificationToken),email,expiresAt:{$gt:new Date()}});
  if(!proof)throw new AppError("Verify your signup email first. Verification is missing, expired or already used.",403);
}
