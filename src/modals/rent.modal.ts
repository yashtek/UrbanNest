import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IRent {
  _id: ObjectId;
  businessId: ObjectId;
  tenantId: ObjectId;
  month: string;
  amount: number;
  paidDate?: Date;
  dueDate: Date;
  status: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const rents = (): Collection<IRent> =>
  getDB().collection<IRent>("rents");
