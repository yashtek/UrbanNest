import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import {
  staffDuties,
  type IStaffDuty,
  STAFF_DUTY_STATUS,
  STAFF_SHIFTS,
  type StaffDutyStatus,
  type StaffShift,
} from "../modals/staffDuty.modal";
import { staffs } from "../modals/staff.modal";

export interface CreateStaffDutyDto {
  staffId: string;
  shift: StaffShift;
  date: string | Date;
  status: StaffDutyStatus;
}

export interface UpdateStaffDutyDto {
  staffId?: string;
  shift?: StaffShift;
  date?: string | Date;
  status?: StaffDutyStatus;
}

class StaffDutyService {
  async create(businessId: string, data: CreateStaffDutyDto) {
    if (!STAFF_SHIFTS.includes(data.shift)) {
      throw new AppError("Invalid staff shift", 400);
    }

    if (!STAFF_DUTY_STATUS.includes(data.status)) {
      throw new AppError("Invalid staff duty status", 400);
    }

    const businessObjectId = new ObjectId(businessId);
    const staffObjectId = new ObjectId(data.staffId);

    const staff = await staffs().findOne({
      _id: staffObjectId,
      businessId: businessObjectId,
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    const payload: IStaffDuty = {
      _id: new ObjectId(),
      businessId: businessObjectId,
      staffId: staffObjectId,
      shift: data.shift,
      date: new Date(data.date),
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await staffDuties().insertOne(payload);

    return payload;
  }

  async getAll(businessId: string) {
    return staffDuties()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
  }

  async getById(businessId: string, staffDutyId: string) {
    const staffDuty = await staffDuties().findOne({
      _id: new ObjectId(staffDutyId),
      businessId: new ObjectId(businessId),
    });

    if (!staffDuty) {
      throw new AppError("Staff duty not found", 404);
    }

    return staffDuty;
  }

  async update(businessId: string, staffDutyId: string, data: UpdateStaffDutyDto) {
    if (data.shift !== undefined && !STAFF_SHIFTS.includes(data.shift)) {
      throw new AppError("Invalid staff shift", 400);
    }

    if (data.status !== undefined && !STAFF_DUTY_STATUS.includes(data.status)) {
      throw new AppError("Invalid staff duty status", 400);
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.staffId !== undefined) {
      const staffObjectId = new ObjectId(data.staffId);
      const staff = await staffs().findOne({
        _id: staffObjectId,
        businessId: new ObjectId(businessId),
      });

      if (!staff) {
        throw new AppError("Staff not found", 404);
      }

      updateFields.staffId = staffObjectId;
    }

    if (data.shift !== undefined) {
      updateFields.shift = data.shift;
    }

    if (data.date !== undefined) {
      updateFields.date = new Date(data.date);
    }

    if (data.status !== undefined) {
      updateFields.status = data.status;
    }

    const result = await staffDuties().updateOne(
      {
        _id: new ObjectId(staffDutyId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: updateFields,
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Staff duty not found", 404);
    }

    const staffDuty = await staffDuties().findOne({
      _id: new ObjectId(staffDutyId),
      businessId: new ObjectId(businessId),
    });

    if (!staffDuty) {
      throw new AppError("Staff duty not found", 404);
    }

    return staffDuty;
  }

  async delete(businessId: string, staffDutyId: string) {
    const result = await staffDuties().deleteOne({
      _id: new ObjectId(staffDutyId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Staff duty not found", 404);
    }

    return {
      message: "Staff duty deleted successfully",
    };
  }
}

export const staffDutyService = new StaffDutyService();