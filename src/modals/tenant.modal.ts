import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const TENANT_STATUS = ["ACTIVE", "LEFT"] as const;

export type TenantStatus = (typeof TENANT_STATUS)[number];

export interface ITenant {
  _id: ObjectId;
  businessId: ObjectId;
  roomId: ObjectId;
  name: string;
  phone: string;
  aadhaar: string;
  joiningDate: Date;
  leavingDate?: Date;
  rent: number;
  securityDeposit: number;
  status: TenantStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const tenants = (): Collection<ITenant> =>
  getDB().collection<ITenant>("tenants");
