import { Hono } from "hono";
import { connectDB } from "./db/db";
import { errorHandler } from "./middleware/error.middleware";
import authRoutes from "./routes/auth.routes";
import businessRoutes from "./routes/business.routes";
import { ensureUserIndexes } from "./modals/user.modal";
import { ensureBusinessIndexes } from "./modals/business.modal";
import { ensureOtpIndexes } from "./otp/otp.service";
import roomRoute from "./routes/room.routes";
import { ensureRoomIndexes } from "./modals/room.modal";
import tenantRoutes from "./routes/tenant.routes";
import rentRoutes from "./routes/rent.routes";
import ElectricityRoutes from "./routes/electricity.routes";
import staffRoutes from "./routes/staff.routes";
import staffDutyRoutes from "./routes/staffDuty.routes";
import staffExpenseRoutes from "./routes/staffExpense.routes";
import expenseRoutes from "./routes/expense.routes";
import dashboardRoutes from "./routes/dashboard.routes";
const app = new Hono();
await connectDB();
await ensureUserIndexes();
await ensureBusinessIndexes();
await ensureOtpIndexes();
await ensureRoomIndexes();

app.onError(errorHandler);

// all routes
app.route("/auth", authRoutes);
app.route("/business", businessRoutes);
app.route("/business", roomRoute)
app.route("/business", tenantRoutes);
app.route("/business", rentRoutes);
app.route("/business", ElectricityRoutes);
app.route("/business", staffRoutes);
app.route("/business", staffDutyRoutes);
app.route("/business", staffExpenseRoutes);
app.route("/business", expenseRoutes);
app.route("/business", dashboardRoutes);


app.get("/", (c) => {
  return c.json({
    success: true,
    message: "Api running",
  });
});

export default app;
