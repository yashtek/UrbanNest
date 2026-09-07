import { ObjectId } from "mongodb";
import { getPagination, type PaginationOptions } from "../utils/pagination";
import {
  ITenant,
  tenants,
} from "../modals/tenant.modal";
import { AppError } from "../middleware/error.middleware";
import { rooms } from "../modals/room.modal";
import { rents } from "../modals/rent.modal";
import { distributeRoomElectricity } from "./tenant-electricity.service";
import { commonOptionService } from "./commonOption.service";

export interface createTenant {
  roomId: string;
  name: string;
  phone: string;
  aadhaar: string;
  joiningDate: string | Date;
  leavingDate?: string | Date;
  rent: number;
  securityDeposit: number;
  month: string;
  amount: number;
  paidDate?: string | Date;
  dueDate: string | Date;
  status: string;
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
  month?: string;
  amount?: number;
  paidDate?: string | Date | null;
  dueDate?: string | Date;
  status?: string;
}

// Tenant service for CRUD operations scoped to a business and room.
export class tenantservice {
  // Create a tenant record for a specific business.
  async create(businessId: string, data: createTenant) {
    const budinessObjectId = new ObjectId(businessId);
    const roomObjectId = new ObjectId(data.roomId);

    const room = await rooms().findOne({
      _id: roomObjectId,
      businessId: budinessObjectId,
    });
    if (!room) {
      throw new AppError("Room not found", 404);
    }
    if (room.occupied >= room.capacity) {
      throw new AppError("Room is Full", 400);
    }

    const payload: ITenant = {
      _id: new ObjectId(),
      businessId: budinessObjectId,
      roomId: roomObjectId,
      name: data.name,
      phone: data.phone,
      aadhaar: data.aadhaar,
      joiningDate: new Date(data.joiningDate),
      leavingDate: data.leavingDate ? new Date(data.leavingDate) : undefined,
      rent: data.rent,
      securityDeposit: data.securityDeposit,
      month: data.month,
      amount: data.amount,
      paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
      dueDate: new Date(data.dueDate),
      electricity: 0,
      status: await commonOptionService.require(data.status, "TENANT_STATUS"),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await tenants().insertOne(payload);

    const newOccupied = room.occupied + 1;
    await rooms().updateOne(
      {
        _id: roomObjectId,
        businessId: budinessObjectId,
      },
      {
        $set: {
          occupied: newOccupied,
          status: await commonOptionService.idByName("ROOM_STATUS", newOccupied >= room.capacity ? "FULL" : "NOT_FULL"),
          updatedAt: new Date(),
        },
      },
    );

    await distributeRoomElectricity(budinessObjectId, roomObjectId);
    const created = await tenants().findOne({
      _id: payload._id,
      businessId: budinessObjectId,
    });
    return created ? (await commonOptionService.populate([created], ["status"]))[0] : null;
  }

  // Update a tenant record within a business.
  async update(businessId: string, tenantId: string, data: updateTenant) {
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

    if (data.month !== undefined) {
      payloadToUpdate.month = data.month;
    }

    if (data.amount !== undefined) {
      payloadToUpdate.amount = data.amount;
    }

    if (data.paidDate !== undefined && data.paidDate !== null) {
      payloadToUpdate.paidDate = new Date(data.paidDate);
    }

    if (data.dueDate !== undefined) {
      payloadToUpdate.dueDate = new Date(data.dueDate);
    }

    if (data.status !== undefined) {
      payloadToUpdate.status = await commonOptionService.require(data.status, "TENANT_STATUS");
    }

    const result = await tenants().updateOne(
      {
        _id: new ObjectId(tenantId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: {
          updatedAt: new Date(),
          ...payloadToUpdate,
        },
        ...(
          data.leavingDate === null || data.paidDate === null
            ? {
                $unset: {
                  ...(data.leavingDate === null ? { leavingDate: "" } : {}),
                  ...(data.paidDate === null ? { paidDate: "" } : {}),
                },
              }
            : {}
        ),
      },
    );
    if (!result.matchedCount) {
      throw new AppError("Tenant not found", 404);
    }

    const tenant = await tenants().findOne({
      _id: new ObjectId(tenantId),
      businessId: new ObjectId(businessId),
    });

    if (!tenant) {
      throw new AppError("Tenant not found", 404);
    }

    return (await commonOptionService.populate([tenant], ["status"]))[0];
  }

  // List tenants for a specific business room.
  async getAll(businessId: string, roomId: string, options: PaginationOptions = {}) {
    const { page, limit, skip } = getPagination(options);
    if (!ObjectId.isValid(businessId)) throw new AppError("Invalid businessId", 400);
    if (!ObjectId.isValid(roomId)) throw new AppError("Invalid roomId", 400);
    const filter = { businessId: new ObjectId(businessId), roomId: new ObjectId(roomId) };
    const collection = tenants();
    const [rows, total] = await Promise.all([
      collection.find(filter).sort({ _id: -1 }).skip(skip).limit(limit).toArray(),
      collection.countDocuments(filter),
    ]);
    return {
      data: await commonOptionService.populate(rows, ["status"]),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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

    return (await commonOptionService.populate([tenant], ["status"]))[0];
  }
  // Delete a tenant record from a business.
 async delete(businessId: string, tenantId: string) {
  const businessObjectId = new ObjectId(businessId);
  const tenantObjectId = new ObjectId(tenantId);

  // 1. Find tenant belonging to this business
  const tenant = await tenants().findOne({
    _id: tenantObjectId,
    businessId: businessObjectId,
  });

  if (!tenant) {
    throw new AppError("Tenant not found", 404);
  }

  // 2. Delete all rents associated with tenant
  await rents().deleteMany({
    tenantId: tenantObjectId,
  });

  // 3. Delete tenant
  await tenants().deleteOne({
    _id: tenantObjectId,
    businessId: businessObjectId,
  });

  // 4. Decrease room occupancy
  const room = await rooms().findOne({
    _id: tenant.roomId,
    businessId: businessObjectId,
  });

  if (room) {
    const newOccupied = Math.max(0, room.occupied - 1);

    await rooms().updateOne(
      {
        _id: tenant.roomId,
        businessId: businessObjectId,
      },
      {
        $set: {
          occupied: newOccupied,
          status: await commonOptionService.idByName("ROOM_STATUS", newOccupied >= room.capacity ? "FULL" : "NOT_FULL"),
          updatedAt: new Date(),
        },
      }
    );

    await distributeRoomElectricity(businessObjectId, tenant.roomId);
  }

  return {
    message: "Tenant deleted successfully",
  };
}
}

export const tenantService = new tenantservice();
