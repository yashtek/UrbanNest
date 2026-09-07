import { AppError } from "../middleware/error.middleware";

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export function parsePagination(page?: string, limit?: string): PaginationOptions {
  const parse = (value: string | undefined, name: string, fallback: number) => {
    if (value === undefined) return fallback;
    if (!/^\d+$/.test(value)) throw new AppError(`${name} must be a positive integer`, 400);
    return Number(value);
  };
  const options = { page: parse(page, "page", 1), limit: parse(limit, "limit", 10) };
  getPagination(options);
  return options;
}

export function getPagination({ page = 1, limit = 10 }: PaginationOptions = {}) {
  if (!Number.isSafeInteger(page) || page < 1) throw new AppError("page must be a positive integer", 400);
  if (!Number.isSafeInteger(limit) || limit < 1 || limit > 100) {
    throw new AppError("limit must be an integer between 1 and 100", 400);
  }
  const skip = (page - 1) * limit;
  if (!Number.isSafeInteger(skip)) throw new AppError("page is too large", 400);
  return { page, limit, skip };
}
