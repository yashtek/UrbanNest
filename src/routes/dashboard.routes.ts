import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { dashboardController } from "../controller/dahboard.controller";

const dashboardRoutes = new Hono();

dashboardRoutes.get("/:businessId/dashboard", authMiddleware, (c) => dashboardController.getDashboard(c));

export default dashboardRoutes;
