import { ObjectId } from "mongodb";
import { IRent, rents } from "../modals/rent.modal";

import { AppError } from "../middleware/error.middleware";
import { commonOptionService } from "./commonOption.service";

export interface rentCreateDto {
  month: string;
  amount: number;
  status: string;
  paidDate?: Date | string;
  dueDate: Date | string;
}

export interface rentUpdate {
  month?: string;
  amount?: number;
  status?: string;
  paidDate?: Date | string;
  dueDate?: Date | string;
}

export class rentService {
  // create rent details
  async create(businessId: string, tenantId: string, data: rentCreateDto) {
    const status = await commonOptionService.require(
      data.status,
      "RENT_STATUS",
    );

    const payload: IRent = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      tenantId: new ObjectId(tenantId),
      month: data.month,
      amount: data.amount,
      status,
      paidDate: data.paidDate ? new Date(data.paidDate) : undefined,
      dueDate: new Date(data.dueDate),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await rents().insertOne(payload);
    return (await commonOptionService.populate([payload], ["status"]))[0];
  }
  // update rent details
  async update(businessId: string, rentId: string, data: rentUpdate) {
    const payloadToUpdate: Partial<IRent> = {};

    if (data.month !== undefined) {
      payloadToUpdate.month = data.month;
    }

    if (data.amount !== undefined) {
      payloadToUpdate.amount = data.amount;
    }

    if (data.status !== undefined) {
      payloadToUpdate.status = await commonOptionService.require(
        data.status,
        "RENT_STATUS",
      );
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

    return (await commonOptionService.populate([rent], ["status"]))[0];
  }
  // get rent detail for a specific rent record
  async getById(businessId: string, rentId: string) {
    const row = await rents().findOne({
      _id: new ObjectId(rentId),
      businessId: new ObjectId(businessId),
    });
    return row
      ? (await commonOptionService.populate([row], ["status"]))[0]
      : null;
  }

  // get rent detail for a particular tenant
  async getRentforTenant(businessId: string, tenantId: string) {
    const row = await rents().findOne({
      tenantId: new ObjectId(tenantId),
      businessId: new ObjectId(businessId),
    });
    return row
      ? (await commonOptionService.populate([row], ["status"]))[0]
      : null;
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
