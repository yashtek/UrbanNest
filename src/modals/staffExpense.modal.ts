import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IStaffExpense {
  _id: ObjectId;
  businessId: ObjectId;
  staffId: ObjectId;
  month: string;
  salary: number;
  bonus: number;
  advance: number;
  total: number;
}

export const staffExpenses = (): Collection<IStaffExpense> =>
  getDB().collection<IStaffExpense>("staffExpenses");