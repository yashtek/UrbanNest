import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { STAFF_DUTY_STATUS, STAFF_SHIFTS } from "../modals/staffDuty.modal";
import { staffDutyService } from "../service/staffDuty.service";

class StaffDutyController {
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

      if (typeof body?.shift !== "string" || !STAFF_SHIFTS.includes(body.shift)) {
        throw new AppError("shift is invalid", 400);
      }

      if (typeof body?.date !== "string" && !(body.date instanceof Date)) {
        throw new AppError("date is required", 400);
      }

      if (typeof body?.status !== "string" || !STAFF_DUTY_STATUS.includes(body.status)) {
        throw new AppError("status is invalid", 400);
      }

      const result = await staffDutyService.create(businessId, {
        staffId: body.staffId,
        shift: body.shift,
        date: body.date,
        status: body.status,
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

    const result = await staffDutyService.getAll(businessId);

    return c.json(result);
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const staffDutyId = c.req.param("staffDutyId");

    if (!businessId || !staffDutyId) {
      throw new AppError("businessId and staffDutyId are required", 400);
    }

    const result = await staffDutyService.getById(businessId, staffDutyId);

    return c.json(result);
  }

  async update(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const staffDutyId = c.req.param("staffDutyId");

      if (!businessId || !staffDutyId) {
        throw new AppError("businessId and staffDutyId are required", 400);
      }

      const body = await c.req.json();

      if (body?.shift !== undefined && typeof body.shift !== "string") {
        throw new AppError("shift must be a string", 400);
      }

      if (body?.date !== undefined && typeof body.date !== "string" && !(body.date instanceof Date)) {
        throw new AppError("date must be a string", 400);
      }

      if (body?.status !== undefined && typeof body.status !== "string") {
        throw new AppError("status must be a string", 400);
      }

      const result = await staffDutyService.update(businessId, staffDutyId, body);

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
    const staffDutyId = c.req.param("staffDutyId");

    if (!businessId || !staffDutyId) {
      throw new AppError("businessId and staffDutyId are required", 400);
    }

    const result = await staffDutyService.delete(businessId, staffDutyId);

    return c.json(result);
  }
}

export const staffDutyController = new StaffDutyController();