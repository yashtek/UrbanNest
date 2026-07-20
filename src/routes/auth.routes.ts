import { Hono } from "hono";
import * as auth from "../controller/auth.controller";

const authRoutes = new Hono();
authRoutes.post("/send-signup-otp", auth.sendSignupOtp);
authRoutes.post("/verify-signup-otp", auth.verifySignupOtp);
authRoutes.post("/complete-signup", auth.completeSignup);
authRoutes.post("/login", auth.login);
authRoutes.post("/logout", ...auth.logout);
authRoutes.get("/me", ...auth.me);
authRoutes.get("/verify-token", ...auth.verifyToken);
authRoutes.get("/check-username", auth.checkUsername);
authRoutes.post("/forgot-password/send-otp", auth.sendForgotPasswordOtp);
authRoutes.post("/forgot-password/verify-otp", auth.verifyForgotPasswordOtp);
authRoutes.post("/forgot-password/reset", auth.resetPassword);
export default authRoutes;
