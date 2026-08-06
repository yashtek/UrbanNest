import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { businessService } from "../service/business.service";

export class BusinessController {
    async create(c: Context) {
        try {
            const body = await c.req.json();
            const user = c.get("user") as { userId: string };

            if (typeof body?.name !== "string" || typeof body?.template !== "string") {
                throw new AppError("name and template are required", 400);
            }

            const result = await businessService.create({
                owner_id: user.userId,
                name: body.name,
                template: body.template,
            });

            return c.json(result, 201);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Invalid request body", 400);
    }
    }

    async getAll(c: Context) {
        const user = c.get("user") as { userId: string };
        const result = await businessService.getAll(user.userId);

        return c.json(result);
    }

  async update(c: Context) {
        const id = c.req.param("id");
        if (!id) {
            throw new AppError("Business id is required", 400);
        }

        const body = await c.req.json();

    const result = await businessService.update(id, body);

    return c.json(result);
  }

    async delete(c: Context) {
        const id = c.req.param("id");
        if (!id) {
            throw new AppError("Business id is required", 400);
        }

        const result = await businessService.delete(id);

    return c.json(result);
  }
}

export const businessController = new BusinessController();