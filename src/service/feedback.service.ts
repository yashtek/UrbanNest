import { ObjectId } from "mongodb";
import { feedbacks, type FeedbackCategory, type IFeedback } from "../modals/feedback.modal";

export const createFeedback = async (
  userId: string,
  input: { category: FeedbackCategory; message: string; rating?: number },
) => {
  const feedback: IFeedback = {
    _id: new ObjectId(),
    userId: new ObjectId(userId),
    category: input.category,
    message: input.message,
    rating: input.rating,
    createdAt: new Date(),
  };

  await feedbacks().insertOne(feedback);
  return feedback;
};
