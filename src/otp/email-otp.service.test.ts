import { beforeEach, afterEach, expect, mock, test } from "bun:test";
import bcrypt from "bcrypt";
const collections = new Map<string, Map<string, any>>();
let sent: any,
  fail = false;
function matches(row: any, filter: any) {
  return Object.entries(filter).every(([key, value]: any) => {
    if (value && typeof value === "object" && !(value instanceof Date))
      return Object.entries(value).every(([op, v]: any) =>
        op === "$gt"
          ? row[key] > v
          : op === "$lt"
            ? row[key] < v
            : op === "$lte"
              ? row[key] <= v
              : false,
      );
    return row[key] === value;
  });
}
const table = (name: string) => {
  if (!collections.has(name)) collections.set(name, new Map());
  return collections.get(name)!;
};
mock.module("../db/db", () => ({
  getDB: () => ({
    collection: (name: string) => {
      const rows = table(name);
      const find = (f: any) => [...rows.values()].find((r) => matches(r, f));
      return {
        createIndex: async () => "",
        deleteOne: async (f: any) => {
          const r = find(f);
          if (r) rows.delete(r._id);
        },
        findOneAndDelete: async (f: any) => {
          const r = find(f);
          if (r) rows.delete(r._id);
          return r ?? null;
        },
        insertOne: async (r: any) => {
          if (rows.has(r._id)) throw { code: 11000 };
          rows.set(r._id, { ...r });
        },
        replaceOne: async (f: any, r: any) => {
          rows.set(f._id, { _id: f._id, ...r });
        },
        updateOne: async (f: any, u: any) => {
          const r = find(f);
          if (!r) return { modifiedCount: 0 };
          Object.assign(r, u.$set);
          return { modifiedCount: 1 };
        },
        findOneAndUpdate: async (f: any, u: any, o: any) => {
          let r = find(f);
          if (!r && o?.upsert) {
            if (rows.has(f._id)) throw { code: 11000 };
            r = { _id: f._id, ...u.$setOnInsert };
            rows.set(f._id, r);
          }
          if (!r) return null;
          Object.assign(r, u.$set);
          for (const [k, v] of Object.entries(u.$inc ?? {}))
            r[k] = (r[k] ?? 0) + Number(v);
          return { ...r };
        },
      };
    },
  }),
}));
mock.module("resend", () => ({
  Resend: class {
    emails = {
      send: async (value: any) => {
        sent = value;
        return fail
          ? { error: { message: "rejected" } }
          : { data: { id: "email-reference" } };
      },
    };
  },
}));
const {
  sendSignupEmailOtp,
  verifySignupEmailOtp,
  consumeSignupEmailProof,
  restoreEmailProof,
} = await import("./email-otp.service");
const savedKey = process.env.RESEND_KEY;
beforeEach(() => {
  collections.clear();
  sent = undefined;
  fail = false;
  process.env.RESEND_KEY = "test-key";
});
afterEach(() => {
  if (savedKey === undefined) delete process.env.RESEND_KEY;
  else process.env.RESEND_KEY = savedKey;
});
const email = "person@example.com";
const code = () => sent.text.match(/\b\d{6}\b/)[0];
test("sends random six-digit code to signup email and stores only its hash for five minutes", async () => {
  const result = await sendSignupEmailOtp(email);
  expect(sent.to).toEqual([email]);
  expect(code()).toMatch(/^[1-9]\d{5}$/);
  const r = table("signup_email_otps").get(email);
  expect(await bcrypt.compare(code(), r.codeHash)).toBe(true);
  expect(JSON.stringify(r)).not.toContain(code());
  expect(r.expiresAt.getTime() - Date.now()).toBeGreaterThan(290000);
  expect(result).not.toHaveProperty("otp");
});
test("verification deletes OTP and returns single-use email-bound signup proof", async () => {
  await sendSignupEmailOtp(email);
  const result = await verifySignupEmailOtp(email, code());
  expect(table("signup_email_otps").has(email)).toBe(false);
  await expect(verifySignupEmailOtp(email, code())).rejects.toMatchObject({
    statusCode: 400,
  });
  await expect(
    consumeSignupEmailProof("other@example.com", result.verificationToken),
  ).rejects.toMatchObject({ statusCode: 403 });
  await consumeSignupEmailProof(email, result.verificationToken);
  await expect(
    consumeSignupEmailProof(email, result.verificationToken),
  ).rejects.toMatchObject({ statusCode: 403 });
});
test("expired codes fail even before MongoDB TTL cleanup", async () => {
  await sendSignupEmailOtp(email);
  table("signup_email_otps").get(email).expiresAt = new Date(0);
  await expect(verifySignupEmailOtp(email, code())).rejects.toMatchObject({
    statusCode: 400,
  });
});
test("five wrong attempts exhaust code; cooldown prevents immediate resend", async () => {
  await sendSignupEmailOtp(email);
  await expect(sendSignupEmailOtp(email)).rejects.toMatchObject({
    statusCode: 429,
  });
  for (let i = 0; i < 5; i++)
    await expect(verifySignupEmailOtp(email, "000000")).rejects.toMatchObject({
      statusCode: 400,
    });
  await expect(verifySignupEmailOtp(email, code())).rejects.toMatchObject({
    statusCode: 400,
  });
});
test("failed email sending removes code and never returns success", async () => {
  fail = true;
  await expect(sendSignupEmailOtp(email)).rejects.toMatchObject({
    statusCode: 502,
  });
  expect(table("signup_email_otps").has(email)).toBe(false);
});

