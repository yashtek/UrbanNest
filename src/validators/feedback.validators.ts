import { z } from "zod";
import { FEEDBACK_CATEGORIES } from "../modals/feedback.modal";

export const createFeedbackSchema = z.object({
  category: z.enum(FEEDBACK_CATEGORIES).default("GENERAL"),
  message: z.string().trim().min(1).max(2000),
  rating: z.number().int().min(1).max(5).optional(),
});
