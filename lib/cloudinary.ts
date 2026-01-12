import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export default cloudinary;

// Helper function to upload image
export async function uploadImage(
  file: File,
  folder: string = "laptop-store/products"
) {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  return new Promise((resolve, reject) => {
    cloudinary.uploader
      .upload_stream(
        {
          folder,
          transformation: [
            { width: 1200, height: 1200, crop: "limit" },
            { quality: "auto" },
          ],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      )
      .end(buffer);
  });
}

// Helper to delete image
export async function deleteImage(publicId: string) {
  return cloudinary.uploader.destroy(publicId);
}
