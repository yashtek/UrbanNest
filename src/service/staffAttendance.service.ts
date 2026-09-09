import { ObjectId, type Filter } from "mongodb";
import { z } from "zod";
import { AppError } from "../middleware/error.middleware";
import { businesses } from "../modals/business.modal";
import { staffs } from "../modals/staff.modal";
import { staffAttendance, type IStaffAttendance } from "../modals/staffAttendance.modal";
import { getPagination, type PaginationOptions } from "../utils/pagination";

export const attendanceDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD")
  .refine(value => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, "Invalid calendar date");
const status = z.enum(["PRESENT", "ABSENT"]);
export const markAttendanceSchema = z.object({ status, date: attendanceDate.optional() }).strict();
export const updateAttendanceSchema = z.object({ status }).strict();
export const attendanceFilterSchema = z.object({
  staffId: z.string().regex(/^[a-fA-F0-9]{24}$/).optional(),
  status: status.optional(), date: attendanceDate.optional(),
  from: attendanceDate.optional(), to: attendanceDate.optional(),
}).refine(v => !(v.date && (v.from || v.to)), "Use date or from/to, not both")
  .refine(v => !v.from || !v.to || v.from <= v.to, "from must be on or before to");
export const attendanceToday = (now = new Date()) =>
  new Date(now.getTime() + 330 * 60_000).toISOString().slice(0, 10);

function id(value: string) {
  if (!/^[a-fA-F0-9]{24}$/.test(value)) throw new AppError("Invalid resource id", 400);
  return new ObjectId(value);
}
async function ownedBusiness(businessId: string, userId: string) {
  const _id = id(businessId);
  if (!await businesses().findOne({ _id, owner_id: userId })) throw new AppError("Business not found", 404);
  return _id;
}

export const staffAttendanceService = {
  async mark(businessId: string, staffId: string, userId: string, input: z.infer<typeof markAttendanceSchema>) {
    const data = markAttendanceSchema.parse(input);
    const businessObjectId = await ownedBusiness(businessId, userId);
    const staffObjectId = id(staffId);
    if (!await staffs().findOne({ _id: staffObjectId, businessId: businessObjectId })) {
      throw new AppError("Staff not found", 404);
    }
    const now = new Date();
    const date = data.date ?? attendanceToday(now);
    if (date > attendanceToday(now)) throw new AppError("Future attendance cannot be marked", 400);
    const record: IStaffAttendance = {
      _id: new ObjectId(), businessId: businessObjectId, staffId: staffObjectId,
      date, timezone: "Asia/Kolkata", status: data.status,
      markedAt: now, markedBy: userId, isDeleted: false,
    };
    try {
      await staffAttendance().insertOne(record);
    } catch (error: any) {
      if (error?.code === 11000) throw new AppError("Attendance already exists for this staff and date. Delete the mistaken record before marking again.", 409);
      throw error;
    }
    return record;
  },
  async list(businessId: string, userId: string, input: z.infer<typeof attendanceFilterSchema>, options: PaginationOptions = {}) {
    const data = attendanceFilterSchema.parse(input);
    const { page, limit, skip } = getPagination(options);
    const filter: Filter<IStaffAttendance> = { businessId: await ownedBusiness(businessId, userId), isDeleted: false };
    if (data.staffId) filter.staffId = id(data.staffId);
    if (data.status) filter.status = data.status;
    if (data.date) filter.date = data.date;
    else if (data.from || data.to) filter.date = { ...(data.from ? { $gte: data.from } : {}), ...(data.to ? { $lte: data.to } : {}) };
    const [rows, total] = await Promise.all([
      staffAttendance().find(filter).sort({ date: -1, _id: -1 }).skip(skip).limit(limit).toArray(),
      staffAttendance().countDocuments(filter),
    ]);
    return { data: rows, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },
  async delete(businessId: string, attendanceId: string, userId: string) {
    const businessObjectId = await ownedBusiness(businessId, userId);
    const result = await staffAttendance().updateOne(
      { _id: id(attendanceId), businessId: businessObjectId, isDeleted: false },
      { $set: { isDeleted: true, deletedAt: new Date(), deletedBy: userId } },
    );
    if (!result.matchedCount) throw new AppError("Attendance not found", 404);
    return { message: "Attendance deleted successfully" };
  },
  async update(businessId: string, staffId: string, attendanceId: string, userId: string, input: z.infer<typeof updateAttendanceSchema>) {
    const data = updateAttendanceSchema.parse(input);
    const filter = { businessId: await ownedBusiness(businessId, userId), staffId: id(staffId), _id: id(attendanceId), isDeleted: false };
    const current = await staffAttendance().findOne(filter);
    if (!current) throw new AppError("Attendance not found", 404);
    if (current.status === data.status) return current;
    const now = new Date();
    const updated = await staffAttendance().findOneAndUpdate(
      { ...filter, revision: current.revision ?? { $exists: false } },
      {
        $set: { status: data.status, updatedAt: now, updatedBy: userId },
        $inc: { revision: 1 },
        $push: { changes: { from: current.status, to: data.status, changedAt: now, changedBy: userId } },
      },
      { returnDocument: "after" },
    );
    if (!updated) throw new AppError("Attendance changed or was deleted. Refresh the record and try again.", 409);
    return updated;
  },
};
