import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { dashboardService } from "../service/dashboard.service";

class DashboardController {
  async getDashboard(c: Context) {
    try {
      const businessId = c.req.param("businessId");

      if (!businessId) {
        throw new AppError("businessId is required", 400);
      }

      const month = c.req.query("month") ?? undefined;
      const result = await dashboardService.getDashboard(businessId, { month });

      return c.json(result);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }

      throw new AppError("Unable to fetch dashboard data", 400);
    }
  }
}

export const dashboardController = new DashboardController();
