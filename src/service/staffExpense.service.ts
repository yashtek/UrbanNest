import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { staffExpenses, type IStaffExpense } from "../modals/staffExpense.modal";
import { staffs } from "../modals/staff.modal";

export interface CreateStaffExpenseDto {
  staffId: string;
  month: string;
  salary: number;
  bonus: number;
  advance: number;
}

export interface UpdateStaffExpenseDto {
  staffId?: string;
  month?: string;
  salary?: number;
  bonus?: number;
  advance?: number;
}

class StaffExpenseService {
  async create(businessId: string, data: CreateStaffExpenseDto) {
    const businessObjectId = new ObjectId(businessId);
    const staffObjectId = new ObjectId(data.staffId);

    const staff = await staffs().findOne({
      _id: staffObjectId,
      businessId: businessObjectId,
    });

    if (!staff) {
      throw new AppError("Staff not found", 404);
    }

    const payload: IStaffExpense = {
      _id: new ObjectId(),
      businessId: businessObjectId,
      staffId: staffObjectId,
      month: data.month,
      salary: data.salary,
      bonus: data.bonus,
      advance: data.advance,
      total: data.salary + data.bonus - data.advance,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await staffExpenses().insertOne(payload);

    return payload;
  }

  async getAll(businessId: string) {
    return staffExpenses()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
  }

  async getById(businessId: string, staffExpenseId: string) {
    const staffExpense = await staffExpenses().findOne({
      _id: new ObjectId(staffExpenseId),
      businessId: new ObjectId(businessId),
    });

    if (!staffExpense) {
      throw new AppError("Staff expense not found", 404);
    }

    return staffExpense;
  }

  async update(businessId: string, staffExpenseId: string, data: UpdateStaffExpenseDto) {
    const businessObjectId = new ObjectId(businessId);
    const expenseObjectId = new ObjectId(staffExpenseId);

    const existingExpense = await staffExpenses().findOne({
      _id: expenseObjectId,
      businessId: businessObjectId,
    });

    if (!existingExpense) {
      throw new AppError("Staff expense not found", 404);
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    const nextStaffId = data.staffId ? new ObjectId(data.staffId) : existingExpense.staffId;

    if (data.staffId !== undefined) {
      const staff = await staffs().findOne({
        _id: nextStaffId,
        businessId: businessObjectId,
      });

      if (!staff) {
        throw new AppError("Staff not found", 404);
      }

      updateFields.staffId = nextStaffId;
    }

    if (data.month !== undefined) {
      updateFields.month = data.month;
    }

    const nextSalary = data.salary ?? existingExpense.salary;
    const nextBonus = data.bonus ?? existingExpense.bonus;
    const nextAdvance = data.advance ?? existingExpense.advance;

    if (data.salary !== undefined) {
      updateFields.salary = data.salary;
    }

    if (data.bonus !== undefined) {
      updateFields.bonus = data.bonus;
    }

    if (data.advance !== undefined) {
      updateFields.advance = data.advance;
    }

    updateFields.total = nextSalary + nextBonus - nextAdvance;

    const result = await staffExpenses().updateOne(
      {
        _id: expenseObjectId,
        businessId: businessObjectId,
      },
      {
        $set: updateFields,
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Staff expense not found", 404);
    }

    const staffExpense = await staffExpenses().findOne({
      _id: expenseObjectId,
      businessId: businessObjectId,
    });

    if (!staffExpense) {
      throw new AppError("Staff expense not found", 404);
    }

    return staffExpense;
  }

  async delete(businessId: string, staffExpenseId: string) {
    const result = await staffExpenses().deleteOne({
      _id: new ObjectId(staffExpenseId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Staff expense not found", 404);
    }

    return {
      message: "Staff expense deleted successfully",
    };
  }
}

export const staffExpenseService = new StaffExpenseService();