import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const SECURITY_STATUS = ["PAID", "PENDING", "RETURNED"] as const;

export type SecurityStatus = (typeof SECURITY_STATUS)[number];

export interface ISecurityDeposit {
  _id: ObjectId;
  businessId: ObjectId;
  tenantId: ObjectId;
  amount: number;
  paidDate?: Date;
  returnedDate?: Date;
  status: SecurityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const securityDeposits = (): Collection<ISecurityDeposit> =>
  getDB().collection<ISecurityDeposit>("securityDeposits");
