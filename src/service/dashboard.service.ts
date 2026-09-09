import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { expenses } from "../modals/miscExpense.modal";
import { rents } from "../modals/rent.modal";
import { rooms } from "../modals/room.modal";
import { staffs } from "../modals/staff.modal";
import { tenants } from "../modals/tenant.modal";
import { commonOptionService } from "./commonOption.service";

export interface DashboardQuery {
  month?: string;
}

const parseMonthWindow = (input?: string) => {
  const now = new Date();
  const month =
    input?.trim() ||
    `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new AppError("month must be in YYYY-MM format", 400);
  }

  const [year, monthNumber] = month.split("-").map(Number);
  const startDate = new Date(Date.UTC(year, monthNumber - 1, 1));
  const endDate = new Date(Date.UTC(year, monthNumber, 1));
  const monthLabel = startDate.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  return { month, monthLabel, startDate, endDate };
};

type CategoryResult = {
  _id: ObjectId;
  total: number;
  count: number;
};

class DashboardService {
  async getDashboard(businessId: string, query: DashboardQuery) {
    if (!ObjectId.isValid(businessId)) {
      throw new AppError("Invalid business id", 400);
    }

    const businessObjectId = new ObjectId(businessId);
    const { month, monthLabel, startDate, endDate } = parseMonthWindow(
      query.month,
    );
    const dateWindow = { $gte: startDate, $lt: endDate };
    const [
      rentPaid,
      rentPending,
      rentOverdue,
      roomFull,
      roomNotFull,
      tenantPaid,
      tenantPending,
      tenantOverdue,
      present,
      absent,
      leave,
      salaryPaid,
      salaryUnpaid,
      salaryDue,
    ] = await Promise.all([
      commonOptionService.idByName("RENT_STATUS", "PAID"),
      commonOptionService.idByName("RENT_STATUS", "PENDING"),
      commonOptionService.idByName("RENT_STATUS", "OVERDUE"),
      commonOptionService.idByName("ROOM_STATUS", "FULL"),
      commonOptionService.idByName("ROOM_STATUS", "NOT_FULL"),
      commonOptionService.idByName("TENANT_STATUS", "PAID"),
      commonOptionService.idByName("TENANT_STATUS", "PENDING"),
      commonOptionService.idByName("TENANT_STATUS", "OVERDUE"),
      commonOptionService.idByName("STAFF_DUTY_STATUS", "PRESENT"),
      commonOptionService.idByName("STAFF_DUTY_STATUS", "ABSENT"),
      commonOptionService.idByName("STAFF_DUTY_STATUS", "LEAVE"),
      commonOptionService.idByName("STAFF_SALARY_STATUS", "PAID"),
      commonOptionService.idByName("STAFF_SALARY_STATUS", "UNPAID"),
      commonOptionService.idByName("STAFF_SALARY_STATUS", "DUE"),
    ]);

    const [rentRows, roomRows, tenantRows, staffRows, expenseRows] =
      await Promise.all([
        rents()
          .aggregate<{
            totalExpected: number;
            totalCollected: number;
            paidCount: number;
            pendingCount: number;
            overdueCount: number;
          }>([
            {
              $match: {
                businessId: businessObjectId,
                $or: [
                  { month },
                  { month: monthLabel },
                  { dueDate: dateWindow },
                ],
              },
            },
            {
              $group: {
                _id: null,
                totalExpected: { $sum: "$amount" },
                totalCollected: {
                  $sum: {
                    $cond: [{ $eq: ["$status", rentPaid] }, "$amount", 0],
                  },
                },
                paidCount: {
                  $sum: { $cond: [{ $eq: ["$status", rentPaid] }, 1, 0] },
                },
                pendingCount: {
                  $sum: { $cond: [{ $eq: ["$status", rentPending] }, 1, 0] },
                },
                overdueCount: {
                  $sum: { $cond: [{ $eq: ["$status", rentOverdue] }, 1, 0] },
                },
              },
            },
          ])
          .toArray(),

        rooms()
          .aggregate<{
            totalRooms: number;
            fullRooms: number;
            notFullRooms: number;
            totalCapacity: number;
            occupiedBeds: number;
            electricityTotal: number;
            electricityRoomCount: number;
          }>([
            { $match: { businessId: businessObjectId } },
            {
              $group: {
                _id: null,
                totalRooms: { $sum: 1 },
                fullRooms: {
                  $sum: { $cond: [{ $eq: ["$status", roomFull] }, 1, 0] },
                },
                notFullRooms: {
                  $sum: { $cond: [{ $eq: ["$status", roomNotFull] }, 1, 0] },
                },
                totalCapacity: { $sum: "$capacity" },
                occupiedBeds: { $sum: "$occupied" },
                electricityTotal: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ["$readingDate", startDate] },
                          { $lt: ["$readingDate", endDate] },
                        ],
                      },
                      "$amount",
                      0,
                    ],
                  },
                },
                electricityRoomCount: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ["$readingDate", startDate] },
                          { $lt: ["$readingDate", endDate] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ])
          .toArray(),

        tenants()
          .aggregate<{
            total: number;
            joinedThisMonth: number;
            allocatedElectricity: number;
            paidCount: number;
            pendingCount: number;
            overdueCount: number;
          }>([
            { $match: { businessId: businessObjectId } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                joinedThisMonth: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $gte: ["$joiningDate", startDate] },
                          { $lt: ["$joiningDate", endDate] },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
                allocatedElectricity: { $sum: "$electricity" },
                paidCount: {
                  $sum: { $cond: [{ $eq: ["$status", tenantPaid] }, 1, 0] },
                },
                pendingCount: {
                  $sum: { $cond: [{ $eq: ["$status", tenantPending] }, 1, 0] },
                },
                overdueCount: {
                  $sum: { $cond: [{ $eq: ["$status", tenantOverdue] }, 1, 0] },
                },
              },
            },
          ])
          .toArray(),

        staffs()
          .aggregate<{
            total: number;
            active: number;
            present: number;
            absent: number;
            leave: number;
            totalSalary: number;
            paidSalary: number;
            unpaidSalary: number;
            dueSalary: number;
          }>([
            { $match: { businessId: businessObjectId } },
            {
              $group: {
                _id: null,
                total: { $sum: 1 },
                active: { $sum: { $cond: ["$isActive", 1, 0] } },
                present: {
                  $sum: { $cond: [{ $eq: ["$status", present] }, 1, 0] },
                },
                absent: {
                  $sum: { $cond: [{ $eq: ["$status", absent] }, 1, 0] },
                },
                leave: { $sum: { $cond: [{ $eq: ["$status", leave] }, 1, 0] } },
                totalSalary: { $sum: "$salary" },
                paidSalary: {
                  $sum: {
                    $cond: [
                      { $eq: ["$staffSalary", salaryPaid] },
                      "$salary",
                      0,
                    ],
                  },
                },
                unpaidSalary: {
                  $sum: {
                    $cond: [
                      { $eq: ["$staffSalary", salaryUnpaid] },
                      "$salary",
                      0,
                    ],
                  },
                },
                dueSalary: {
                  $sum: {
                    $cond: [{ $eq: ["$staffSalary", salaryDue] }, "$salary", 0],
                  },
                },
              },
            },
          ])
          .toArray(),

        expenses()
          .aggregate<{
            summary: Array<{ total: number; count: number }>;
            byCategory: CategoryResult[];
          }>([
            { $match: { businessId: businessObjectId, date: dateWindow } },
            {
              $facet: {
                summary: [
                  {
                    $group: {
                      _id: null,
                      total: { $sum: "$amount" },
                      count: { $sum: 1 },
                    },
                  },
                ],
                byCategory: [
                  {
                    $group: {
                      _id: "$category",
                      total: { $sum: "$amount" },
                      count: { $sum: 1 },
                    },
                  },
                  { $sort: { total: -1 } },
                ],
              },
            },
          ])
          .toArray(),
      ]);

    const rent = rentRows[0];
    const room = roomRows[0];
    const tenant = tenantRows[0];
    const staff = staffRows[0];
    const expenseEnvelope = expenseRows[0];
    const totalExpected = rent?.totalExpected ?? 0;
    const totalCollected = rent?.totalCollected ?? 0;
    const expenseTotal = expenseEnvelope?.summary[0]?.total ?? 0;
    const populatedCategories = await commonOptionService.populate(
      (expenseEnvelope?.byCategory ?? []).map((item) => ({
        ...item,
        category: item._id,
      })),
      ["category"],
    );

    return {
      period: {
        month,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      rooms: {
        total: room?.totalRooms ?? 0,
        full: room?.fullRooms ?? 0,
        notFull: room?.notFullRooms ?? 0,
        totalCapacity: room?.totalCapacity ?? 0,
        occupied: room?.occupiedBeds ?? 0,
        vacant: Math.max(
          0,
          (room?.totalCapacity ?? 0) - (room?.occupiedBeds ?? 0),
        ),
      },
      tenants: {
        total: tenant?.total ?? 0,
        joinedThisMonth: tenant?.joinedThisMonth ?? 0,
        electricityAllocated: tenant?.allocatedElectricity ?? 0,
        paidCount: tenant?.paidCount ?? 0,
        pendingCount: tenant?.pendingCount ?? 0,
        overdueCount: tenant?.overdueCount ?? 0,
      },
      income: {
        rent: {
          totalExpected,
          totalCollected,
          outstanding: Math.max(0, totalExpected - totalCollected),
          paidCount: rent?.paidCount ?? 0,
          pendingCount: rent?.pendingCount ?? 0,
          overdueCount: rent?.overdueCount ?? 0,
        },
        total: totalCollected,
      },
      bills: {
        electricity: {
          total: room?.electricityTotal ?? 0,
          roomCount: room?.electricityRoomCount ?? 0,
        },
      },
      staff: {
        total: staff?.total ?? 0,
        active: staff?.active ?? 0,
        inactive: Math.max(0, (staff?.total ?? 0) - (staff?.active ?? 0)),
        attendance: {
          present: staff?.present ?? 0,
          absent: staff?.absent ?? 0,
          leave: staff?.leave ?? 0,
        },
        salary: {
          total: staff?.totalSalary ?? 0,
          paid: staff?.paidSalary ?? 0,
          unpaid: staff?.unpaidSalary ?? 0,
          due: staff?.dueSalary ?? 0,
        },
      },
      expenses: {
        total: expenseTotal,
        count: expenseEnvelope?.summary[0]?.count ?? 0,
        byCategory: populatedCategories.map((item) => ({
          category: item.category,
          total: item.total,
          count: item.count,
        })),
      },
      net: {
        income: totalCollected,
        expense: expenseTotal,
        balance: totalCollected - expenseTotal,
      },
    };
  }
}

export const dashboardService = new DashboardService();
