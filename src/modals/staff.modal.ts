import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";
export interface IStaff {
  _id?: ObjectId;
  businessId: ObjectId;

  name: string;
  phone: string;
  role: ObjectId;

  salary: number;

  joiningDate: Date;

  isActive: boolean;
  shift: ObjectId;
  date: Date;
  status: ObjectId;
  staffSalary: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const staffs = (): Collection<IStaff> =>
  getDB().collection<IStaff>("staffs");
