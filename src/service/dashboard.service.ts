import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { electricity } from "../modals/electricity.modal";
import { expenses, type ExpenseCategory } from "../modals/miscExpense.modal";
import { rents } from "../modals/rent.modal";
import { staffExpenses } from "../modals/staffExpense.modal";

export interface DashboardQuery {
	month?: string;
}

export interface DashboardSummary {
	period: {
		month: string;
		startDate: string;
		endDate: string;
	};
	income: {
		rent: {
			totalExpected: number;
			totalCollected: number;
			outstanding: number;
			paidCount: number;
			pendingCount: number;
			overdueCount: number;
		};
		total: number;
	};
	bills: {
		electricity: {
			total: number;
			count: number;
		};
		total: number;
	};
	expenses: {
		misc: {
			total: number;
			count: number;
			byCategory: Array<{
				category: ExpenseCategory;
				total: number;
				count: number;
			}>;
		};
		staff: {
			total: number;
			count: number;
		};
		total: number;
	};
	net: {
		income: number;
		expense: number;
		balance: number;
	};
}

type RentAggregate = {
	totalExpected?: number;
	totalCollected?: number;
	paidCount?: number;
	pendingCount?: number;
	overdueCount?: number;
};

type ElectricityAggregate = {
	total?: number;
	count?: number;
};

type StaffExpenseAggregate = {
	total?: number;
	count?: number;
};

type MiscExpenseGroup = {
	_id: ExpenseCategory;
	total: number;
	count: number;
};

type MiscExpenseFacetResult = {
	summary: Array<{
		total: number;
		count: number;
	}>;
	byCategory: MiscExpenseGroup[];
};

type MiscExpenseSummary = {
	total: number;
	count: number;
	byCategory: Array<{
		category: ExpenseCategory;
		total: number;
		count: number;
	}>;
};

const parseMonthWindow = (monthInput?: string) => {
	const now = new Date();
	const month = monthInput?.trim() || `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;

	if (!/^\d{4}-\d{2}$/.test(month)) {
		throw new AppError("month must be in YYYY-MM format", 400);
	}

	const [yearPart, monthPart] = month.split("-").map(Number);
	if (monthPart < 1 || monthPart > 12) {
		throw new AppError("month must be in YYYY-MM format", 400);
	}

	const startDate = new Date(Date.UTC(yearPart, monthPart - 1, 1));
	const endDate = new Date(Date.UTC(yearPart, monthPart, 1));

	return {
		month,
		startDate,
		endDate,
	};
};

const zeroRentSummary = (): RentAggregate => ({
	totalExpected: 0,
	totalCollected: 0,
	paidCount: 0,
	pendingCount: 0,
	overdueCount: 0,
});

const zeroElectricitySummary = (): ElectricityAggregate => ({
	total: 0,
	count: 0,
});

const zeroStaffExpenseSummary = (): StaffExpenseAggregate => ({
	total: 0,
	count: 0,
});

const zeroMiscExpenseSummary = (): MiscExpenseSummary => ({
	total: 0,
	count: 0,
	byCategory: [],
});

class DashboardService {
	async getDashboard(businessId: string, query: DashboardQuery): Promise<DashboardSummary> {
		if (!ObjectId.isValid(businessId)) {
			throw new AppError("Invalid business id", 400);
		}

		const businessObjectId = new ObjectId(businessId);
		const { month, startDate, endDate } = parseMonthWindow(query.month);

		const [rentResult, electricityResult, staffExpenseResult, miscExpenseResult] = await Promise.all([
			rents()
				.aggregate<RentAggregate>([
					{
						$match: {
							businessId: businessObjectId,
							month,
						},
					},
					{
						$group: {
							_id: null,
							totalExpected: { $sum: "$amount" },
							totalCollected: {
								$sum: {
									$cond: [{ $eq: ["$status", "PAID"] }, "$amount", 0],
								},
							},
							paidCount: {
								$sum: {
									$cond: [{ $eq: ["$status", "PAID"] }, 1, 0],
								},
							},
							pendingCount: {
								$sum: {
									$cond: [{ $eq: ["$status", "PENDING"] }, 1, 0],
								},
							},
							overdueCount: {
								$sum: {
									$cond: [{ $eq: ["$status", "OVERDUE"] }, 1, 0],
								},
							},
						},
					},
				])
				.toArray(),
			electricity()
				.aggregate<ElectricityAggregate>([
					{
						$match: {
							businessId: businessObjectId,
							readingDate: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
					{
						$group: {
							_id: null,
							total: { $sum: "$amount" },
							count: { $sum: 1 },
						},
					},
				])
				.toArray(),
			staffExpenses()
				.aggregate<StaffExpenseAggregate>([
					{
						$match: {
							businessId: businessObjectId,
							month,
						},
					},
					{
						$group: {
							_id: null,
							total: { $sum: "$total" },
							count: { $sum: 1 },
						},
					},
				])
				.toArray(),
			expenses()
				.aggregate<MiscExpenseFacetResult>([
					{
						$match: {
							businessId: businessObjectId,
							date: {
								$gte: startDate,
								$lt: endDate,
							},
						},
					},
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

		const rentSummary = rentResult[0] ?? zeroRentSummary();
		const electricitySummary = electricityResult[0] ?? zeroElectricitySummary();
		const staffExpenseSummary = staffExpenseResult[0] ?? zeroStaffExpenseSummary();
		const miscSummaryEnvelope = miscExpenseResult[0] ?? zeroMiscExpenseSummary();

		const miscExpenseSummary: MiscExpenseSummary = {
			total: miscSummaryEnvelope.summary[0]?.total ?? 0,
			count: miscSummaryEnvelope.summary[0]?.count ?? 0,
			byCategory: (miscSummaryEnvelope.byCategory ?? []).map((item) => ({
				category: item._id,
				total: item.total,
				count: item.count,
			})),
		};

		const rentIncome = rentSummary.totalCollected ?? 0;
		const electricityTotal = electricitySummary.total ?? 0;
		const miscExpenseTotal = miscExpenseSummary.total ?? 0;
		const staffExpenseTotal = staffExpenseSummary.total ?? 0;
		const totalExpense = electricityTotal + miscExpenseTotal + staffExpenseTotal;

		return {
			period: {
				month,
				startDate: startDate.toISOString(),
				endDate: endDate.toISOString(),
			},
			income: {
				rent: {
					totalExpected: rentSummary.totalExpected ?? 0,
					totalCollected: rentIncome,
					outstanding: Math.max(0, (rentSummary.totalExpected ?? 0) - rentIncome),
					paidCount: rentSummary.paidCount ?? 0,
					pendingCount: rentSummary.pendingCount ?? 0,
					overdueCount: rentSummary.overdueCount ?? 0,
				},
				total: rentIncome,
			},
			bills: {
				electricity: {
					total: electricityTotal,
					count: electricitySummary.count ?? 0,
				},
				total: electricityTotal,
			},
			expenses: {
				misc: miscExpenseSummary,
				staff: {
					total: staffExpenseTotal,
					count: staffExpenseSummary.count ?? 0,
				},
				total: totalExpense,
			},
			net: {
				income: rentIncome,
				expense: totalExpense,
				balance: rentIncome - totalExpense,
			},
		};
	}
}

export const dashboardService = new DashboardService();
