import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { roomService, type UpdateRoomDto } from "../service/room.service";

const toString = (value: unknown, field: string) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const toNumber = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    throw new AppError(`${field} is required`, 400);
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  return parsed;
};

const toDate = (value: unknown, field: string) => {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new AppError(`${field} is required`, 400);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new AppError(`${field} must be a valid date`, 400);
  }
  return parsed;
};

const optionalNumber = (value: unknown, field: string) =>
  value === undefined ? undefined : toNumber(value, field);

const optionalDate = (value: unknown, field: string) =>
  value === undefined ? undefined : toDate(value, field);

class RoomController {
  async create(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);

    const body = await c.req.json();
    const result = await roomService.create(businessId, {
      roomNumber: toString(body.roomNumber, "roomNumber"),
      floor: toNumber(body.floor, "floor"),
      capacity: toNumber(body.capacity, "capacity"),
      rent: toNumber(body.rent, "rent"),
      readingDate: toDate(body.readingDate, "readingDate"),
      previousReading: toNumber(body.previousReading, "previousReading"),
      currentReading: toNumber(body.currentReading, "currentReading"),
      costPerunit: toNumber(body.costPerunit, "costPerunit"),
    });

    return c.json(result, 201);
  }

  async getAll(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);
    return c.json(await roomService.getAll(businessId));
  }

  async update(c: Context) {
    const businessId = c.req.param("businessId");
    const roomId = c.req.param("roomId");
    if (!businessId || !roomId) {
      throw new AppError("businessId and roomId are required", 400);
    }

    const body = await c.req.json();
    const data: UpdateRoomDto = {
      roomNumber:
        body.roomNumber === undefined
          ? undefined
          : toString(body.roomNumber, "roomNumber"),
      floor: optionalNumber(body.floor, "floor"),
      capacity: optionalNumber(body.capacity, "capacity"),
      occupied: optionalNumber(body.occupied, "occupied"),
      rent: optionalNumber(body.rent, "rent"),
      readingDate: optionalDate(body.readingDate, "readingDate"),
      previousReading: optionalNumber(body.previousReading, "previousReading"),
      currentReading: optionalNumber(body.currentReading, "currentReading"),
      costPerunit: optionalNumber(body.costPerunit, "costPerunit"),
      status: body.status === undefined ? undefined : toString(body.status, "status"),
    };

    return c.json(await roomService.update(businessId, roomId, data));
  }

  async delete(c: Context) {
    const businessId = c.req.param("businessId");
    const roomId = c.req.param("roomId");
    if (!businessId || !roomId) {
      throw new AppError("businessId and roomId are required", 400);
    }
    return c.json(await roomService.delete(businessId, roomId));
  }
}

export const roomController = new RoomController();
