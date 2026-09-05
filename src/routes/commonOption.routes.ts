import { Hono } from "hono";
import { commonOptionController } from "../controller/commonOption.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const routes = new Hono();
routes.get("/options", authMiddleware, (c) => commonOptionController.getAll(c));
routes.post("/options/bulk", authMiddleware, (c) => commonOptionController.createMany(c));
routes.post("/options", authMiddleware, (c) => commonOptionController.create(c));
routes.patch("/options/:optionId", authMiddleware, (c) => commonOptionController.update(c));
routes.delete("/options/:optionId", authMiddleware, (c) => commonOptionController.remove(c));
export default routes;
