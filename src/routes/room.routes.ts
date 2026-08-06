// routes/room.route.ts

import { Hono } from "hono";
import { roomController } from "../controller/room.controller";
import { authMiddleware } from "../middleware/auth.middleware";
const roomRoute = new Hono();

roomRoute.post(
  "/:businessId/rooms", authMiddleware,
  (c) => roomController.create(c),
);

roomRoute.get(
  "/:businessId/rooms", authMiddleware,
  (c) => roomController.getAll(c),
);

roomRoute.patch(
  "/:businessId/rooms/:roomId", authMiddleware,
  (c) => roomController.update(c),
);

roomRoute.post(
  "/:businessId/rooms/:roomId/images", authMiddleware,
  (c) => roomController.addImages(c),
);

roomRoute.delete(
  "/:businessId/rooms/:roomId", authMiddleware,
  (c) => roomController.delete(c),
);

roomRoute.delete(
  "/:businessId/rooms/:roomId/images", authMiddleware,
  (c) => roomController.deleteImage(c),
);

export default roomRoute;