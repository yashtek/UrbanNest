import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { rentController } from "../controller/rent.controller";

const Rentroutes = new Hono();
const controller = new rentController();

Rentroutes.post("/:businessId/tenants/:tenantId/rents", authMiddleware, (c) => controller.createRentDetails(c));
Rentroutes.patch("/:businessId/rents/:rentId", authMiddleware, (c) => controller.updateRentDetails(c));
Rentroutes.get("/:businessId/rents/:rentId", authMiddleware, (c) => controller.getRentDetails(c));
Rentroutes.delete("/:businessId/rents/:rentId", authMiddleware, (c) => controller.deleteRentDetails(c));

export default Rentroutes;


