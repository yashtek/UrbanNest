import { ObjectId } from "mongodb";
import {
  ITenant,
  TENANT_STATUS,
  tenants,
  TenantStatus,
} from "../modals/tenant.modal";
import { AppError } from "../middleware/error.middleware";

export interface createTenant {
  roomId: string;
  name: string;
  phone: string;
  aadhaar: string;
  joiningDate: string | Date;
  leavingDate?: string | Date;
  rent: number;
  securityDeposit: number;
  status: TenantStatus;
}

export interface updateTenant {
  roomId?: string;
  name?: string;
  phone?: string;
  aadhaar?: string;
  joiningDate?: string | Date;
  leavingDate?: string | Date | null;
  rent?: number;
  securityDeposit?: number;
  status?: TenantStatus;
}

// Tenant service for CRUD operations scoped to a business and room.
export class tenantservice {
  // Create a tenant record for a specific business.
  async create(businessId: string, data: createTenant) {
    const payload: ITenant = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      roomId: new ObjectId(data.roomId),
      name: data.name,
      phone: data.phone,
      aadhaar: data.aadhaar,
      joiningDate: new Date(data.joiningDate),
      leavingDate: data.leavingDate ? new Date(data.leavingDate) : undefined,
      rent: data.rent,
      securityDeposit: data.securityDeposit,
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenants().insertOne(payload);
    return payload;
  }

  // Update a tenant record within a business.
  async update(businessId: string, roomId: string, data: updateTenant) {
    if (data.status && !TENANT_STATUS.includes(data.status)) {
      throw new AppError("Invalid rent status", 400);
    }

    const payloadToUpdate: Partial<ITenant> = {};

    if (data.roomId) {
      payloadToUpdate.roomId = new ObjectId(data.roomId);
    }

    if (data.name !== undefined) {
      payloadToUpdate.name = data.name;
    }

    if (data.phone !== undefined) {
      payloadToUpdate.phone = data.phone;
    }

    if (data.aadhaar !== undefined) {
      payloadToUpdate.aadhaar = data.aadhaar;
    }

    if (data.joiningDate !== undefined) {
      payloadToUpdate.joiningDate = new Date(data.joiningDate);
    }

    if (data.leavingDate !== undefined && data.leavingDate !== null) {
      payloadToUpdate.leavingDate = new Date(data.leavingDate);
    }

    if (data.rent !== undefined) {
      payloadToUpdate.rent = data.rent;
    }

    if (data.securityDeposit !== undefined) {
      payloadToUpdate.securityDeposit = data.securityDeposit;
    }

    if (data.status !== undefined) {
      payloadToUpdate.status = data.status;
    }

    const result = await tenants().updateOne(
      {
        _id: new ObjectId(roomId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: {
          updatedAt: new Date(),
          ...payloadToUpdate,
        },
        ...(data.leavingDate === null ? { $unset: { leavingDate: "" } } : {}),
      },
    );
    if (!result.matchedCount) {
      throw new AppError("Tenant not found", 404);
    }

    const tenant = await tenants().findOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return tenant;
  }

  // List tenants for a specific business room.
  async getAll(businessId: string, roomId: string) {
    return tenants()
      .find({
        businessId: new ObjectId(businessId),
        roomId: new ObjectId(roomId),
      })
      .toArray();
  }

  // Fetch a tenant by tenant id inside a business.
  async getById(businessId: string, tenantId: string) {
    const tenant = await tenants().findOne({
      _id: new ObjectId(tenantId),
      businessId: new ObjectId(businessId),
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return tenant;
  }
  // Delete a tenant record from a business.
  async delete(businessId: string, tenantId: string) {
    const result = await tenants().deleteOne({
      _id: new ObjectId(tenantId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Tenant not found", 404);
    }

    return {
      message: "Tenant deleted successfully",
    };
  }
}

export const tenantService = new tenantservice();
