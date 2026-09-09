import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { commonOptionService } from "../service/commonOption.service";

class CommonOptionController {
  async createMany(c: Context) {
    const body = await c.req.json();
    if (!Array.isArray(body?.options))
      throw new AppError("options must be an array", 400);
    for (const option of body.options) {
      if (
        typeof option?.type !== "string" ||
        typeof option?.name !== "string"
      ) {
        throw new AppError("Every option requires type and name", 400);
      }
    }
    return c.json(await commonOptionService.createMany(body.options), 201);
  }

  async create(c: Context) {
    const body = await c.req.json();
    if (typeof body?.type !== "string" || typeof body?.name !== "string")
      throw new AppError("type and name are required", 400);
    return c.json(await commonOptionService.create(body.type, body.name), 201);
  }
  async getAll(c: Context) {
    return c.json(
      await commonOptionService.getAll(
        c.req.query("type"),
        c.req.query("includeInactive") === "true",
      ),
    );
  }
  async update(c: Context) {
    const body = await c.req.json();
    if (body.name !== undefined && typeof body.name !== "string")
      throw new AppError("name must be a string", 400);
    if (body.isActive !== undefined && typeof body.isActive !== "boolean")
      throw new AppError("isActive must be a boolean", 400);
    const optionId = c.req.param("optionId");
    if (!optionId) throw new AppError("optionId is required", 400);
    return c.json(await commonOptionService.update(optionId, body));
  }
  async remove(c: Context) {
    const optionId = c.req.param("optionId");
    if (!optionId) throw new AppError("optionId is required", 400);
    return c.json(await commonOptionService.remove(optionId));
  }
}
export const commonOptionController = new CommonOptionController();
