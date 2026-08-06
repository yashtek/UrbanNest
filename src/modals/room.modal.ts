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
  electricity: number;
  roomPhotoUrls: string[];
  roomPhotoPublicIds: string[];
  status: RoomStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const rooms = (): Collection<IRoom> =>
  getDB().collection<IRoom>("rooms");
