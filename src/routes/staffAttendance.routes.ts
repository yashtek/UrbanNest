import { Hono } from "hono";
import { authMiddleware } from "../middleware/auth.middleware";
import { AppError } from "../middleware/error.middleware";
import {
  staffAttendanceService,
  attendanceFilterSchema,
  markAttendanceSchema,
  updateAttendanceSchema,
} from "../service/staffAttendance.service";
import { parsePagination } from "../utils/pagination";

const routes = new Hono();
routes.get(
  "/:businessId/staffs/:staffId/attendance",
  authMiddleware,
  async (c) => {
    return c.json(
      await staffAttendanceService.list(
        c.req.param("businessId"),
        c.get("user").userId,
        attendanceFilterSchema.parse({
          staffId: c.req.param("staffId"),
          status: c.req.query("status"),
          date: c.req.query("date"),
          from: c.req.query("from"),
          to: c.req.query("to"),
        }),
        parsePagination(c.req.query("page"), c.req.query("limit")),
      ),
    );
  },
);
routes.patch(
  "/:businessId/staffs/:staffId/attendance/:attendanceId",
  authMiddleware,
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new AppError("Invalid JSON body", 400);
    }
    return c.json(
      await staffAttendanceService.update(
        c.req.param("businessId"),
        c.req.param("staffId"),
        c.req.param("attendanceId"),
        c.get("user").userId,
        updateAttendanceSchema.parse(body),
      ),
    );
  },
);
routes.post(
  "/:businessId/staffs/:staffId/attendance",
  authMiddleware,
  async (c) => {
    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new AppError("Invalid JSON body", 400);
    }
    return c.json(
      await staffAttendanceService.mark(
        c.req.param("businessId"),
        c.req.param("staffId"),
        c.get("user").userId,
        markAttendanceSchema.parse(body),
      ),
      201,
    );
  },
);
routes.get("/:businessId/staff-attendance", authMiddleware, async (c) => {
  return c.json(
    await staffAttendanceService.list(
      c.req.param("businessId"),
      c.get("user").userId,
      attendanceFilterSchema.parse({
        staffId: c.req.query("staffId"),
        status: c.req.query("status"),
        date: c.req.query("date"),
        from: c.req.query("from"),
        to: c.req.query("to"),
      }),
      parsePagination(c.req.query("page"), c.req.query("limit")),
    ),
  );
});
routes.delete(
  "/:businessId/staff-attendance/:attendanceId",
  authMiddleware,
  async (c) => {
    return c.json(
      await staffAttendanceService.delete(
        c.req.param("businessId"),
        c.req.param("attendanceId"),
        c.get("user").userId,
      ),
    );
  },
);
export default routes;
