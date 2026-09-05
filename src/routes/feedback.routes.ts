import { Hono } from "hono";
import { submitFeedback } from "../controller/feedback.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const feedbackRoutes = new Hono();
feedbackRoutes.post("/", authMiddleware, submitFeedback);

export default feedbackRoutes;
