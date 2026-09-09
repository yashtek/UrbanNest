import { beforeEach, expect, mock, test } from "bun:test";
import { ObjectId } from "mongodb";
const businessId = new ObjectId().toHexString();
const staffId = new ObjectId().toHexString();
let rows: any[] = [];
let staffExists = true;
const matches = (row: any, filter: any): boolean => Object.entries(filter).every(([key, value]: any) => {
  if (value && typeof value === "object" && "$exists" in value) return (row[key] !== undefined) === value.$exists;
  if (value && typeof value === "object" && !(value instanceof ObjectId))
    return (!value.$gte || row[key] >= value.$gte) && (!value.$lte || row[key] <= value.$lte);
  return String(row[key]) === String(value);
});
mock.module("../modals/business.modal", () => ({ businesses: () => ({ findOne: async (filter: any) => filter.owner_id === "owner" && String(filter._id) === businessId ? {} : null }) }));
mock.module("../modals/staff.modal", () => ({ staffs: () => ({ findOne: async (filter: any) => staffExists && String(filter._id) === staffId && String(filter.businessId) === businessId ? {} : null }) }));
mock.module("../modals/staffAttendance.modal", () => ({ staffAttendance: () => ({
  findOne: async (filter: any) => { const row = rows.find(r => matches(r, filter)); return row ? { ...row } : null; },
  findOneAndUpdate: async (filter: any, update: any) => {
    const row = rows.find(r => matches(r, filter));
    if (!row) return null;
    Object.assign(row, update.$set);
    row.revision = (row.revision ?? 0) + update.$inc.revision;
    (row.changes ??= []).push(update.$push.changes);
    return { ...row };
  },
  insertOne: async (row: any) => {
    if (rows.some(r => !r.isDeleted && String(r.staffId) === String(row.staffId) && r.date === row.date)) throw { code: 11000 };
    rows.push(row);
  },
  updateOne: async (filter: any, update: any) => {
    const row = rows.find(r => matches(r, filter));
    if (!row) return { matchedCount: 0 };
    Object.assign(row, update.$set); return { matchedCount: 1 };
  },
  countDocuments: async (filter: any) => rows.filter(r => matches(r, filter)).length,
  find: (filter: any) => {
    let skip = 0, limit = 10;
    const cursor = { sort: () => cursor, skip: (v: number) => { skip = v; return cursor; }, limit: (v: number) => { limit = v; return cursor; }, toArray: async () => rows.filter(r => matches(r, filter)).slice(skip, skip + limit) };
    return cursor;
  },
}) }));
const { staffAttendanceService: service, attendanceToday, attendanceDate } = await import("./staffAttendance.service");
beforeEach(() => { rows = []; staffExists = true; });
test("India date rolls over at 18:30 UTC and invalid dates are rejected", () => {
  expect(attendanceToday(new Date("2026-09-08T18:29:59Z"))).toBe("2026-09-08");
  expect(attendanceToday(new Date("2026-09-08T18:30:00Z"))).toBe("2026-09-09");
  expect(attendanceDate.safeParse("2026-02-30").success).toBe(false);
  expect(attendanceDate.safeParse("2024-02-29").success).toBe(true);
});
test("today and backdated entries preserve the actual server timestamp", async () => {
  const now = Date.now();
  const today = await service.mark(businessId, staffId, "owner", { status: "PRESENT" });
  expect(today.date).toBe(attendanceToday());
  const old = await service.mark(businessId, staffId, "owner", { status: "ABSENT", date: "2020-01-01" });
  expect(old.markedAt.getTime()).toBeGreaterThanOrEqual(now);
  expect(old.markedBy).toBe("owner");
  await expect(service.mark(businessId, staffId, "owner", { status: "PRESENT", date: "9999-01-01" })).rejects.toMatchObject({ statusCode: 400 });
});
test("duplicate marking conflicts; deleting allows correction and retains audit", async () => {
  const row = await service.mark(businessId, staffId, "owner", { status: "PRESENT" });
  await expect(service.mark(businessId, staffId, "owner", { status: "ABSENT" })).rejects.toMatchObject({ statusCode: 409 });
  await service.delete(businessId, String(row._id), "owner");
  expect(row.deletedBy).toBe("owner");
  expect(row.deletedAt).toBeInstanceOf(Date);
  await service.mark(businessId, staffId, "owner", { status: "ABSENT" });
  const result = await service.list(businessId, "owner", {});
  expect(result.pagination.total).toBe(1);
  expect(result.data[0]!.status).toBe("ABSENT");
  await expect(service.delete(businessId, String(row._id), "owner")).rejects.toMatchObject({ statusCode: 404 });
});
test("another owner cannot mark, list, or delete attendance; missing staff rejected", async () => {
  await expect(service.mark(businessId, staffId, "other", { status: "PRESENT" })).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.list(businessId, "other", {})).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.delete(businessId, String(new ObjectId()), "other")).rejects.toMatchObject({ statusCode: 404 });
  staffExists = false;
  await expect(service.mark(businessId, staffId, "owner", { status: "PRESENT" })).rejects.toMatchObject({ statusCode: 404 });
});
test("history filters counts and pagination and validates date ranges", async () => {
  for (const date of ["2020-01-01", "2020-01-02", "2020-01-03"]) await service.mark(businessId, staffId, "owner", { status: "PRESENT", date });
  const result = await service.list(businessId, "owner", { staffId, status: "PRESENT", from: "2020-01-02", to: "2020-01-03" }, { page: 2, limit: 1 });
  expect(result.data).toHaveLength(1);
  expect(result.pagination).toEqual({ page: 2, limit: 1, total: 2, totalPages: 2 });
  await expect(service.list(businessId, "owner", { from: "2020-01-03", to: "2020-01-01" })).rejects.toThrow();
  await expect(service.list(businessId, "owner", {}, { limit: 101 })).rejects.toMatchObject({ statusCode: 400 });
});