test("signup proof can be restored after a rejected submission without extending its expiry", async () => {
  await sendSignupEmailOtp(email);
  const result = await verifySignupEmailOtp(email, code());
  expect(result.expiresIn).toBe(1800);
  const proof = await consumeSignupEmailProof(email, result.verificationToken);
  await expect(
    consumeSignupEmailProof(email, result.verificationToken),
  ).rejects.toMatchObject({ statusCode: 403 });
  await restoreEmailProof(proof);
  const retried = await consumeSignupEmailProof(
    email,
    result.verificationToken,
  );
  expect(retried.expiresAt).toEqual(proof.expiresAt);
  await expect(
    consumeSignupEmailProof(email, result.verificationToken),
  ).rejects.toMatchObject({ statusCode: 403 });
});
test("password reset email codes and proofs cannot authorize signup", async () => {
  await sendSignupEmailOtp(email, "password_reset");
  expect(sent.to).toEqual([email]);
  expect(sent.subject).toContain("password reset");
  const resetCode = code();
  await expect(verifySignupEmailOtp(email, resetCode)).rejects.toMatchObject({
    statusCode: 400,
  });
  const result = await verifySignupEmailOtp(email, resetCode, "password_reset");
  expect(result.expiresIn).toBe(300);
  await expect(
    consumeSignupEmailProof(email, result.verificationToken),
  ).rejects.toMatchObject({ statusCode: 403 });
  await expect(
    consumeSignupEmailProof(
      "other@example.com",
      result.verificationToken,
      "password_reset",
    ),
  ).rejects.toMatchObject({ statusCode: 403 });
  await consumeSignupEmailProof(
    email,
    result.verificationToken,
    "password_reset",
  );
  await expect(
    consumeSignupEmailProof(email, result.verificationToken, "password_reset"),
  ).rejects.toMatchObject({ statusCode: 403 });
});
test("resending replaces the previous email code", async () => {
  await sendSignupEmailOtp(email);
  const oldHash = table("signup_email_otps").get(email).codeHash;
  table("signup_email_limits").get(email).lastSentAt = new Date(
    Date.now() - 31000,
  );
  await sendSignupEmailOtp(email);
  expect(table("signup_email_otps").get(email).codeHash).not.toBe(oldHash);
  await verifySignupEmailOtp(email, code());
});
