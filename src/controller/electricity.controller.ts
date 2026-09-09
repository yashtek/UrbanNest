import { Context } from "hono";
import { ElecService } from "../service/electricity.service";
import { AppError } from "../middleware/error.middleware";

export class elecController {
  async create(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const roomId = c.req.param("roomId");

      if (!businessId || !roomId) {
        throw new AppError("businessId and roomId are required", 400);
      }

      const body = await c.req.json();

      const result = await ElecService.create(businessId, roomId, {
        readingDate: body.readingDate,
        previousReading: body.previousReading,
        currentReading: body.currentReading,
        costPerunit: body.costPerunit,
        amount: body.amount,
      });

      return c.json(result, 201);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Invalid body", 400);
    }
  }

  async update(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const electricityId = c.req.param("electricityId");

      if (!businessId || !electricityId) {
        throw new AppError("businessId and electricityId are required", 400);
      }

      const body = await c.req.json();

      const result = await ElecService.update(businessId, electricityId, {
        readingDate: body.readingDate,
        previousReading: body.previousReading,
        currentReading: body.currentReading,
        costPerunit: body.costPerunit,
      });

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Invalid body", 400);
    }
  }

  async getLatestByRoom(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const roomId = c.req.param("roomId");

      if (!businessId || !roomId) {
        throw new AppError("businessId and roomId are required", 400);
      }

      const result = await ElecService.getLatestByRoom(businessId, roomId);

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to fetch electricity details", 400);
    }
  }

  async getAll(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const roomId = c.req.param("roomId");

      if (!businessId || !roomId) {
        throw new AppError("businessId and roomId are required", 400);
      }

      const result = await ElecService.getAll(businessId, roomId);

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to fetch electricity details", 400);
    }
  }

  async delete(c: Context) {
    try {
      const businessId = c.req.param("businessId");
      const roomId = c.req.param("roomId");
      const electricityId = c.req.param("electricityId");

      if (!businessId || !roomId || !electricityId) {
        throw new AppError(
          "businessId, roomId and electricityId are required",
          400,
        );
      }

      const result = await ElecService.delete(
        businessId,
        roomId,
        electricityId,
      );

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to delete electricity details", 400);
    }
  }
}
