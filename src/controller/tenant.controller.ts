import { Context } from "hono";
import { parsePagination } from "../utils/pagination";
import { AppError } from "../middleware/error.middleware";
import { tenantService, type updateTenant } from "../service/tenant.service";

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

class TenantController {
  async create(c: Context) {
    const businessId = c.req.param("businessId");
    if (!businessId) throw new AppError("businessId is required", 400);

    const body = await c.req.json();
    const result = await tenantService.create(businessId, {
      roomId: requiredString(body.roomId, "roomId"),
      name: requiredString(body.name, "name"),
      phone: requiredString(body.phone, "phone"),
      aadhaar: requiredString(body.aadhaar, "aadhaar"),
      joiningDate: requiredDate(body.joiningDate, "joiningDate"),
      leavingDate:
        body.leavingDate === undefined
          ? undefined
          : requiredDate(body.leavingDate, "leavingDate"),
      rent: requiredNumber(body.rent, "rent"),
      securityDeposit: requiredNumber(body.securityDeposit, "securityDeposit"),
      month: requiredString(body.month, "month"),
      amount: requiredNumber(body.amount, "amount"),
      paidDate:
        body.paidDate === undefined
          ? undefined
          : requiredDate(body.paidDate, "paidDate"),
      dueDate: requiredDate(body.dueDate, "dueDate"),
      status: requiredString(body.status, "status"),
    });

    return c.json(result, 201);
  }

  async update(c: Context) {
    const businessId = c.req.param("businessId");
    const tenantId = c.req.param("tenantId");
    if (!businessId || !tenantId) {
      throw new AppError("businessId and tenantId are required", 400);
    }

    const body = await c.req.json();
    const data: updateTenant = {};

    if (body.name !== undefined) data.name = requiredString(body.name, "name");
    if (body.phone !== undefined) data.phone = requiredString(body.phone, "phone");
    if (body.aadhaar !== undefined) data.aadhaar = requiredString(body.aadhaar, "aadhaar");
    if (body.joiningDate !== undefined) data.joiningDate = requiredDate(body.joiningDate, "joiningDate");
    if (body.leavingDate !== undefined) {
      data.leavingDate = body.leavingDate === null ? null : requiredDate(body.leavingDate, "leavingDate");
    }
    if (body.rent !== undefined) data.rent = requiredNumber(body.rent, "rent");
    if (body.securityDeposit !== undefined) {
      data.securityDeposit = requiredNumber(body.securityDeposit, "securityDeposit");
    }
    if (body.month !== undefined) data.month = requiredString(body.month, "month");
    if (body.amount !== undefined) data.amount = requiredNumber(body.amount, "amount");
    if (body.paidDate !== undefined) {
      data.paidDate = body.paidDate === null ? null : requiredDate(body.paidDate, "paidDate");
    }
    if (body.dueDate !== undefined) data.dueDate = requiredDate(body.dueDate, "dueDate");
    if (body.status !== undefined) data.status = requiredString(body.status, "status");

    return c.json(await tenantService.update(businessId, tenantId, data));
  }

  async getAll(c: Context) {
    const businessId = c.req.param("businessId");
    const roomId = c.req.param("roomId");
    if (!businessId || !roomId) {
      throw new AppError("businessId and roomId are required", 400);
    }
    return c.json(await tenantService.getAll(businessId, roomId, parsePagination(c.req.query("page"), c.req.query("limit"))));
  }

  async getById(c: Context) {
    const businessId = c.req.param("businessId");
    const tenantId = c.req.param("tenantId");
    if (!businessId || !tenantId) {
      throw new AppError("businessId and tenantId are required", 400);
    }
    return c.json(await tenantService.getById(businessId, tenantId));
  }

  async delete(c: Context) {
    const businessId = c.req.param("businessId");
    const tenantId = c.req.param("tenantId");
    if (!businessId || !tenantId) {
      throw new AppError("businessId and tenantId are required", 400);
    }
    return c.json(await tenantService.delete(businessId, tenantId));
  }
}

export const tenantController = new TenantController();
