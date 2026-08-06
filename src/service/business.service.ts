import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import {
  BUSINESS_TEMPLATES,
  businesses,
  type BusinessTemplate,
  type IBusiness,
} from "../modals/business.modal";

export interface CreateBusinessDto {
  owner_id: string;
  name: string;
  template: BusinessTemplate;
}
export interface UpdateBusinessDto {
  name?: string;
  template?: BusinessTemplate;
}

// Business service for CRUD operations on business records.
export class BusinessService {
  // Create a new business for an owner.
  async create(data: CreateBusinessDto) {
    if (!BUSINESS_TEMPLATES.includes(data.template)) {
      throw new AppError("Invalid business template", 400);
    }

    const payload: IBusiness = {
      _id: new ObjectId(),
      owner_id: data.owner_id,
      name: data.name,
      template: data.template,
      created_at: new Date(),
    };

    try {
      await businesses().insertOne(payload);
    } catch (error: any) {
      if (error?.code === 11000) {
        throw new AppError("Business already exists", 409);
      }
      throw error;
    }

    return payload;
  }

  // Get all businesses for one owner.
  async getAll(owner_id: string) {
    return await businesses().find({ owner_id }).toArray();
  }

  // Update a business name or template.
  async update(id: string, data: UpdateBusinessDto) {
    const updateData: UpdateBusinessDto = {};

    if (data.name) updateData.name = data.name;

    if (data.template) {
      if (!BUSINESS_TEMPLATES.includes(data.template)) {
        throw new AppError("Invalid business template", 400);
      }
      updateData.template = data.template;
    }

    await businesses().updateOne(
      {
        _id: new ObjectId(id),
      },
      {
        $set: updateData,
      },
    );
    return await businesses().findOne({ _id: new ObjectId(id) });
  }

  // Delete a business by id.
  async delete(id: string) {
    await businesses().deleteOne({
      _id: new ObjectId(id),
    });

    return {
      message: "Business deleted successfully",
    };
  }
}

export const businessService = new BusinessService();
