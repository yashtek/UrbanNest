import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";
export const ROLE = ["COOK", "CLEANER"] as const;

export type STAFFROLE = typeof ROLE[number];
export interface IStaff {
  _id?: ObjectId;              
  businessId: ObjectId;

  name: string;
  phone: string;               
  role: STAFFROLE;               

  salary: number;

  joiningDate: Date;

  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export const staffs = (): Collection<IStaff> =>
  getDB().collection<IStaff>("staffs");