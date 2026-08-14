import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { EXPENSE_CATEGORIES } from "../modals/miscExpense.modal";
import { expenseService } from "../service/expense.service";

class ExpenseController {
  async create(c: Context) {
    try {
      const businessId = c.req.param("businessId");

      if (!businessId) {
        throw new AppError("businessId is required", 400);
      }

      const body = await c.req.json();

      if (typeof body?.category !== "string" || !EXPENSE_CATEGORIES.includes(body.category)) {
        throw new AppError("category is invalid", 400);
      }

      if (typeof body?.amount !== "number") {
        throw new AppError("amount is required", 400);
      }

      if (typeof body?.description !== "string" || !body.description.trim()) {
        throw new AppError("description is required", 400);
      }

      if (typeof body?.date !== "string" && !(body.date instanceof Date)) {
        throw new AppError("date is required", 400);
      }

      const result = await expenseService.create(businessId, {
        category: body.category,
        amount: body.amount,
        description: body.description,
        date: body.date,
      });

      return c.json(result, 201);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Invalid request body", 400);
    }
  }

  async getAll(c: Context) {
    const businessId = c.req.param("businessId");

    if (!businessId) {
      throw new AppError("businessId is required", 400);
    }

    const result = await expenseService.getAll(businessId);

    return c.json(result);
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const expenseId = c.req.param("expenseId");

    if (!businessId || !expenseId) {
      throw new AppError("businessId and expenseId are required", 400);
    }

    const result = await expenseService.getById(businessId, expenseId);

    return c.json(result);
  }

  async update(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const expenseId = c.req.param("expenseId");

      if (!businessId || !expenseId) {
        throw new AppError("businessId and expenseId are required", 400);
      }

      const body = await c.req.json();

      if (body?.category !== undefined && typeof body.category !== "string") {
        throw new AppError("category must be a string", 400);
      }

      if (body?.amount !== undefined && typeof body.amount !== "number") {
        throw new AppError("amount must be a number", 400);
      }

      if (body?.description !== undefined && typeof body.description !== "string") {
        throw new AppError("description must be a string", 400);
      }

      if (body?.date !== undefined && typeof body.date !== "string" && !(body.date instanceof Date)) {
        throw new AppError("date must be a string", 400);
      }

      const result = await expenseService.update(businessId, expenseId, body);

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Invalid request body", 400);
    }
  }

  async delete(c: Context) {
    const businessId = c.req.param("businessId");
    const expenseId = c.req.param("expenseId");

    if (!businessId || !expenseId) {
      throw new AppError("businessId and expenseId are required", 400);
    }

    const result = await expenseService.delete(businessId, expenseId);

    return c.json(result);
  }
}

export const expenseController = new ExpenseController();