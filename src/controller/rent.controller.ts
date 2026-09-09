import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { RentService } from "../service/rent.service";

export class rentController {
  async createRentDetails(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const tenantId = c.req.param("tenantId");

      if (!businessId || !tenantId) {
        throw new AppError("businessId and tenantId are required", 400);
      }

      const body = await c.req.json();

      const result = await RentService.create(businessId, tenantId, {
        month: body.month,
        amount: body.amount,
        status: body.status,
        paidDate: body.paidDate,
        dueDate: body.dueDate,
      });

      return c.json(result, 201);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Invalid request body", 400);
    }
  }

  //   update rent details
  async updateRentDetails(c: Context) {
    try {
      const rentId = c.req.param("rentId");
      const businessId = c.req.param("businessId");

      if (!businessId || !rentId) {
        throw new AppError("businessId and rentId are required", 400);
      }

      const body = await c.req.json();

      const result = await RentService.update(businessId, rentId, {
        month: body.month,
        amount: body.amount,
        status: body.status,
        paidDate: body.paidDate,
        dueDate: body.dueDate,
      });

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError("Invalid request body", 400);
    }
  }

  async getRentDetails(c: Context) {
    try {
      const rentId = c.req.param("rentId");
      const businessId = c.req.param("businessId");

      if (!businessId || !rentId) {
        throw new AppError("businessId and rentId are required", 400);
      }

      const result = await RentService.getById(businessId, rentId);

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to fetch rent details", 400);
    }
  }

  async deleteRentDetails(c: Context) {
    try {
      const rentId = c.req.param("rentId");
      const businessId = c.req.param("businessId");

      if (!businessId || !rentId) {
        throw new AppError("businessId and rentId are required", 400);
      }

      const result = await RentService.delete(businessId, rentId);

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to delete details", 400);
    }
  }
}
