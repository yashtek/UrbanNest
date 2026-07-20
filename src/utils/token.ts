import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { AppError } from "../middleware/error.middleware";

export type AccessTokenPayload = {
  userId: string;
  username: string;
  tokenVersion: number;
  jti: string;
  iat?: number;
  exp?: number;
};

const accessSecret = () => {
  const secret = Bun.env.JWT_ACCESS_SECRET;
  if (!secret || secret.length < 32)
    throw new AppError("JWT_ACCESS_SECRET must be set to at least 32 characters", 500);
  return secret;
};

export const createAccessToken = (user: Pick<AccessTokenPayload, "username" | "tokenVersion"> & { _id: { toString(): string } }) =>
  jwt.sign(
    { userId: user._id.toString(), username: user.username, tokenVersion: user.tokenVersion, jti: crypto.randomUUID() },
    accessSecret(),
    { expiresIn: "7d", issuer: "urbannest", audience: "urbannest-mobile" },
  );

export const verifyAccessToken = (token: string): AccessTokenPayload => jwt.verify(token, accessSecret(), {
  issuer: "urbannest", audience: "urbannest-mobile",
}) as AccessTokenPayload;
