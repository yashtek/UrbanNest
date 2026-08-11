import { ObjectId } from "mongodb";
import { electricity, Ielectricity } from "../modals/electricity.modal";
import { AppError } from "../middleware/error.middleware";

export interface electricitydto {
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  costPerunit: number;
  amount: number;
}

export interface updateelectricitydto {
  readingDate: Date;
  previousReading: number;
  currentReading: number;
  costPerunit: number;
}

class elecService {
  // Create bill
  async create(businessId: string, roomId: string, data: electricitydto) {
    const unitUse = data.currentReading - data.previousReading;
    const elecBill = unitUse * data.costPerunit;
    const payload: Ielectricity = {
      _id: new ObjectId(),
      roomId: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
      readingDate: new Date(data.readingDate),
      previousReading: data.previousReading,
      currentReading: data.currentReading,
      unitUsed: unitUse,
      costPerunit: data.costPerunit,
      amount: elecBill,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await electricity().insertOne(payload);
    return result;
  }

//   update elec Bill
  async update(
    businessId: string,
    electricityId: string,
    data: updateelectricitydto,
  ) {
    const existing = await electricity().findOne({
      _id: new ObjectId(electricityId),
      businessId: new ObjectId(businessId),
    });

    if (!existing) {
      throw new Error("Electricity record not found");
    }

    const previousReading = data.previousReading ?? existing.previousReading;

    const currentReading = data.currentReading ?? existing.currentReading;

    const costPerunit = data.costPerunit ?? existing.costPerunit;

    if (currentReading < previousReading) {
      throw new Error("Current reading cannot be less than previous reading");
    }

    const unitUsed = currentReading - previousReading;
    const amount = unitUsed * costPerunit;

    const payloadToUpdate: Partial<Ielectricity> = {
      previousReading,
      currentReading,
      costPerunit,
      unitUsed,
      amount,
      updatedAt: new Date(),
    };
    if (data.readingDate !== undefined) {
      payloadToUpdate.readingDate = new Date(data.readingDate);
    }

    const result = await electricity().updateOne(
      {
        _id: new ObjectId(electricityId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: payloadToUpdate,
      },
    );

    return result;
  }

  //   electricy bill by id
  async getLatestByRoom(businessId: string, roomId: string) {
    return electricity().findOne(
      {
        roomId: new ObjectId(roomId),
        businessId: new ObjectId(businessId),
      },
      {
        sort: { createdAt: -1 },
      },
    );
  }
  //   get all bills
  async getAll(businessId: string, roomId: string) {
    return electricity().findOne({
      roomId: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });
  }

  //   delete bill
  async delete(businessId: string, roomId: string, electricityId: string) {
   const deleting =  await electricity().findOneAndDelete({
      _id: new ObjectId(electricityId),
      roomId: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });
    if(!deleting){
        throw new AppError("Unablet to delete or no data found to delete",404)
    }
    return {
        "message":"Data deleted successfullt"
    }
  }
}

export const ElecService = new elecService;
