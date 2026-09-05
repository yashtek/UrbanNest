// import { Hono } from "hono";
// import { authMiddleware } from "../middleware/auth.middleware";
// import { staffDutyController } from "../controller/staffDuty.controller";

// const staffDutyRoutes = new Hono();

// staffDutyRoutes.post("/:businessId/staff-duties", authMiddleware, (c) => staffDutyController.create(c));
// staffDutyRoutes.get("/:businessId/staff-duties", authMiddleware, (c) => staffDutyController.getAll(c));
// staffDutyRoutes.get("/:businessId/staff-duties/:staffDutyId", authMiddleware, (c) => staffDutyController.getById(c));
// staffDutyRoutes.patch("/:businessId/staff-duties/:staffDutyId", authMiddleware, (c) => staffDutyController.update(c));
// staffDutyRoutes.delete("/:businessId/staff-duties/:staffDutyId", authMiddleware, (c) => staffDutyController.delete(c));

// export default staffDutyRoutes;