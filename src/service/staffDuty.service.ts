import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { staffDuties, type IStaffDuty } from "../modals/staffDuty.modal";
import { staffs } from "../modals/staff.modal";
import { commonOptionService } from "./commonOption.service";

export interface CreateStaffDutyDto {
  staffId: string;
  shift: string;
  date: string | Date;
  status: string;
}

export interface UpdateStaffDutyDto {
  staffId?: string;
  shift?: string;
  date?: string | Date;
  status?: string;
}

class StaffDutyService {
  async create(businessId: string, data: CreateStaffDutyDto) {
    const [shift, status] = await Promise.all([
      commonOptionService.require(data.shift, "STAFF_SHIFT"),
      commonOptionService.require(data.status, "STAFF_DUTY_STATUS"),
    ]);

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
      shift,
      date: new Date(data.date),
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await staffDuties().insertOne(payload);

    return (
      await commonOptionService.populate([payload], ["shift", "status"])
    )[0];
  }

  async getAll(businessId: string) {
    const rows = await staffDuties()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
    return commonOptionService.populate(rows, ["shift", "status"]);
  }

  async getById(businessId: string, staffDutyId: string) {
    const staffDuty = await staffDuties().findOne({
      _id: new ObjectId(staffDutyId),
      businessId: new ObjectId(businessId),
    });

    if (!staffDuty) {
      throw new AppError("Staff duty not found", 404);
    }

    return (
      await commonOptionService.populate([staffDuty], ["shift", "status"])
    )[0];
  }

  async update(
    businessId: string,
    staffDutyId: string,
    data: UpdateStaffDutyDto,
  ) {
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
      updateFields.shift = await commonOptionService.require(
        data.shift,
        "STAFF_SHIFT",
      );
    }

    if (data.date !== undefined) {
      updateFields.date = new Date(data.date);
    }

    if (data.status !== undefined) {
      updateFields.status = await commonOptionService.require(
        data.status,
        "STAFF_DUTY_STATUS",
      );
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

    return (
      await commonOptionService.populate([staffDuty], ["shift", "status"])
    )[0];
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
