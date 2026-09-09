import { ObjectId, type Filter } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { staffs, type IStaff } from "../modals/staff.modal";
import { staffDuties } from "../modals/staffDuty.modal";
import { staffExpenses } from "../modals/staffExpense.modal";
import { commonOptionService } from "./commonOption.service";

export interface CreateStaffDto {
  name: string;
  phone: string;
  role: string;
  salary: number;
  joiningDate: string | Date;
  isActive: boolean;
  shift: string;
  date: string | Date;
  status: string;
  staffSalary: string;
}

export interface UpdateStaffDto {
  name?: string;
  phone?: string;
  role?: string;
  salary?: number;
  joiningDate?: string | Date;
  isActive?: boolean;
  shift?: string;
  date?: string | Date;
  status?: string;
  staffSalary?: string;
}

class StaffService {
  async create(businessId: string, data: CreateStaffDto) {
    const [role, shift, status, staffSalary] = await Promise.all([
      commonOptionService.require(data.role, "STAFF_ROLE"),
      commonOptionService.require(data.shift, "STAFF_SHIFT"),
      commonOptionService.require(data.status, "STAFF_DUTY_STATUS"),
      commonOptionService.require(data.staffSalary, "STAFF_SALARY_STATUS"),
    ]);

    const payload: IStaff = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      name: data.name,
      phone: data.phone,
      role,
      salary: data.salary,
      joiningDate: new Date(data.joiningDate),
      isActive: data.isActive,
      shift,
      date: new Date(data.date),
      status,
      staffSalary,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await staffs().insertOne(payload);

    return (
      await commonOptionService.populate(
        [payload],
        ["role", "shift", "status", "staffSalary"],
      )
    )[0];
  }

  async getAll(
    businessId: string,
    options: { page?: number; limit?: number; staff_role?: string } = {},
  ) {
    const { page = 1, limit = 10, staff_role } = options;
    if (!ObjectId.isValid(businessId))
      throw new AppError("Invalid businessId", 400);
    if (!Number.isSafeInteger(page) || page < 1)
      throw new AppError("page must be a positive integer", 400);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
      throw new AppError("limit must be an integer between 1 and 100", 400);
    }
    const skip = (page - 1) * limit;
    if (!Number.isSafeInteger(skip))
      throw new AppError("page is too large", 400);

    const filter: Filter<IStaff> = { businessId: new ObjectId(businessId) };
    if (staff_role) {
      if (!ObjectId.isValid(staff_role))
        throw new AppError("Invalid staff_role id", 400);
      filter.role = new ObjectId(staff_role);
    }
    const collection = staffs();
    const [rows, total] = await Promise.all([
      collection
        .find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(filter),
    ]);
    return {
      data: await commonOptionService.populate(rows, [
        "role",
        "shift",
        "status",
        "staffSalary",
      ]),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(businessId: string, staffId: string) {
    const staff = await staffs().findOne({
      _id: new ObjectId(staffId),
      businessId: new ObjectId(businessId),
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    return (
      await commonOptionService.populate(
        [staff],
        ["role", "shift", "status", "staffSalary"],
      )
    )[0];
  }

  async update(businessId: string, staffId: string, data: UpdateStaffDto) {
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.name !== undefined) {
      updateFields.name = data.name;
    }

    if (data.phone !== undefined) {
      updateFields.phone = data.phone;
    }

    if (data.role !== undefined) {
      updateFields.role = await commonOptionService.require(
        data.role,
        "STAFF_ROLE",
      );
    }

    if (data.salary !== undefined) {
      updateFields.salary = data.salary;
    }

    if (data.joiningDate !== undefined) {
      updateFields.joiningDate = new Date(data.joiningDate);
    }

    if (data.isActive !== undefined) {
      updateFields.isActive = data.isActive;
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

    if (data.staffSalary !== undefined) {
      updateFields.staffSalary = await commonOptionService.require(
        data.staffSalary,
        "STAFF_SALARY_STATUS",
      );
    }

    const result = await staffs().updateOne(
      {
        _id: new ObjectId(staffId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: updateFields,
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Staff not found", 404);
    }

    const staff = await staffs().findOne({
      _id: new ObjectId(staffId),
      businessId: new ObjectId(businessId),
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    return (
      await commonOptionService.populate(
        [staff],
        ["role", "shift", "status", "staffSalary"],
      )
    )[0];
  }

  async delete(businessId: string, staffId: string) {
    const businessObjectId = new ObjectId(businessId);
    const staffObjectId = new ObjectId(staffId);

    const staff = await staffs().findOne({
      _id: staffObjectId,
      businessId: businessObjectId,
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    await Promise.all([
      staffDuties().deleteMany({
        businessId: businessObjectId,
        staffId: staffObjectId,
      }),
      staffExpenses().deleteMany({
        businessId: businessObjectId,
        staffId: staffObjectId,
      }),
      staffs().deleteOne({
        _id: staffObjectId,
        businessId: businessObjectId,
      }),
    ]);

    return {
      message: "Staff deleted successfully",
    };
  }
}

export const staffService = new StaffService();
