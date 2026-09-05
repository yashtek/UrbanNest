// import { Hono } from "hono";

// import { authMiddleware } from "../middleware/auth.middleware";
// import { elecController } from "../controller/electricity.controller";

// const ElectricityRoutes = new Hono();

// const controller = new elecController();

// // Create electricity reading for a room
// ElectricityRoutes.post(
//   "/:businessId/rooms/:roomId/electricity",
//   authMiddleware,
//   (c) => controller.create(c)
// );

// // Update a particular electricity record
// ElectricityRoutes.patch(
//   "/:businessId/rooms/:roomId/electricity/:electricityId",
//   authMiddleware,
//   (c) => controller.update(c)
// );

// // Get latest electricity reading for a room
// ElectricityRoutes.get(
//   "/:businessId/rooms/:roomId/electricity/latest",
//   authMiddleware,
//   (c) => controller.getLatestByRoom(c)
// );

// // Get all electricity records for a room
// ElectricityRoutes.get(
//   "/:businessId/rooms/:roomId/electricity",
//   authMiddleware,
//   (c) => controller.getAll(c)
// );

// // Delete a particular electricity record
// ElectricityRoutes.delete(
//   "/:businessId/rooms/:roomId/electricity/:electricityId",
//   authMiddleware,
//   (c) => controller.delete(c)
// );

// export default ElectricityRoutes;