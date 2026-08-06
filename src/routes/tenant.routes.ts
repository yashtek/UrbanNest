import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { tenantController } from "../controller/tenant.controller";

const tenantRoutes = new Hono();

tenantRoutes.post("/:businessId/tenants", authMiddleware, (c) => tenantController.create(c));
// Room-scoped tenant listing.
tenantRoutes.get("/:businessId/rooms/:roomId/tenants", authMiddleware, (c) => tenantController.getAll(c));
tenantRoutes.get("/:businessId/tenants/:tenantId", authMiddleware, (c) => tenantController.getById(c));
tenantRoutes.patch("/:businessId/tenants/:tenantId", authMiddleware, (c) => tenantController.update(c));
tenantRoutes.delete("/:businessId/tenants/:tenantId", authMiddleware, (c) => tenantController.delete(c));

export default tenantRoutes;
