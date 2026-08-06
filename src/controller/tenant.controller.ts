import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { tenantService } from "../service/tenant.service";

// Tenant controller for request handling around tenant CRUD.
class tenatController{
    // Create a tenant under a business.
    async create(c:Context){
        try {
            const businessId = c.req.param("businessId");
            if (!businessId) {
                throw new AppError("businessId is required", 400);
            }

            const body = await c.req.json();

            if (typeof body?.roomId !== "string" || !body.roomId.trim()) {
                throw new AppError("roomId is required", 400);
            }

            if (typeof body?.joiningDate !== "string" || !body.joiningDate.trim()) {
                throw new AppError("joiningDate is required", 400);
            }

            const result = await tenantService.create(businessId, {
                roomId: body.roomId,
                name: body.name,
                phone: body.phone,
                aadhaar: body.aadhaar,
                joiningDate: body.joiningDate,
                leavingDate: body.leavingDate,
                rent: body.rent,
                securityDeposit: body.securityDeposit,
                status: body.status,
            })

            return c.json(result, 201);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Invalid request body", 400);
        }
    }

    // Update a tenant under a business.
    async update(c:Context){
        try {
            const businessId = c.req.param("businessId");
            const tenantId = c.req.param("tenantId");

            if (!businessId || !tenantId) {
                    throw new AppError("businessId and tenantId are required", 400);
                }

            const body = await c.req.json();

            if (body?.joiningDate !== undefined && typeof body.joiningDate !== "string") {
                throw new AppError("joiningDate must be a string", 400);
            }

            if (body?.leavingDate !== undefined && body.leavingDate !== null && typeof body.leavingDate !== "string") {
                throw new AppError("leavingDate must be a string or null", 400);
            }

            const result = await tenantService.update(
                businessId,
                tenantId,
                body,

            );

            return c.json(result); 
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Invalid request body", 400);
        }
    }

    // List tenants for one room inside a business.
    async getAll(c: Context) {
        try {
            const businessId = c.req.param("businessId");
            const roomId = c.req.param("roomId");

            if (!businessId || !roomId) {
                throw new AppError("businessId and roomId are required", 400);
            }

            const result = await tenantService.getAll(businessId, roomId);

            return c.json(result);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Unable to fetch tenants", 400);
        }
    }

    // Fetch a single tenant by tenant id inside a business.
    async getById(c: Context) {
        try {
            const businessId = c.req.param("businessId");
            const tenantId = c.req.param("tenantId");

            if (!businessId || !tenantId) {
                throw new AppError("businessId and tenantId are required", 400);
            }

            const result = await tenantService.getById(businessId, tenantId);

            return c.json(result);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Unable to fetch tenant", 400);
        }
    }

    // Delete a tenant from a business.
    async delete(c: Context) {
        try {
            const businessId = c.req.param("businessId");
            const tenantId = c.req.param("tenantId");

            if (!businessId || !tenantId) {
                throw new AppError("businessId and tenantId are required", 400);
            }

            const result = await tenantService.delete(businessId, tenantId);

            return c.json(result);
        } catch (error) {
            if (error instanceof AppError) {
                throw error;
            }

            throw new AppError("Unable to delete tenant", 400);
        }
    }
}

export const tenantController = new tenatController();