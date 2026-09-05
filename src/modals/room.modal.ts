import { Collection, MongoServerError, ObjectId } from "mongodb";
import { getDB } from "../db/db";

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
  status: ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const rooms = (): Collection<IRoom> =>
  getDB().collection<IRoom>("rooms");

export const ensureRoomIndexes = async () => {
  try {
    await rooms().createIndex(
      { businessId: 1, roomNumber: 1 },
      { unique: true, name: "unique_room_number_per_business" },
    );
  } catch (error) {
    if (error instanceof MongoServerError && error.code === 11000) {
      const duplicates = await rooms()
        .aggregate<{
          _id: { businessId: ObjectId; roomNumber: string };
          roomIds: ObjectId[];
          count: number;
        }>([
          {
            $group: {
              _id: { businessId: "$businessId", roomNumber: "$roomNumber" },
              roomIds: { $push: "$_id" },
              count: { $sum: 1 },
            },
          },
          { $match: { count: { $gt: 1 } } },
        ])
        .toArray();

      console.warn(
        "Room unique index was not created because existing duplicate room numbers must be resolved:",
        duplicates,
      );
      return;
    }

    throw error;
  }
};
