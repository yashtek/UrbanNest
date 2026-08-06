// services/room.service.ts

import { ObjectId } from "mongodb";
import { AppError } from "../middleware/error.middleware";
import { cloudinary } from "../lib/cloudinary";
import {
  IRoom,
  ROOM_STATUS,
  type RoomStatus,
  rooms,
} from "../modals/room.modal";

export interface CreateRoomDto {
  roomNumber: string;
  floor: number;
  capacity: number;
  rent: number;
  electricity: number;
  roomPhotos?: RoomImageAsset[];
}

export interface RoomImageAsset {
  url: string;
  publicId: string;
}

export interface UpdateRoomDto {
  roomNumber?: string;
  floor?: number;
  capacity?: number;
  occupied?: number;
  rent?: number;
  electricity?: number;
  status?: RoomStatus;
}

// Room service for CRUD, image upload, and room media management.
class RoomService {
  // Upload multiple room images.
  async uploadImages(files: File[]): Promise<RoomImageAsset[]> {
    return Promise.all(files.map((file) => this.uploadImage(file)));
  }

  // Upload a single image to Cloudinary.
  private async uploadImage(file: File): Promise<RoomImageAsset> {
    const buffer = Buffer.from(await file.arrayBuffer());

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: "urbannest/rooms",
          resource_type: "image",
          unique_filename: true,
          use_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(new AppError(error.message || "Image upload failed", 500));
            return;
          }

          if (!result?.secure_url || !result.public_id) {
            reject(new AppError("Image upload failed", 500));
            return;
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
          });
        },
      );

      uploadStream.end(buffer);
    });
  }

  // Create a room inside a business.
  async create(businessId: string, data: CreateRoomDto) {
    const payload: IRoom = {
      _id: new ObjectId(),
      businessId: new ObjectId(businessId),
      roomNumber: data.roomNumber,
      floor: data.floor,
      capacity: data.capacity,
      occupied: 0,
      rent: data.rent,
      electricity: data.electricity,
      roomPhotoUrls: data.roomPhotos?.map((photo) => photo.url) ?? [],
      roomPhotoPublicIds: data.roomPhotos?.map((photo) => photo.publicId) ?? [],
      status: "NOT_FULL",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await rooms().insertOne(payload);

    return payload;
  }

  // List all rooms for a business.
  async getAll(businessId: string) {
    return rooms()
      .find({
        businessId: new ObjectId(businessId),
      })
      .toArray();
  }

  // Add image assets to an existing room.
  async addImages(
    businessId: string,
    roomId: string,
    images: RoomImageAsset[],
  ) {
    if (!images.length) {
      throw new AppError("At least one image is required", 400);
    }

    const result = await rooms().updateOne(
      {
        _id: new ObjectId(roomId),
        businessId: new ObjectId(businessId),
      },
      {
        $push: {
          roomPhotoUrls: { $each: images.map((image) => image.url) },
          roomPhotoPublicIds: {
            $each: images.map((image) => image.publicId),
          },
        },
        $set: { updatedAt: new Date() },
      },
    );

    if (!result.matchedCount) {
      throw new AppError("Room not found", 404);
    }

    const room = await rooms().findOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    return room;
  }

  // Remove a single room image by public id.
  async deleteImage(
    businessId: string,
    roomId: string,
    publicId: string,
  ) {
    const room = await rooms().findOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!room) {
      throw new AppError("Room not found", 404);
    }

    const imageIndex = room.roomPhotoPublicIds.indexOf(publicId);

    if (imageIndex === -1) {
      throw new AppError("Image not found", 404);
    }

    await cloudinary.uploader.destroy(publicId, {
      resource_type: "image",
    });

    await rooms().updateOne(
      {
        _id: room._id,
        businessId: room.businessId,
      },
      {
        $pull: {
          roomPhotoUrls: room.roomPhotoUrls[imageIndex],
          roomPhotoPublicIds: publicId,
        },
        $set: { updatedAt: new Date() },
      },
    );

    return {
      message: "Room image deleted successfully",
    };
  }

  // Update a room by id.
  async update(
    businessId: string,
    roomId: string,
    data: UpdateRoomDto,
  ) {
    if (
      data.status &&
      !ROOM_STATUS.includes(data.status)
    ) {
      throw new AppError("Invalid room status", 400);
    }

    await rooms().updateOne(
      {
        _id: new ObjectId(roomId),
        businessId: new ObjectId(businessId),
      },
      {
        $set: {
          ...data,
          updatedAt: new Date(),
        },
      },
    );

    const room = await rooms().findOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!room) {
      throw new AppError("Room not found", 404);
    }

    return room;
  }

  // Delete a room by id.
  async delete(businessId: string, roomId: string) {
    const result = await rooms().deleteOne({
      _id: new ObjectId(roomId),
      businessId: new ObjectId(businessId),
    });

    if (!result.deletedCount) {
      throw new AppError("Room not found", 404);
    }

    return {
      message: "Room deleted successfully",
    };
  }
}

export const roomService = new RoomService();