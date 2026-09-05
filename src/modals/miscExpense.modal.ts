import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IExpense {
  _id: ObjectId;
  businessId: ObjectId;
  category: ObjectId;
  amount: number;
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

export const expenses = (): Collection<IExpense> =>
  getDB().collection<IExpense>("expenses");
