import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import {
  ROLE,
  STAFF_DUTY_STATUS,
  STAFF_SALARY,
  STAFF_SHIFTS,
  type STAFFROLE,
  type StaffDutyStatus,
  type StaffSalary,
  type StaffShift,
} from "../modals/staff.modal";
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

const validateEnum = <T extends string>(
  value: unknown,
  values: readonly T[],
  field: string,
): T => {
  if (typeof value !== "string" || !values.includes(value as T)) {
    throw new AppError(`${field} is invalid`, 400);
  }
  return value as T;
};

class StaffController {
  async create(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);

    const body = await c.req.json();
    const result = await staffService.create(businessId, {
      name: requiredString(body.name, "name"),
      phone: requiredString(body.phone, "phone"),
      role: validateEnum<STAFFROLE>(body.role, ROLE, "role"),
      salary: requiredNumber(body.salary, "salary"),
      joiningDate: requiredDate(body.joiningDate, "joiningDate"),
      isActive:
        typeof body.isActive === "boolean"
          ? body.isActive
          : (() => { throw new AppError("isActive must be a boolean", 400); })(),
      shift: validateEnum<StaffShift>(body.shift, STAFF_SHIFTS, "shift"),
      date: requiredDate(body.date, "date"),
      status: validateEnum<StaffDutyStatus>(body.status, STAFF_DUTY_STATUS, "status"),
      staffSalary: validateEnum<StaffSalary>(body.staffSalary, STAFF_SALARY, "staffSalary"),
    });

    return c.json(result, 201);
  }

  async getAll(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);
    return c.json(await staffService.getAll(businessId));
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
    if (body.phone !== undefined) data.phone = requiredString(body.phone, "phone");
    if (body.role !== undefined) data.role = validateEnum(body.role, ROLE, "role");
    if (body.salary !== undefined) data.salary = requiredNumber(body.salary, "salary");
    if (body.joiningDate !== undefined) data.joiningDate = requiredDate(body.joiningDate, "joiningDate");
    if (body.isActive !== undefined) {
      if (typeof body.isActive !== "boolean") throw new AppError("isActive must be a boolean", 400);
      data.isActive = body.isActive;
    }
    if (body.shift !== undefined) data.shift = validateEnum(body.shift, STAFF_SHIFTS, "shift");
    if (body.date !== undefined) data.date = requiredDate(body.date, "date");
    if (body.status !== undefined) data.status = validateEnum(body.status, STAFF_DUTY_STATUS, "status");
    if (body.staffSalary !== undefined) {
      data.staffSalary = validateEnum(body.staffSalary, STAFF_SALARY, "staffSalary");
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
