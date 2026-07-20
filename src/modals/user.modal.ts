import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IUser {
  _id: ObjectId;
  phoneNumber: string;
  phoneVerified: boolean;
  username: string;
  usernameNormalized: string;
  passwordHash: string;
  fullName: string;
  email?: string;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export const users = (): Collection<IUser> =>
  getDB().collection<IUser>("users");

export async function ensureUserIndexes() {
  // Migrate the legacy non-sparse unique email index. A sparse index is needed
  // because email is optional and non-sparse unique indexes allow only one
  // document without that field.
  const emailIndex = (await users().indexes()).find(
    (index) => index.name === "email_1",
  );
  if (emailIndex && !emailIndex.sparse) await users().dropIndex("email_1");

  await Promise.all([
    users().createIndex({ phoneNumber: 1 }, { unique: true }),
    users().createIndex({ usernameNormalized: 1 }, { unique: true }),
    users().createIndex({ email: 1 }, { unique: true, sparse: true }),
  ]);
}
