import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import config from "../config";


cloudinary.config({
	cloud_name: config.cloudinary_cloude_name,
	api_key: config.cloudinary_cloude_key,
	api_secret: config.cloudinary_cloude_secret,
	secure: true,
});


export const uploadBufferToCloudinary = (
	buffer: Buffer,
	options: { folder: string; publicId?: string },
): Promise<UploadApiResponse> => {
	return new Promise((resolve, reject) => {
		const uploadStream = cloudinary.uploader.upload_stream(
			{
				folder: options.folder,
				public_id: options.publicId,
				resource_type: "image",
				overwrite: true,
			},
			(error, result) => {
				if (error || !result) {
					return reject(error || new Error("Cloudinary upload failed"));
				}
				resolve(result);
			},
		);

		uploadStream.end(buffer);
	});
};


export const deleteFromCloudinary = async (publicId: string) => {
	try {
		await cloudinary.uploader.destroy(publicId, { resource_type: "image" });
	} catch (error) {
		
		console.error("Failed to delete old Cloudinary asset:", error);
	}
};


export const extractPublicIdFromUrl = (secureUrl: string): string | null => {
	try {
		const afterUpload = secureUrl.split("/upload/")[1];
		if (!afterUpload) return null;

		
		const withoutVersion = afterUpload.replace(/^v\d+\//, "");
		const withoutExtension = withoutVersion.replace(/\.[^/.]+$/, "");

		return withoutExtension;
	} catch {
		return null;
	}
};

export { cloudinary };