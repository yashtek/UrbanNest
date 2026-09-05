import { Filter, ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { expenses, type IExpense } from "../modals/miscExpense.modal";
import { commonOptionService } from "./commonOption.service";

export interface CreateExpenseDto {
  category: string;
  amount: number;
  description: string;
  date: string | Date;
}

export interface UpdateExpenseDto {
  category?: string;
  amount?: number;
  description?: string;
  date?: string | Date;
}

export interface ExpenseFilters {
  date?: string;
  month?: string;
  category?: string;
}

class ExpenseService {
  async create(businessId: string, data: CreateExpenseDto) {
    const category = await commonOptionService.require(data.category, "EXPENSE_CATEGORY");

    const payload: IExpense = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      category,
      amount: data.amount,
      description: data.description,
      date: new Date(data.date),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await expenses().insertOne(payload);

    return (await commonOptionService.populate([payload], ["category"]))[0];
  }

  async getAll(businessId: string, filters: ExpenseFilters = {}) {
    const query: Filter<IExpense> = {
      businessId: new ObjectId(businessId),
    };

    if (filters.category !== undefined) {
      query.category = await commonOptionService.require(filters.category, "EXPENSE_CATEGORY");
    }

    if (filters.date) {
      const start = new Date(`${filters.date}T00:00:00.000Z`);
      const end = new Date(start);
      end.setUTCDate(end.getUTCDate() + 1);
      query.date = { $gte: start, $lt: end };
    } else if (filters.month) {
      const [year, month] = filters.month.split("-").map(Number);
      const start = new Date(Date.UTC(year, month - 1, 1));
      const end = new Date(Date.UTC(year, month, 1));
      query.date = { $gte: start, $lt: end };
    }

    const rows = await expenses()
      .find(query)
      .sort({ date: -1, createdAt: -1 })
      .toArray();
    return commonOptionService.populate(rows, ["category"]);
  }

  async getById(businessId: string, expenseId: string) {
    const expense = await expenses().findOne({
      _id: new ObjectId(expenseId),
      businessId: new ObjectId(businessId),
    });

    if (!expense) {
      throw new AppError("Expense not found", 404);
    }

    return (await commonOptionService.populate([expense], ["category"]))[0];
  }

  async update(businessId: string, expenseId: string, data: UpdateExpenseDto) {
    const updateFields: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (data.category !== undefined) {
      updateFields.category = await commonOptionService.require(data.category, "EXPENSE_CATEGORY");
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

    return (await commonOptionService.populate([expense], ["category"]))[0];
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
