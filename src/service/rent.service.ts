import { ObjectId } from "mongodb";
import { RentStatus, IRent, RENT_STATUS, rents } from "../modals/rent.modal";

import { AppError } from "../middleware/error.middleware";

export interface rentCreateDto {
  month: string;
  amount: number;
  status: RentStatus;
  paidDate?: Date | string;
  dueDate: Date | string;
}

export interface rentUpdate {
  month?: string;
  amount?: number;
  status?: RentStatus;
  paidDate?: Date | string;
  dueDate?: Date | string;
}

export class rentService {
  // create rent details
  async create(businessId: string, tenantId: string, data: rentCreateDto) {
    if (data.status && !RENT_STATUS.includes(data.status)) {
      throw new AppError("Invalid rent status", 400);
    }

    const payload: IRent = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      tenantId: new ObjectId(tenantId),
      month: data.month,
      amount: data.amount,
      status: data.status,
      paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
      dueDate: new Date(data.dueDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result  = await rents().insertOne(payload);

    return result;
  }
// update rent details
  async update(businessId: string, rentId: string, data: rentUpdate) {
    if (data.status && !RENT_STATUS.includes(data.status)) {
      throw new AppError("Invalid rent status", 400);
    }

    const payloadToUpdate: Partial<IRent> = {};

    if (data.month !== undefined) {
      payloadToUpdate.month = data.month;
    }

    if (data.amount !== undefined) {
      payloadToUpdate.amount = data.amount;
    }

    if (data.status !== undefined) {
      payloadToUpdate.status = data.status;
    }

    if (data.paidDate !== undefined) {
      payloadToUpdate.paidDate = new Date(data.paidDate);
    }

    if (data.dueDate !== undefined) {
      payloadToUpdate.dueDate = new Date(data.dueDate);
    }

    const result = await rents().updateOne(
      {
        _id: new ObjectId(rentId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: {
          updatedAt: new Date(),
          ...payloadToUpdate,
        },
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Rent data not found", 404);
    }

    const rent = await rents().findOne({
      _id: new ObjectId(rentId),
      businessId: new ObjectId(businessId),
    });

    if (!rent) {
      throw new AppError("Rent data not found", 404);
    }

    return rent;
  }
// get rent detail for a specific rent record
  async getById(businessId: string, rentId: string) {
    return rents().findOne({
      _id: new ObjectId(rentId),
      businessId: new ObjectId(businessId),
    });
  }

  // get rent detail for a particular tenant
  async getRentforTenant(businessId: string, tenantId: string) {
    return rents().findOne({
      tenantId: new ObjectId(tenantId),
      businessId: new ObjectId(businessId),
    });
  }

  // delete rent details
  async delete(businessId: string, rentId: string) {
    const result = await rents().findOneAndDelete({
      _id: new ObjectId(rentId),
      businessId: new ObjectId(businessId),
    });

    if (!result) {
      throw new AppError("Rent data not found", 404);
    }

    return {
      message: "Data deleted successfully",
    };
  }
}
export const RentService = new rentService();