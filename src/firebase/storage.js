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
