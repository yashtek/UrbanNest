import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import {
  IRoom,
  ROOM_STATUS,
  type RoomStatus,
  rooms,
} from "../modals/room.modal";
import { tenants } from "../modals/tenant.modal";
import { distributeRoomElectricity } from "./tenant-electricity.service";

export interface CreateRoomDto {
  roomNumber: string;
  floor: number;
  capacity: number;
  rent: number;
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  costPerunit: number;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  floor?: number;
  capacity?: number;
  occupied?: number;
  rent?: number;
  readingDate?: Date;
  previousReading?: number;
  currentReading?: number;
  costPerunit?: number;
  status?: RoomStatus;
}

const calculateElectricity = (
  previousReading: number,
  currentReading: number,
  costPerunit: number,
) => {
  if (currentReading < previousReading) {
    throw new AppError("currentReading cannot be less than previousReading", 400);
  }

  const unitUsed = currentReading - previousReading;
  return { unitUsed, amount: unitUsed * costPerunit };
};

class RoomService {
  async create(businessId: string, data: CreateRoomDto) {
    const businessObjectId = new ObjectId(businessId);
    const existingRoom = await rooms().findOne({
      businessId: businessObjectId,
      roomNumber: data.roomNumber,
    });

    if (existingRoom) {
      throw new AppError("Room number already exists in this business", 409);
    }

    const { unitUsed, amount } = calculateElectricity(
      data.previousReading,
      data.currentReading,
      data.costPerunit,
    );

    const payload: IRoom = {
      _id: new ObjectId(),
      businessId: businessObjectId,
      roomNumber: data.roomNumber,
      floor: data.floor,
      capacity: data.capacity,
      occupied: 0,
      rent: data.rent,
      readingDate: data.readingDate,
      previousReading: data.previousReading,
      currentReading: data.currentReading,
      unitUsed,
      costPerunit: data.costPerunit,
      amount,
      status: "NOT_FULL",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return rooms().insertOne(payload);
  }

  async getAll(businessId: string) {
    return rooms()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
  }

  async update(businessId: string, roomId: string, data: UpdateRoomDto) {
    const room = await rooms().findOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!room) {
      throw new AppError("Room not found", 404);
    }

    if (data.roomNumber !== undefined && data.roomNumber !== room.roomNumber) {
      const duplicateRoom = await rooms().findOne({
        businessId: room.businessId,
        roomNumber: data.roomNumber,
        _id: { $ne: room._id },
      });

      if (duplicateRoom) {
        throw new AppError("Room number already exists in this business", 409);
      }
    }

    if (data.status !== undefined && !ROOM_STATUS.includes(data.status)) {
      throw new AppError("Invalid room status", 400);
    }

    const previousReading = data.previousReading ?? room.previousReading;
    const currentReading = data.currentReading ?? room.currentReading;
    const costPerunit = data.costPerunit ?? room.costPerunit;
    const { unitUsed, amount } = calculateElectricity(
      previousReading,
      currentReading,
      costPerunit,
    );

    const updateFields: Partial<IRoom> = {
      previousReading,
      currentReading,
      costPerunit,
      unitUsed,
      amount,
      updatedAt: new Date(),
    };

    const directFields: (keyof UpdateRoomDto)[] = [
      "roomNumber",
      "floor",
      "capacity",
      "occupied",
      "rent",
      "readingDate",
      "status",
    ];

    for (const field of directFields) {
      if (data[field] !== undefined) {
        (updateFields as Record<string, unknown>)[field] = data[field];
      }
    }

    await rooms().updateOne(
      { _id: room._id, businessId: room.businessId },
      { $set: updateFields },
    );

    await distributeRoomElectricity(room.businessId, room._id);

    return rooms().findOne({ _id: room._id, businessId: room.businessId });
  }

  async delete(businessId: string, roomId: string) {
    await tenants().deleteMany({
      businessId: new ObjectId(businessId),
      roomId: new ObjectId(roomId),
    });

    const result = await rooms().deleteOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Room not found", 404);
    }

    return { message: "Room deleted successfully" };
  }
}

export const roomService = new RoomService();
