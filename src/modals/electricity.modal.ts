import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export interface Ielectricity {
  _id: ObjectId;
  roomId: ObjectId;
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  unitUsed: number;
  amount: number;
  createdAt: Date;
  updatedAt: Date;
}

export const electricity = (): Collection<Ielectricity> =>
  getDB().collection<Ielectricity>("electricity");
