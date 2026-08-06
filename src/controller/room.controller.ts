import { Context } from "hono";
import { AppError } from "../middleware/error.middleware";
import { roomService } from "../service/room.service";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

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

const toString = (value: FormDataEntryValue | null, field: string) => {
    if (typeof value !== "string" || value.trim() === "") {
        throw new AppError(`${field} is required`, 400);
    }

    return value;
};

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

class RoomController{
    async create(c:Context){
        const businessId = c.req.param("businessId");
        if (!businessId) {
            throw new AppError("businessId is required", 400);
    }

        const formData = await c.req.formData();
        const images = await getImages(formData);

        const result = await roomService.create(businessId, {
            roomNumber: toString(formData.get("roomNumber"), "roomNumber"),
            floor: toNumber(formData.get("floor"), "floor"),
            capacity: toNumber(formData.get("capacity"), "capacity"),
            rent: toNumber(formData.get("rent"), "rent"),
            electricity: toNumber(formData.get("electricity"), "electricity"),
            roomPhotos: images.length ? await roomService.uploadImages(images) : [],
        });

        return c.json(result,201);
    }

    async getAll(c:Context){
        const businessId = c.req.param("businessId");
        if (!businessId) {
            throw new AppError("businessId is required", 400);
    }

        const result = await roomService.getAll(businessId);

        return c.json(result);
    }

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

    async delete(c: Context) {
        const businessId = c.req.param("businessId");
        const roomId = c.req.param("roomId");

        if (!businessId || !roomId) {
            throw new AppError("businessId and roomId are required", 400);
        }

        const result = await roomService.delete(businessId, roomId);

        return c.json(result);
    }

    async update (c:Context){
        try{
            const businessId = c.req.param("businessId");
            const roomId = c.req.param("roomId");

            if (!businessId || !roomId) {
                throw new AppError("businessId and roomId are required", 400);
            }

            const body = await c.req.json();

            const result = await roomService.update(
                    businessId,
                    roomId,
                    body,
            );

            return c.json(result);
        }catch(err){
            throw err;
        }
    }
}

export const roomController = new RoomController();