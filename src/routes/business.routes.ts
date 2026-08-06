
import { Hono } from "hono";
import { businessController } from "../controller/business.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const businessRoute = new Hono();

businessRoute.post("/", authMiddleware, (c) => businessController.create(c));
businessRoute.get("/", authMiddleware,(c) => businessController.getAll(c));
businessRoute.put("/:id", authMiddleware,(c) => businessController.update(c));
businessRoute.delete("/:id",authMiddleware, (c) => businessController.delete(c));

export default businessRoute;