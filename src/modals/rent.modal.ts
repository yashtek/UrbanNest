import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const RENT_STATUS = ["PAID", "PENDING", "OVERDUE"] as const;

export type RentStatus = (typeof RENT_STATUS)[number];

export interface IRent {
  _id: ObjectId;
  businessId: ObjectId;
  tenantId: ObjectId;
  month: string;
  amount: number;
  paidDate?: Date;
  dueDate: Date;
  status: RentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const rents = (): Collection<IRent> =>
  getDB().collection<IRent>("rents");
