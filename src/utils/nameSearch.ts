import { AppError } from "../middleware/error.middleware";

export function nameSearch(value?: string) {
  const name = value?.trim();
  if (!name) return undefined;
  if (name.length > 100) throw new AppError("name must be at most 100 characters", 400);
  // Treat input as literal text, including any regex metacharacters.
  return { $regex: name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
}
