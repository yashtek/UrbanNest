import { sendSignupEmailOtp, verifySignupEmailOtp, consumeSignupEmailProof, restoreEmailProof } from "../otp/email-otp.service";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { users, type IUser } from "../modals/user.modal";
import { AppError } from "../middleware/error.middleware";
import { createAccessToken } from "../utils/token";


const HASH_ROUNDS = 12;
const publicUser = (user: IUser) => ({
  id: user._id.toString(),
  phoneNumber: user.phoneNumber,
  phoneVerified: user.phoneVerified,
  username: user.username,
  fullName: user.fullName,
  email: user.email,
  emailVerified: user.emailVerified ?? false,
  createdAt: user.createdAt,
});
const authResult = (user: IUser) => ({
  user: publicUser(user),
  accessToken: createAccessToken(user),
});
const normalized = (username: string) => username.toLowerCase();

export type UpdateProfileInput = {
  fullName?: string;
  username?: string;
  email?: string | null;
};

// Auth service functions for OTP, signup, login, logout, and password reset.
// Verify the signup OTP for a phone number.
export const sendSignupOtp = sendSignupEmailOtp;
export const verifySignupOtp = verifySignupEmailOtp;
// Send and verify purpose-specific email OTPs for existing accounts.
export const sendPasswordResetOtp = async (email: string) => {
  if (await users().findOne({ email, isDeleted: { $ne: true } }))
    await sendSignupEmailOtp(email, "password_reset");
};
export const verifyPasswordResetOtp = async (email: string, code: string) => {
  if (!(await users().findOne({ email, isDeleted: { $ne: true } })))
    throw new AppError("Invalid or expired OTP", 400);
  return verifySignupEmailOtp(email, code, "password_reset");
};

// Create a new user after phone verification.
export const completeSignup = async (input: {
  phoneNumber: string;
  verificationToken: string;
  fullName: string;
  email: string;
  username: string;
  password: string;
}) => {
  const time = new Date();
  const user: IUser = {
    _id: new ObjectId(),
    phoneNumber: input.phoneNumber,
    phoneVerified: false,
    emailVerified: true,
    username: input.username,
    usernameNormalized: normalized(input.username),
    passwordHash: await bcrypt.hash(input.password, HASH_ROUNDS),
    fullName: input.fullName,
    email: input.email,
    tokenVersion: 0,
    isDeleted: false,
    createdAt: time,
    updatedAt: time,
  };
  const proof = await consumeSignupEmailProof(input.email, input.verificationToken);
  try {
    await users().insertOne(user);
  } catch (error: any) {
    await restoreEmailProof(proof);
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
    isDeleted: { $ne: true },
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
export const resetPassword = async (email: string, password: string, verificationToken: string) => {
  const passwordHash = await bcrypt.hash(password, HASH_ROUNDS);
  const proof = await consumeSignupEmailProof(email, verificationToken, "password_reset");
  try {
    const result = await users().updateOne(
      { email, isDeleted: { $ne: true } },
      { $set: { passwordHash, updatedAt: new Date() }, $inc: { tokenVersion: 1 } },
    );
    if (!result.matchedCount) throw new AppError("Unable to reset password", 400);
  } catch (error) {
    await restoreEmailProof(proof, "password_reset");
    throw error;
  }
};
// Check whether a username is available.
export const usernameAvailable = async (username: string) =>
  !(await users().findOne(
    { usernameNormalized: normalized(username) },
    { projection: { _id: 1 } },
  ));
// Fetch the public profile for the authenticated user.
export const getUser = async (userId: string) => {
  const user = await users().findOne({
    _id: new ObjectId(userId),
    isDeleted: { $ne: true },
  });
  if (!user) throw new AppError("User not found", 404);
  return publicUser(user);
};

// Fetch the authenticated user's profile.
export const getProfile = getUser;

// Update the authenticated user's profile.
export const updateProfile = async (userId: string, input: UpdateProfileInput) => {
  const userObjectId = new ObjectId(userId);
  const existingUser = await users().findOne({
    _id: userObjectId,
    isDeleted: { $ne: true },
  });

  if (!existingUser) {
    throw new AppError("User not found", 404);
  }

  const updateFields: Partial<IUser> = {
    updatedAt: new Date(),
    tokenVersion: existingUser.tokenVersion + 1,
  };
  let unsetEmail = false;

  if (input.fullName !== undefined) {
    updateFields.fullName = input.fullName;
  }

  if (input.username !== undefined) {
    updateFields.username = input.username;
    updateFields.usernameNormalized = normalized(input.username);
  }

  if (input.email !== undefined) {
    if (input.email === null) {
      unsetEmail = true;
      updateFields.emailVerified = false;
    } else {
      updateFields.email = input.email;
      if (input.email !== existingUser.email) updateFields.emailVerified = false;
    }
  }

  try {
    const result = await users().updateOne(
      { _id: userObjectId },
      {
        $set: updateFields,
        ...(unsetEmail ? { $unset: { email: "" as const } } : {}),
      },
    );

    if (!result.matchedCount) {
      throw new AppError("User not found", 404);
    }
  } catch (error: any) {
    if (error?.code === 11000) {
      const field = Object.keys(error.keyPattern ?? error.keyValue ?? {})[0];
      throw new AppError(
        field === "usernameNormalized"
          ? "Username is unavailable"
          : "Email is already registered",
        409,
      );
    }
    throw error;
  }

  const updatedUser = await users().findOne({ _id: userObjectId });

  if (!updatedUser) {
    throw new AppError("User not found", 404);
  }

  return authResult(updatedUser);
};

// Soft-delete the authenticated account and immediately revoke its tokens.
export const softDeleteUser = async (userId: string) => {
  if (!ObjectId.isValid(userId)) throw new AppError("Invalid user token", 401);

  const deletedAt = new Date();
  const result = await users().updateOne(
    { _id: new ObjectId(userId), isDeleted: { $ne: true } },
    {
      $set: { isDeleted: true, deletedAt, updatedAt: deletedAt },
      $inc: { tokenVersion: 1 },
    },
  );

  if (!result.matchedCount) throw new AppError("User not found", 404);
};
