import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { expenseController } from "../controller/expense.controller";

const expenseRoutes = new Hono();

expenseRoutes.post("/:businessId/expenses", authMiddleware, (c) => expenseController.create(c));
expenseRoutes.get("/:businessId/expenses", authMiddleware, (c) => expenseController.getAll(c));
expenseRoutes.get("/:businessId/expenses/:expenseId", authMiddleware, (c) => expenseController.getById(c));
expenseRoutes.patch("/:businessId/expenses/:expenseId", authMiddleware, (c) => expenseController.update(c));
expenseRoutes.delete("/:businessId/expenses/:expenseId", authMiddleware, (c) => expenseController.delete(c));

export default expenseRoutes;