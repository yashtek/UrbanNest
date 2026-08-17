import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { roomService } from "../service/room.service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Parse a required numeric form field.
const toNumber = (value: FormDataEntryValue | null, field: string) => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new AppError(`${field} is required`, 400);
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        throw new AppError(`${field} must be a number`, 400);
    }

    return parsed;
};

// Parse a required string form field.
const toString = (value: FormDataEntryValue | null, field: string) => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new AppError(`${field} is required`, 400);
    }

    return value;
};

// Parse an optional string form field.
const toOptionalString = (value: FormDataEntryValue | null) => {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    return value;
};

// Parse an optional numeric form field.
const toOptionalNumber = (value: FormDataEntryValue | null, field: string) => {
    if (typeof value !== "string" || value.trim() === "") {
        return undefined;
    }

    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
        throw new AppError(`${field} must be a number`, 400);
    }

    return parsed;
};

// Validate room images before upload.
const getImages = async (formData: FormData) => {
    const files = formData
        .getAll("images")
        .filter((value): value is File => value instanceof File);

    if (!files.length) {
        return [];
    }

    for (const file of files) {
        if (file.size > MAX_IMAGE_SIZE) {
            throw new AppError("Each image must be less than 5MB", 400);
        }

        if (!file.type.startsWith("image/")) {
            throw new AppError("Only image files are allowed", 400);
        }
    }

    return files;
};

// Room controller for room CRUD and image management.
class RoomController{
    // Create a room under a business.
   async create(c: Context) {
    const businessId = c.req.param("businessId");

    if (!businessId) {
        throw new AppError("businessId is required", 400);
    }

    const body = await c.req.json();

    const result = await roomService.create(businessId, {
        roomNumber: toString(body.roomNumber, "roomNumber"),
        floor: toNumber(body.floor, "floor"),
        capacity: toNumber(body.capacity, "capacity"),
        rent: toNumber(body.rent, "rent"),
        electricity: toNumber(body.electricity, "electricity"),
    });

    return c.json(result, 201);
}

    // List all rooms for a business.
    async getAll(c:Context){
        const businessId = c.req.param("businessId");
        if (!businessId) {
            throw new AppError("businessId is required", 400);
    }

        const result = await roomService.getAll(businessId);

        return c.json(result);
    }

    // Add new images to a room.
    async addImages(c: Context) {
        const businessId = c.req.param("businessId");
        const roomId = c.req.param("roomId");

        if (!businessId || !roomId) {
            throw new AppError("businessId and roomId are required", 400);
    }

        const formData = await c.req.formData();
        const images = await getImages(formData);

        if (!images.length) {
            throw new AppError("At least one image is required", 400);
        }

        const uploadedImages = await roomService.uploadImages(images);
        const result = await roomService.addImages(businessId, roomId, uploadedImages);

        return c.json(result, 200);
    }

    // Delete one image from a room.
    async deleteImage(c: Context) {
        const businessId = c.req.param("businessId");
        const roomId = c.req.param("roomId");

        if (!businessId || !roomId) {
            throw new AppError("businessId and roomId are required", 400);
    }

        const body = await c.req.json();
        if (typeof body?.publicId !== "string" || !body.publicId.trim()) {
            throw new AppError("publicId is required", 400);
        }

        const result = await roomService.deleteImage(businessId, roomId, body.publicId);

        return c.json(result);
    }

    // Delete a room by id.
    async delete(c: Context) {
        const businessId = c.req.param("businessId");
        const roomId = c.req.param("roomId");

        if (!businessId || !roomId) {
            throw new AppError("businessId and roomId are required", 400);
        }

        const result = await roomService.delete(businessId, roomId);

        return c.json(result);
    }

    // Update a room by id.
    async update (c:Context){
        const businessId = c.req.param("businessId");
        const roomId = c.req.param("roomId");

        if (!businessId || !roomId) {
            throw new AppError("businessId and roomId are required", 400);
        }

        const contentType = c.req.header("content-type") ?? "";

        if (
            contentType.includes("multipart/form-data") ||
            contentType.includes("application/x-www-form-urlencoded")
        ) {
            const formData = await c.req.formData();
            const images = await getImages(formData);

            const result = await roomService.update(businessId, roomId, {
                roomNumber: toOptionalString(formData.get("roomNumber")),
                floor: toOptionalNumber(formData.get("floor"), "floor"),
                capacity: toOptionalNumber(formData.get("capacity"), "capacity"),
                occupied: toOptionalNumber(formData.get("occupied"), "occupied"),
                rent: toOptionalNumber(formData.get("rent"), "rent"),
                electricity: toOptionalNumber(
                    formData.get("electricity"),
                    "electricity",
                ),
                status: toOptionalString(formData.get("status")) as
                    | "FULL"
                    | "NOT_FULL"
                    | undefined,
                roomPhotos: images.length ? await roomService.uploadImages(images) : undefined,
            });

            return c.json(result);
        }

        const body = await c.req.json();

        const result = await roomService.update(businessId, roomId, body);

        return c.json(result);
    }
}

export const roomController = new RoomController();