test("correcting past attendance keeps original timestamp and records each change", async () => {
  const row = await service.mark(businessId, staffId, "owner", { status: "ABSENT", date: "2020-01-01" });
  const originalTime = row.markedAt;
  const updated = await service.update(businessId, staffId, String(row._id), "owner", { status: "PRESENT" });
  expect(updated.date).toBe("2020-01-01");
  expect(updated.markedAt).toEqual(originalTime);
  expect(updated.changes![0]).toMatchObject({ from: "ABSENT", to: "PRESENT", changedBy: "owner" });
  await service.update(businessId, staffId, String(row._id), "owner", { status: "PRESENT" });
  expect(row.changes).toHaveLength(1);
  await service.update(businessId, staffId, String(row._id), "owner", { status: "ABSENT" });
  expect(row.changes).toHaveLength(2);
  expect((await service.list(businessId, "owner", { staffId, status: "ABSENT" })).pagination.total).toBe(1);
});
test("updates reject another owner, wrong staff, deleted records, and invalid status", async () => {
  const row = await service.mark(businessId, staffId, "owner", { status: "PRESENT" });
  await expect(service.update(businessId, staffId, String(row._id), "other", { status: "ABSENT" })).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.update(businessId, String(new ObjectId()), String(row._id), "owner", { status: "ABSENT" })).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.update(businessId, staffId, String(row._id), "owner", { status: "WRONG" as any })).rejects.toThrow();
  await service.delete(businessId, String(row._id), "owner");
  await expect(service.update(businessId, staffId, String(row._id), "owner", { status: "ABSENT" })).rejects.toMatchObject({ statusCode: 404 });
});
test("concurrent corrections do not append duplicate audit changes", async () => {
  const row = await service.mark(businessId, staffId, "owner", { status: "PRESENT" });
  const results = await Promise.allSettled([1, 2].map(() => service.update(businessId, staffId, String(row._id), "owner", { status: "ABSENT" })));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(results.filter(r => r.status === "rejected")).toHaveLength(1);
  expect(row.changes).toHaveLength(1);
});
