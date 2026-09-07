import { createPublicKey } from "node:crypto";
import jwt, { type JwtPayload } from "jsonwebtoken";
import { AppError } from "../middleware/error.middleware";

type SigningKey = JsonWebKey & { kid?: string; alg?: string; use?: string };
let cache: { keys: SigningKey[]; expiresAt: number } | undefined;
let pending: Promise<SigningKey[]> | undefined;
async function signingKeys(): Promise<SigningKey[]> {
  if (cache && cache.expiresAt > Date.now()) return cache.keys;
  if (pending) return pending;
  pending = (async () => {
    try {
      const response = await fetch("https://fpnv.googleapis.com/v1beta/jwks", { signal: AbortSignal.timeout(10_000), redirect: "error" });
      if (!response.ok) throw new Error();
      const data = await response.json() as { keys?: SigningKey[] };
      if (!Array.isArray(data.keys) || !data.keys.length) throw new Error();
      cache = { keys: data.keys, expiresAt: Date.now()+60_000 };
      return data.keys;
    } catch { throw new AppError("Firebase PNV signing keys unavailable. Please retry later.", 503); }
  })();
  try { return await pending; } finally { pending = undefined; }
}

export async function verifyFirebasePhone(phoneNumber: string, fpnvToken: string) {
  const projectNumber = process.env.FIREBASE_PROJECT_NUMBER?.trim();
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  if (!projectNumber || !/^\d+$/.test(projectNumber) || !projectId)
    throw new AppError("Configure FIREBASE_PROJECT_NUMBER and FIREBASE_PROJECT_ID for PNV verification", 503);
  const issuer = `https://fpnv.googleapis.com/projects/${projectNumber}`;
  const projectAudience = `https://fpnv.googleapis.com/projects/${projectId}`;
  const invalid = () => new AppError("Invalid or expired Firebase PNV token", 401);
  let header: jwt.JwtHeader;
  try {
    const decoded = jwt.decode(fpnvToken, { complete: true });
    if (!decoded || decoded.header.typ !== "JWT" || decoded.header.alg !== "ES256" || !decoded.header.kid) throw invalid();
    header = decoded.header;
  } catch { throw invalid(); }
  // Header inspection only selects Google's key; claims are trusted only after verification.
  const keys = await signingKeys();
  const key = keys.find(key => key.kid === header.kid && key.kty === "EC" && key.crv === "P-256"
    && (!key.alg || key.alg === "ES256") && (!key.use || key.use === "sig"));
  if (!key) throw invalid();
  let claims: JwtPayload;
  try {
    const verified = jwt.verify(fpnvToken, createPublicKey({key,format:"jwk"}), {algorithms:["ES256"],issuer,audience:issuer});
    if (typeof verified === "string") throw invalid();
    claims = verified;
    if (!Number.isFinite(claims.exp) || !Array.isArray(claims.aud) || !claims.aud.includes(projectAudience)) throw invalid();
  } catch { throw invalid(); }
  if (typeof claims.sub !== "string" || !/^\+[1-9]\d{7,14}$/.test(claims.sub)) throw invalid();
  if (claims.sub !== phoneNumber) throw new AppError("Firebase PNV verified phone does not match signup phone", 403);
  return { phoneNumber: claims.sub, phoneVerified: true as const };
}

