import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { users, type IUser } from "../modals/user.modal";
import { AppError } from "../middleware/error.middleware";
import { createAccessToken } from "../utils/token";
import { otpService, OtpPurpose } from "../otp/otp.service";

const HASH_ROUNDS = 12;
const publicUser = (user: IUser) => ({
  id: user._id.toString(),
  phoneNumber: user.phoneNumber,
  phoneVerified: user.phoneVerified,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  createdAt: user.createdAt,
});
const authResult = (user: IUser) => ({
  user: publicUser(user),
  accessToken: createAccessToken(user),
});
const normalized = (username: string) => username.toLowerCase();

// Auth service functions for OTP, signup, login, logout, and password reset.
export const sendSignupOtp = (phoneNumber: string) =>
  otpService.send(phoneNumber, OtpPurpose.SIGNUP);
// Verify the signup OTP for a phone number.
export const verifySignupOtp = (phoneNumber: string, code: string) =>
  otpService.verify(phoneNumber, OtpPurpose.SIGNUP, code);
// Send a password reset OTP only when the account exists.
export const sendPasswordResetOtp = async (phoneNumber: string) => {
  // Deliberately generic to avoid exposing whether a phone number has an account.
  if (await users().findOne({ phoneNumber }, { projection: { _id: 1 } }))
    await otpService.send(phoneNumber, OtpPurpose.PASSWORD_RESET);
};
// Verify a password reset OTP before allowing the password change.
export const verifyPasswordResetOtp = async (
  phoneNumber: string,
  code: string,
) => {
  if (!(await users().findOne({ phoneNumber }, { projection: { _id: 1 } })))
    throw new AppError("Invalid or expired OTP", 400);
  await otpService.verify(phoneNumber, OtpPurpose.PASSWORD_RESET, code);
};

// Create a new user after phone verification.
export const completeSignup = async (input: {
  phoneNumber: string;
  fullName: string;
  email?: string;
  username: string;
  password: string;
}) => {
  await otpService.requireVerified(input.phoneNumber, OtpPurpose.SIGNUP);
  const time = new Date();
  const user: IUser = {
    _id: new ObjectId(),
    phoneNumber: input.phoneNumber,
    phoneVerified: true,
    username: input.username,
    usernameNormalized: normalized(input.username),
    passwordHash: await bcrypt.hash(input.password, HASH_ROUNDS),
    fullName: input.fullName,
    email: input.email,
    tokenVersion: 0,
    createdAt: time,
    updatedAt: time,
  };
  try {
    await users().insertOne(user);
  } catch (error: any) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
      throw new AppError(
        field === "usernameNormalized"
          ? "Username is unavailable"
          : field === "phoneNumber"
            ? "Phone number is already registered"
            : "Email is already registered",
        409,
      );
    }
    throw error;
  }
  await otpService.consumeVerified(input.phoneNumber, OtpPurpose.SIGNUP);
  return authResult(user);
};

// Log in a user with username and password.
export const login = async ({
  username,
  password,
}: {
  username: string;
  password: string;
}) => {
  const user = await users().findOne({
    usernameNormalized: normalized(username),
  });
  if (!user || !(await bcrypt.compare(password, user.passwordHash)))
    throw new AppError("Invalid username or password", 401);
  return authResult(user);
};
// Invalidate a user's token by bumping token version.
export const logout = async (userId: string) => {
  if (!ObjectId.isValid(userId)) throw new AppError("Invalid user token", 401);
  await users().updateOne(
    { _id: new ObjectId(userId) },
    { $inc: { tokenVersion: 1 }, $set: { updatedAt: new Date() } },
  );
};
// Reset a password after OTP verification.
export const resetPassword = async (phoneNumber: string, password: string) => {
  await otpService.requireVerified(phoneNumber, OtpPurpose.PASSWORD_RESET);
  const result = await users().updateOne(
    { phoneNumber },
    {
      $set: {
        passwordHash: await bcrypt.hash(password, HASH_ROUNDS),
        updatedAt: new Date(),
      },
      $inc: { tokenVersion: 1 },
    },
  );
  if (!result.matchedCount) throw new AppError("Unable to reset password", 400);
  await otpService.consumeVerified(phoneNumber, OtpPurpose.PASSWORD_RESET);
};
// Check whether a username is available.
export const usernameAvailable = async (username: string) =>
  !(await users().findOne(
    { usernameNormalized: normalized(username) },
    { projection: { _id: 1 } },
  ));
// Fetch the public profile for the authenticated user.
export const getUser = async (userId: string) => {
  const user = await users().findOne({ _id: new ObjectId(userId) });
  if (!user) throw new AppError("User not found", 404);
  return publicUser(user);
};
