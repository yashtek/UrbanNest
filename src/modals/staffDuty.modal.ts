import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface IStaffDuty {
  _id: ObjectId;
  businessId: ObjectId;
  staffId: ObjectId;
  shift: ObjectId;
  date: Date;
  status: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const staffDuties = (): Collection<IStaffDuty> =>
  getDB().collection<IStaffDuty>("staffDuties");
