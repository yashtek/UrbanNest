import { Hono } from "hono";
import { connectDB } from "./db/db";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import { ensureUserIndexes } from "./modals/user.modal";
import { ensureOtpIndexes } from "./otp/otp.service";
const app = new Hono();
await connectDB();
await ensureUserIndexes();
await ensureOtpIndexes();

app.onError(errorHandler);
app.route("/auth", authRoutes);
app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Api running",
  });
});

if (import.meta.main) {
  const port = Number(Bun.env.PORT ?? 3000);
  Bun.serve({ fetch: app.fetch, port });
  console.log(`UrbanNest API listening on http://localhost:${port}`);
}

export default app;
