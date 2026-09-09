import { ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IStaffAttendance {
  _id: ObjectId;
  businessId: ObjectId;
  staffId: ObjectId;
  date: string;
  timezone: "Asia/Kolkata";
  status: "PRESENT" | "ABSENT";
  markedAt: Date;
  markedBy: string;
  revision?: number;
  updatedAt?: Date;
  updatedBy?: string;
  changes?: Array<{ from: "PRESENT" | "ABSENT"; to: "PRESENT" | "ABSENT"; changedAt: Date; changedBy: string }>;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

export const staffAttendance = () => getDB().collection<IStaffAttendance>("staffAttendance");
export async function ensureStaffAttendanceIndexes() {
  await staffAttendance().createIndex(
    { businessId: 1, staffId: 1, date: -1 },
    { unique: true, partialFilterExpression: { isDeleted: false } },
  );
  await staffAttendance().createIndex({ businessId: 1, isDeleted: 1, date: -1, _id: -1 });
}
