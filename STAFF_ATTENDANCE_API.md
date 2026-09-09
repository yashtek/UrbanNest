# Staff attendance API

All endpoints require `Authorization: Bearer <accessToken>` and ownership of the business.
Base URL: `https://urbannest-pv5v.onrender.com` after deployment.

## Mark attendance

`POST /business/:businessId/staffs/:staffId/attendance`

Today: `{ "status": "PRESENT" }` or `{ "status": "ABSENT" }`.
Previous day: `{ "status": "PRESENT", "date": "2026-09-08" }`.

Returns 201 with `_id`, `businessId`, `staffId`, `date`, `timezone`, `status`,
`markedAt`, `markedBy`, and `isDeleted: false`.
Dates use Asia/Kolkata (India). `markedAt` is the actual server UTC timestamp,
including for backdated records; it is not an inferred arrival time.
The body accepts only status and optional date. Valid statuses are PRESENT and ABSENT.
Invalid dates and future dates are rejected. Missing records mean unmarked, not absent.
One active record per staff per date is enforced by a unique database index;
duplicate submissions return 409 rather than overwriting the original timestamp.

## History

`GET /business/:businessId/staff-attendance?page=1&limit=10`

Optional filters: `staffId`, `status`, `date`, or inclusive `from` / `to`.
Example: `?staffId=<id>&status=PRESENT&from=2026-09-01&to=2026-09-09&page=1&limit=10`.
Do not combine date with from/to. Results sort by date descending then ID descending.
Returns `{ "data": [...], "pagination": { "page": 1, "limit": 10, "total": 25, "totalPages": 3 } }`.
Default limit is 10; maximum is 100. Pages outside the results return an empty data array.

## Delete a mistake

`DELETE /business/:businessId/staff-attendance/:attendanceId`

Returns `{ "message": "Attendance deleted successfully" }`.
Deleted records are excluded from history and can be marked again using POST.
Audit storage retains the original entry with deletedAt/deletedBy; repeated deletion returns 404.
Attendance audit records are retained if the staff is later deleted.

## Deployment and verification

Deploy the updated backend. Startup creates attendance indexes before serving requests.
This uses a new staffAttendance collection; old staffDuties records are not migrated.
TypeScript and mocked service tests cover authorization, date boundaries, duplicates,
corrections, and paginated filters. A real MongoDB concurrency test and live deployment
have not been performed. Paginated count/data can change between requests when records are added/deleted.

## Individual staff history and corrections

`GET /business/:businessId/staffs/:staffId/attendance?page=1&limit=10`
returns that staff member's records with the same pagination and date/status filters.

`PATCH /business/:businessId/staffs/:staffId/attendance/:attendanceId`
with `{ "status": "PRESENT" }` or `{ "status": "ABSENT" }` corrects an existing
record, including previous dates. Use the record's `_id` from history as attendanceId.
The date and original markedAt remain unchanged. Each status change is stored in
`changes` with from, to, changedAt, and changedBy. updatedAt/updatedBy describe the
latest correction. History returns the current status and this audit trail.
Submitting the same status makes no change. Deleted records cannot be edited.
Concurrent edits use an atomic revision check; a conflicting edit returns 409 and
requires refreshing the record before retrying. This does not detect a stale UI
that submits only after another update has already completed.
