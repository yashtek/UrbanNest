import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";
export const ROLE = ["COOK", "CLEANER"] as const;

export type STAFFROLE = (typeof ROLE)[number];
export const STAFF_DUTY_STATUS = ["PRESENT", "ABSENT", "LEAVE"] as const;

export type StaffDutyStatus = (typeof STAFF_DUTY_STATUS)[number];

export const STAFF_SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const;

export type StaffShift = (typeof STAFF_SHIFTS)[number];
export const STAFF_SALARY = ["PAID", "UNPAID", "DUE"] as const;

export type StaffSalary = (typeof STAFF_SALARY)[number];
export interface IStaff {
  _id?: ObjectId;
  businessId: ObjectId;

  name: string;
  phone: string;
  role: STAFFROLE;

  salary: number;

  joiningDate: Date;

  isActive: boolean;
  shift: StaffShift;
  date: Date;
  status: StaffDutyStatus;
  staffSalary: StaffSalary;
  createdAt: Date;
  updatedAt: Date;
}

export const staffs = (): Collection<IStaff> =>
  getDB().collection<IStaff>("staffs");
