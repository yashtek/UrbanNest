import { Collection, ObjectId } from "mongodb";
import { getDB } from "../db/db";

export const OPTION_TYPES = [
  "EXPENSE_CATEGORY",
  "RENT_STATUS",
  "ROOM_STATUS",
  "STAFF_ROLE",
  "STAFF_DUTY_STATUS",
  "STAFF_SHIFT",
  "STAFF_SALARY_STATUS",
  "TENANT_STATUS",
] as const;

export type OptionType = (typeof OPTION_TYPES)[number];

export interface ICommonOption {
  _id: ObjectId;
  type: OptionType;
  code: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_OPTIONS: Record<OptionType, readonly string[]> = {
  EXPENSE_CATEGORY: ["ELECTRICITY", "CLEANING", "WIFI", "REPAIR", "FOOD", "WATER", "STAFF", "MISC", "SECURITY"],
  RENT_STATUS: ["PAID", "PENDING", "OVERDUE"],
  ROOM_STATUS: ["FULL", "NOT_FULL"],
  STAFF_ROLE: ["COOK", "CLEANER"],
  STAFF_DUTY_STATUS: ["PRESENT", "ABSENT", "LEAVE"],
  STAFF_SHIFT: ["MORNING", "AFTERNOON", "NIGHT"],
  STAFF_SALARY_STATUS: ["PAID", "UNPAID", "DUE"],
  TENANT_STATUS: ["PAID", "PENDING", "OVERDUE"],
};

export const commonOptions = (): Collection<ICommonOption> =>
  getDB().collection<ICommonOption>("commonOptions");

export const ensureCommonOptionIndexes = async () => {
  await commonOptions().createIndex({ type: 1, code: 1 }, { unique: true });
  const now = new Date();
  await Promise.all(
    OPTION_TYPES.flatMap((type) =>
      DEFAULT_OPTIONS[type].map((name) =>
        commonOptions().updateOne(
          { type, code: name },
          { $setOnInsert: { _id: new ObjectId(), type, code: name, name, isActive: true, createdAt: now, updatedAt: now } },
          { upsert: true },
        ),
      ),
    ),
  );
  const migrations = [
    ["expenses", "category", "EXPENSE_CATEGORY"], ["rents", "status", "RENT_STATUS"],
    ["rooms", "status", "ROOM_STATUS"], ["tenants", "status", "TENANT_STATUS"],
    ["staffs", "role", "STAFF_ROLE"], ["staffs", "shift", "STAFF_SHIFT"],
    ["staffs", "status", "STAFF_DUTY_STATUS"], ["staffs", "staffSalary", "STAFF_SALARY_STATUS"],
    ["staffDuties", "shift", "STAFF_SHIFT"], ["staffDuties", "status", "STAFF_DUTY_STATUS"],
  ] as const;
  for (const [collection, field, type] of migrations) {
    for (const option of await commonOptions().find({ type }).toArray()) {
      await getDB().collection(collection).updateMany({ [field]: option.code }, { $set: { [field]: option._id } });
    }
  }
};
