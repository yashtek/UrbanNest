import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { staffs, type IStaff, ROLE, type STAFFROLE } from "../modals/staff.modal";
import { staffDuties } from "../modals/staffDuty.modal";
import { staffExpenses } from "../modals/staffExpense.modal";

export interface CreateStaffDto {
  name: string;
  phone: string;
  role: STAFFROLE;
  salary: number;
  joiningDate: string | Date;
  isActive: boolean;
}

export interface UpdateStaffDto {
  name?: string;
  phone?: string;
  role?: STAFFROLE;
  salary?: number;
  joiningDate?: string | Date;
  isActive?: boolean;
}

class StaffService {
  async create(businessId: string, data: CreateStaffDto) {
    if (!ROLE.includes(data.role)) {
      throw new AppError("Invalid staff role", 400);
    }

    const payload: IStaff = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      name: data.name,
      phone: data.phone,
      role: data.role,
      salary: data.salary,
      joiningDate: new Date(data.joiningDate),
      isActive: data.isActive,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await staffs().insertOne(payload);

    return payload;
  }

  async getAll(businessId: string) {
    return staffs()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
  }

  async getById(businessId: string, staffId: string) {
    const staff = await staffs().findOne({
      _id: new ObjectId(staffId),
      businessId: new ObjectId(businessId),
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    return staff;
  }

  async update(businessId: string, staffId: string, data: UpdateStaffDto) {
    if (data.role !== undefined && !ROLE.includes(data.role)) {
      throw new AppError("Invalid staff role", 400);
    }

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
      updateFields.role = data.role;
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

    return staff;
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