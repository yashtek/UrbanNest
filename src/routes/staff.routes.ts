import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { staffController } from "../controller/staff.controller";

const staffRoutes = new Hono();

staffRoutes.post("/:businessId/staffs", authMiddleware, (c) => staffController.create(c));
staffRoutes.get("/:businessId/staffs", authMiddleware, (c) => staffController.getAll(c));
staffRoutes.get("/:businessId/staffs/:staffId", authMiddleware, (c) => staffController.getById(c));
staffRoutes.patch("/:businessId/staffs/:staffId", authMiddleware, (c) => staffController.update(c));
staffRoutes.delete("/:businessId/staffs/:staffId", authMiddleware, (c) => staffController.delete(c));

export default staffRoutes;