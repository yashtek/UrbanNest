import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const ROOM_STATUS = ["FULL", "NOT_FULL"] as const;

export type RoomStatus = (typeof ROOM_STATUS)[number];

export interface IRoom {
  _id: ObjectId;
  businessId: ObjectId;
  roomNumber: string;
  floor: number;
  capacity: number;
  occupied: number;
  rent: number;
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  unitUsed: number;
  costPerunit: number;
  amount: number;
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const rooms = (): Collection<IRoom> =>
  getDB().collection<IRoom>("rooms");

export const ensureRoomIndexes = () =>
  rooms().createIndex(
    { businessId: 1, roomNumber: 1 },
    { unique: true, name: "unique_room_number_per_business" },
  );
