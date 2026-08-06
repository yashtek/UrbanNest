import { v2 as cloudinary } from "cloudinary";
import { AppError } from "../middleware/error.middleware";

const cloudName = Bun.env.CLOUDINARY_CLOUD_NAME;
const apiKey = Bun.env.CLOUDINARY_API_KEY;
const apiSecret = Bun.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  throw new AppError("Cloudinary is not configured", 500);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

export { cloudinary };