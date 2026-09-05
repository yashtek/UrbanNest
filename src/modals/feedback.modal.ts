import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const FEEDBACK_CATEGORIES = ["GENERAL", "BUG", "FEATURE", "SUPPORT"] as const;
export type FeedbackCategory = (typeof FEEDBACK_CATEGORIES)[number];

export interface IFeedback {
  _id: ObjectId;
  userId: ObjectId;
  category: FeedbackCategory;
  message: string;
  rating?: number;
  createdAt: Date;
}

export const feedbacks = (): Collection<IFeedback> =>
  getDB().collection<IFeedback>("feedbacks");
