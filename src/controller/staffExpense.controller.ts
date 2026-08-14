import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { staffExpenseService } from "../service/staffExpense.service";

class StaffExpenseController {
  async create(c: Context) {
    try {
      const businessId = c.req.param("businessId");

      if (!businessId) {
        throw new AppError("businessId is required", 400);
      }

      const body = await c.req.json();

      if (typeof body?.staffId !== "string" || !body.staffId.trim()) {
        throw new AppError("staffId is required", 400);
      }

      if (typeof body?.month !== "string" || !body.month.trim()) {
        throw new AppError("month is required", 400);
      }

      if (typeof body?.salary !== "number") {
        throw new AppError("salary is required", 400);
      }

      if (typeof body?.bonus !== "number") {
        throw new AppError("bonus is required", 400);
      }

      if (typeof body?.advance !== "number") {
        throw new AppError("advance is required", 400);
      }

      const result = await staffExpenseService.create(businessId, {
        staffId: body.staffId,
        month: body.month,
        salary: body.salary,
        bonus: body.bonus,
        advance: body.advance,
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

    const result = await staffExpenseService.getAll(businessId);

    return c.json(result);
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const staffExpenseId = c.req.param("staffExpenseId");

    if (!businessId || !staffExpenseId) {
      throw new AppError("businessId and staffExpenseId are required", 400);
    }

    const result = await staffExpenseService.getById(businessId, staffExpenseId);

    return c.json(result);
  }

  async update(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const staffExpenseId = c.req.param("staffExpenseId");

      if (!businessId || !staffExpenseId) {
        throw new AppError("businessId and staffExpenseId are required", 400);
      }

      const body = await c.req.json();

      if (body?.staffId !== undefined && typeof body.staffId !== "string") {
        throw new AppError("staffId must be a string", 400);
      }

      if (body?.month !== undefined && typeof body.month !== "string") {
        throw new AppError("month must be a string", 400);
      }

      if (body?.salary !== undefined && typeof body.salary !== "number") {
        throw new AppError("salary must be a number", 400);
      }

      if (body?.bonus !== undefined && typeof body.bonus !== "number") {
        throw new AppError("bonus must be a number", 400);
      }

      if (body?.advance !== undefined && typeof body.advance !== "number") {
        throw new AppError("advance must be a number", 400);
      }

      const result = await staffExpenseService.update(businessId, staffExpenseId, body);

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
    const staffExpenseId = c.req.param("staffExpenseId");

    if (!businessId || !staffExpenseId) {
      throw new AppError("businessId and staffExpenseId are required", 400);
    }

    const result = await staffExpenseService.delete(businessId, staffExpenseId);

    return c.json(result);
  }
}

export const staffExpenseController = new StaffExpenseController();