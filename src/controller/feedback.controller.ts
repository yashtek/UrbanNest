import { Context } from "hono";
import { createFeedback } from "../service/feedback.service";
import { createFeedbackSchema } from "../validators/feedback.validators";

export const submitFeedback = async (c: Context) => {
  const input = createFeedbackSchema.parse(await c.req.json());
  const feedback = await createFeedback(c.get("user").userId, input);
  const response = {
    id: feedback._id.toString(),
    category: feedback.category,
    message: feedback.message,
    rating: feedback.rating,
    createdAt: feedback.createdAt,
  };

  return c.json(
    {
      success: true,
      message: "Feedback submitted successfully",
      data: response,
    },
    201,
  );
};
