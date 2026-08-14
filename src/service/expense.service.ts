import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import {
  EXPENSE_CATEGORIES,
  expenses,
  type ExpenseCategory,
  type IExpense,
} from "../modals/miscExpense.modal";

export interface CreateExpenseDto {
  category: ExpenseCategory;
  amount: number;
  description: string;
  date: string | Date;
}

export interface UpdateExpenseDto {
  category?: ExpenseCategory;
  amount?: number;
  description?: string;
  date?: string | Date;
}

class ExpenseService {
  async create(businessId: string, data: CreateExpenseDto) {
    if (!EXPENSE_CATEGORIES.includes(data.category)) {
      throw new AppError("Invalid expense category", 400);
    }

    const payload: IExpense = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      category: data.category,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expenses().insertOne(payload);

    return payload;
  }

  async getAll(businessId: string) {
    return expenses()
      .find({ businessId: new ObjectId(businessId) })
      .toArray();
  }

  async getById(businessId: string, expenseId: string) {
    const expense = await expenses().findOne({
      _id: new ObjectId(expenseId),
      businessId: new ObjectId(businessId),
    });

    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    return expense;
  }

  async update(businessId: string, expenseId: string, data: UpdateExpenseDto) {
    if (data.category !== undefined && !EXPENSE_CATEGORIES.includes(data.category)) {
      throw new AppError("Invalid expense category", 400);
    }

    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.category !== undefined) {
      updateFields.category = data.category;
    }

    if (data.amount !== undefined) {
      updateFields.amount = data.amount;
    }

    if (data.description !== undefined) {
      updateFields.description = data.description;
    }

    if (data.date !== undefined) {
      updateFields.date = new Date(data.date);
    }

    const result = await expenses().updateOne(
      {
        _id: new ObjectId(expenseId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: updateFields,
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Expense not found", 404);
    }

    const expense = await expenses().findOne({
      _id: new ObjectId(expenseId),
      businessId: new ObjectId(businessId),
    });

    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    return expense;
  }

  async delete(businessId: string, expenseId: string) {
    const result = await expenses().deleteOne({
      _id: new ObjectId(expenseId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Expense not found", 404);
    }

    return {
      message: "Expense deleted successfully",
    };
  }
}

export const expenseService = new ExpenseService();