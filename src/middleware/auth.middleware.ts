import { ObjectId } from "mongodb";
import { createMiddleware } from "hono/factory";
import { users } from "../modals/user.modal";
import { verifyAccessToken, type AccessTokenPayload } from "../utils/token";

type Variables = { user: AccessTokenPayload };
export const authMiddleware = createMiddleware<{ Variables: Variables }>(
  async (c, next) => {
    const header = c.req.header("Authorization");
    if (!header?.startsWith("Bearer "))
      return c.json(
        { success: false, message: "Authentication token is required" },
        401,
      );
    try {
      const payload = verifyAccessToken(header.slice(7));
      if (!ObjectId.isValid(payload.userId)) throw new Error("bad id");
      const user = await users().findOne(
        { _id: new ObjectId(payload.userId) },
        { projection: { tokenVersion: 1 } },
      );
      if (!user || user.tokenVersion !== payload.tokenVersion)
        throw new Error("revoked");
      c.set("user", payload);
      await next();
    } catch {
      return c.json(
        { success: false, message: "Invalid, expired, or revoked token" },
        401,
      );
    }
  },
);
