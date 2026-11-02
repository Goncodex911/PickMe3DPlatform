/**
 * Media Upload Service - Uploads images and media directly to Cloudinary via PickMe3D Backend API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5001/api";

export interface CloudinaryUploadResponse {
  success: boolean;
  message?: string;
  data?: {
    url: string;
    publicId: string;
    format: string;
    resourceType: string;
    bytes: number;
    width?: number;
    height?: number;
    duration?: number;
  };
}

/**
 * Uploads a File or Blob directly to Cloudinary
 * @param file File or Blob object
 * @param folder Destination folder on Cloudinary
 */
export async function uploadFileToCloudinary(
  file: File | Blob,
  folder = "pickme3d/media"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Upload failed (${res.status}): ${errorText}`);
  }

  const json: CloudinaryUploadResponse = await res.json();
  if (!json.success || !json.data?.url) {
    throw new Error(json.message || "Failed to upload media to Cloudinary");
  }

  return json.data.url;
}

/**
 * Uploads a base64 Data URI to Cloudinary
 * @param dataUri Base64 Data URI string (e.g. data:image/png;base64,...)
 * @param folder Destination folder on Cloudinary
 */
export async function uploadBase64ToCloudinary(
  dataUri: string,
  folder = "pickme3d/media"
): Promise<string> {
  const res = await fetch(`${API_BASE}/upload/base64`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      dataUri,
      folder,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Base64 upload failed (${res.status}): ${errorText}`);
  }

  const json: CloudinaryUploadResponse = await res.json();
  if (!json.success || !json.data?.url) {
    throw new Error(json.message || "Failed to upload base64 to Cloudinary");
  }

  return json.data.url;
}

/**
 * Universal media uploader: accepts File, Blob, or Data URI
 * Returns the permanent Cloudinary HTTPS URL
 */
export async function uploadToCloudinary(
  media: File | Blob | string,
  folder = "pickme3d/media"
): Promise<string> {
  if (typeof media === "string") {
    // If it's already a hosted URL (Cloudinary or http/https), no need to re-upload
    if (/^https?:\/\//i.test(media)) {
      return media;
    }
    return await uploadBase64ToCloudinary(media, folder);
  }

  return await uploadFileToCloudinary(media, folder);
}
