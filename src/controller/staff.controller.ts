import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { staffService } from "../service/staff.service";
import { ROLE } from "../modals/staff.modal";

class StaffController {
  async create(c: Context) {
    try {
      const businessId = c.req.param("businessId");

      if (!businessId) {
        throw new AppError("businessId is required", 400);
      }

      const body = await c.req.json();

      if (typeof body?.name !== "string" || !body.name.trim()) {
        throw new AppError("name is required", 400);
      }

      if (typeof body?.phone !== "string" || !body.phone.trim()) {
        throw new AppError("phone is required", 400);
      }

      if (typeof body?.role !== "string" || !ROLE.includes(body.role)) {
        throw new AppError("role is invalid", 400);
      }

      if (typeof body?.salary !== "number") {
        throw new AppError("salary is required", 400);
      }

      if (typeof body?.joiningDate !== "string" && !(body.joiningDate instanceof Date)) {
        throw new AppError("joiningDate is required", 400);
      }

      if (typeof body?.isActive !== "boolean") {
        throw new AppError("isActive is required", 400);
      }

      const result = await staffService.create(businessId, {
        name: body.name,
        phone: body.phone,
        role: body.role,
        salary: body.salary,
        joiningDate: body.joiningDate,
        isActive: body.isActive,
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

    const result = await staffService.getAll(businessId);

    return c.json(result);
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const staffId = c.req.param("staffId");

    if (!businessId || !staffId) {
      throw new AppError("businessId and staffId are required", 400);
    }

    const result = await staffService.getById(businessId, staffId);

    return c.json(result);
  }

  async update(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const staffId = c.req.param("staffId");

      if (!businessId || !staffId) {
        throw new AppError("businessId and staffId are required", 400);
      }

      const body = await c.req.json();

      if (body?.role !== undefined && typeof body.role !== "string") {
        throw new AppError("role must be a string", 400);
      }

      if (body?.joiningDate !== undefined && typeof body.joiningDate !== "string" && !(body.joiningDate instanceof Date)) {
        throw new AppError("joiningDate must be a string", 400);
      }

      if (body?.isActive !== undefined && typeof body.isActive !== "boolean") {
        throw new AppError("isActive must be a boolean", 400);
      }

      const result = await staffService.update(businessId, staffId, body);

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
    const staffId = c.req.param("staffId");

    if (!businessId || !staffId) {
      throw new AppError("businessId and staffId are required", 400);
    }

    const result = await staffService.delete(businessId, staffId);

    return c.json(result);
  }
}

export const staffController = new StaffController();