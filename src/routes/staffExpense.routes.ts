// import { Hono } from "hono";
// import { authMiddleware } from "../middleware/auth.middleware";
// import { staffExpenseController } from "../controller/staffExpense.controller";

// const staffExpenseRoutes = new Hono();

// staffExpenseRoutes.post("/:businessId/staff-expenses", authMiddleware, (c) => staffExpenseController.create(c));
// staffExpenseRoutes.get("/:businessId/staff-expenses", authMiddleware, (c) => staffExpenseController.getAll(c));
// staffExpenseRoutes.get("/:businessId/staff-expenses/:staffExpenseId", authMiddleware, (c) => staffExpenseController.getById(c));
// staffExpenseRoutes.patch("/:businessId/staff-expenses/:staffExpenseId", authMiddleware, (c) => staffExpenseController.update(c));
// staffExpenseRoutes.delete("/:businessId/staff-expenses/:staffExpenseId", authMiddleware, (c) => staffExpenseController.delete(c));

// export default staffExpenseRoutes;