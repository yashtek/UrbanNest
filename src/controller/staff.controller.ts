import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { staffService, type UpdateStaffDto } from "../service/staff.service";

const requiredString = (value: unknown, field: string) => {
  if (typeof value !== "string" || !value.trim()) {
    throw new AppError(`${field} is required`, 400);
  }
  return value.trim();
};

const requiredNumber = (value: unknown, field: string) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new AppError(`${field} must be a number`, 400);
  }
  return value;
};

const requiredDate = (value: unknown, field: string) => {
  if (typeof value !== "string" && !(value instanceof Date)) {
    throw new AppError(`${field} is required`, 400);
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`${field} must be a valid date`, 400);
  }
  return date;
};

class StaffController {
  async create(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);

    const body = await c.req.json();
    const result = await staffService.create(businessId, {
      name: requiredString(body.name, "name"),
      phone: requiredString(body.phone, "phone"),
      role: requiredString(body.role, "role"),
      salary: requiredNumber(body.salary, "salary"),
      joiningDate: requiredDate(body.joiningDate, "joiningDate"),
      isActive:
        typeof body.isActive === "boolean"
          ? body.isActive
          : (() => {
              throw new AppError("isActive must be a boolean", 400);
            })(),
      shift: requiredString(body.shift, "shift"),
      date: requiredDate(body.date, "date"),
      status: requiredString(body.status, "status"),
      staffSalary: requiredString(body.staffSalary, "staffSalary"),
    });

    return c.json(result, 201);
  }

  async getAll(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);
    const parsePositiveInteger = (name: string, fallback: number) => {
      const raw = c.req.query(name);
      if (raw === undefined) return fallback;
      const value = Number(raw);
      if (!/^\d+$/.test(raw) || !Number.isSafeInteger(value) || value < 1) {
        throw new AppError(`${name} must be a positive integer`, 400);
      }
      return value;
    };

    return c.json(
      await staffService.getAll(businessId, {
        page: parsePositiveInteger("page", 1),
        limit: parsePositiveInteger("limit", 10),
        staff_role: c.req.query("staff_role")?.trim() || undefined,
      }),
    );
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const staffId = c.req.param("staffId");
    if (!businessId || !staffId) {
      throw new AppError("businessId and staffId are required", 400);
    }
    return c.json(await staffService.getById(businessId, staffId));
  }

  async update(c: Context) {
    const businessId = c.req.param("businessId");
    const staffId = c.req.param("staffId");
    if (!businessId || !staffId) {
      throw new AppError("businessId and staffId are required", 400);
    }

    const body = await c.req.json();
    const data: UpdateStaffDto = {};

    if (body.name !== undefined) data.name = requiredString(body.name, "name");
    if (body.phone !== undefined)
      data.phone = requiredString(body.phone, "phone");
    if (body.role !== undefined) data.role = requiredString(body.role, "role");
    if (body.salary !== undefined)
      data.salary = requiredNumber(body.salary, "salary");
    if (body.joiningDate !== undefined)
      data.joiningDate = requiredDate(body.joiningDate, "joiningDate");
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean")
        throw new AppError("isActive must be a boolean", 400);
      data.isActive = body.isActive;
    }
    if (body.shift !== undefined)
      data.shift = requiredString(body.shift, "shift");
    if (body.date !== undefined) data.date = requiredDate(body.date, "date");
    if (body.status !== undefined)
      data.status = requiredString(body.status, "status");
    if (body.staffSalary !== undefined) {
      data.staffSalary = requiredString(body.staffSalary, "staffSalary");
    }

    return c.json(await staffService.update(businessId, staffId, data));
  }

  async delete(c: Context) {
    const businessId = c.req.param("businessId");
    const staffId = c.req.param("staffId");
    if (!businessId || !staffId) {
      throw new AppError("businessId and staffId are required", 400);
    }
    return c.json(await staffService.delete(businessId, staffId));
  }
}

export const staffController = new StaffController();
