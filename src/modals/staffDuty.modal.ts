import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const STAFF_DUTY_STATUS = ["PRESENT", "ABSENT", "LEAVE"] as const;

export type StaffDutyStatus = (typeof STAFF_DUTY_STATUS)[number];

export const STAFF_SHIFTS = ["MORNING", "AFTERNOON", "NIGHT"] as const;

export type StaffShift = (typeof STAFF_SHIFTS)[number];

export interface IStaffDuty {
  _id: ObjectId;
  businessId: ObjectId;
  staffId: ObjectId;
  shift: StaffShift;
  date: Date;
  status: StaffDutyStatus;
}

export const staffDuties = (): Collection<IStaffDuty> =>
  getDB().collection<IStaffDuty>("staffDuties");
