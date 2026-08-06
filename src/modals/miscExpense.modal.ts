import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const EXPENSE_CATEGORIES = [
  "ELECTRICITY",
  "CLEANING",
  "INTERNET",
  "REPAIR",
  "FOOD",
  "WATER",
  "STAFF",
  "OTHER",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export interface IExpense {
  _id: ObjectId;
  businessId: ObjectId;
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: Date;
}

export const expenses = (): Collection<IExpense> =>
  getDB().collection<IExpense>("expenses");
