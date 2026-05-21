import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { storage } from "./config";

export const uploadTripPhoto = async (userId, tripId, file) => {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `users/${userId}/trips/${tripId}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
};

export const deleteTripPhoto = async (photoUrl) => {
  try {
    const storageRef = ref(storage, photoUrl);
    await deleteObject(storageRef);
  } catch (error) {
    console.error("Error deleting photo:", error);
  }
};

/**
 * Upload a support issue screenshot to Cloudinary.
 * Uses the same Cloudinary account already configured for journal photos.
 */
export const uploadIssuePhoto = async (_userId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append(
    "upload_preset",
    import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "ml_default"
  );
  formData.append("folder", "tripvault/support");

  const cloudName =
    import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "ml_default";

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: formData }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.error?.message || "Failed to upload screenshot to Cloudinary"
    );
  }

  return data.secure_url;
};

