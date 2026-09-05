import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { commonOptions, OPTION_TYPES, type ICommonOption, type OptionType } from "../modals/commonOption.modal";

const parseType = (type: string): OptionType => {
  if (!OPTION_TYPES.includes(type as OptionType)) throw new AppError("Invalid option type", 400);
  return type as OptionType;
};

class CommonOptionService {
  async createMany(items: Array<{ type: string; name: string }>) {
    if (!items.length) throw new AppError("options cannot be empty", 400);
    const now = new Date();
    for (const item of items) {
      const type = parseType(item.type);
      const name = item.name.trim().toUpperCase();
      if (!name) throw new AppError("Every option must have a name", 400);
      const code = name.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
      await commonOptions().updateOne(
        { type, code },
        {
          $setOnInsert: { _id: new ObjectId(), type, code, createdAt: now },
          $set: { name, isActive: true, updatedAt: now },
        },
        { upsert: true },
      );
    }
    const keys = items.map((item) => ({
      type: parseType(item.type),
      code: item.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, ""),
    }));
    return commonOptions().find({ $or: keys }).sort({ type: 1, name: 1 }).toArray();
  }

  async create(typeInput: string, nameInput: string) {
    const type = parseType(typeInput);
    const name = nameInput.trim().toUpperCase();
    if (!name) throw new AppError("name is required", 400);
    const now = new Date();
    const code = name.replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "");
    const option: ICommonOption = { _id: new ObjectId(), type, code, name, isActive: true, createdAt: now, updatedAt: now };
    try { await commonOptions().insertOne(option); } catch { throw new AppError("Option already exists", 409); }
    return option;
  }

  async getAll(typeInput?: string, includeInactive = false) {
    const query: Record<string, unknown> = {};
    if (typeInput) query.type = parseType(typeInput);
    if (!includeInactive) query.isActive = true;
    return commonOptions().find(query).sort({ type: 1, name: 1 }).toArray();
  }

  async update(id: string, data: { name?: string; isActive?: boolean }) {
    if (!ObjectId.isValid(id)) throw new AppError("Invalid option id", 400);
    const fields: Record<string, unknown> = { updatedAt: new Date() };
    if (data.name !== undefined) {
      const name = data.name.trim().toUpperCase();
      if (!name) throw new AppError("name cannot be empty", 400);
      fields.name = name;
    }
    if (data.isActive !== undefined) fields.isActive = data.isActive;
    try {
      const option = await commonOptions().findOneAndUpdate({ _id: new ObjectId(id) }, { $set: fields }, { returnDocument: "after" });
      if (!option) throw new AppError("Option not found", 404);
      return option;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Option name already exists for this type", 409);
    }
  }

  async remove(id: string) {
    return this.update(id, { isActive: false });
  }

  async require(id: string, type: OptionType) {
    if (!ObjectId.isValid(id)) throw new AppError(`Invalid ${type} id`, 400);
    const option = await commonOptions().findOne({ _id: new ObjectId(id), type, isActive: true });
    if (!option) throw new AppError(`Active ${type} option not found`, 400);
    return option._id;
  }

  async idByName(type: OptionType, name: string) {
    const option = await commonOptions().findOne({ type, code: name, isActive: true });
    if (!option) throw new AppError(`${type} option ${name} not found`, 500);
    return option._id;
  }

  async populate<T extends Record<string, any>>(rows: T[], fields: string[]) {
    const ids = [...new Set(rows.flatMap((row) => fields.map((field) => row[field]).filter(ObjectId.isValid)).map(String))];
    const options = await commonOptions().find({ _id: { $in: ids.map((id) => new ObjectId(id)) } }, { projection: { type: 1, code: 1, name: 1, isActive: 1 } }).toArray();
    const map = new Map(options.map((option) => [option._id.toString(), option]));
    return rows.map((row) => {
      const result: Record<string, any> = { ...row };
      for (const field of fields) if (row[field]) result[field] = map.get(String(row[field])) ?? null;
      return result;
    }) as T[];
  }
}

export const commonOptionService = new CommonOptionService();
