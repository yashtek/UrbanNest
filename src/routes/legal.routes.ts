import { Hono } from "hono";
import {
  createPrivacyPolicy,
  createTermsAndConditions,
  privacyPolicy,
  termsAndConditions,
} from "../controller/legal.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const legalRoutes = new Hono();
legalRoutes.get("/privacy-policy", privacyPolicy);
legalRoutes.get("/terms-and-conditions", termsAndConditions);
// legalRoutes.post("/privacy-policy", authMiddleware, createPrivacyPolicy);
// legalRoutes.post(
//   "/terms-and-conditions",
//   authMiddleware,
//   createTermsAndConditions,
// );

export default legalRoutes;
