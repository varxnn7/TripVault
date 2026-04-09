import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./config";

// ============ USER ============
export const getUserDoc = async (userId) => {
  const snap = await getDoc(doc(db, "users", userId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const updateUserDoc = async (userId, data) => {
  await updateDoc(doc(db, "users", userId), data);
};

// ============ TRIPS ============
export const createTrip = async (userId, tripData) => {
  const ref = await addDoc(collection(db, "users", userId, "trips"), {
    ...tripData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateTrip = async (userId, tripId, tripData) => {
  await updateDoc(doc(db, "users", userId, "trips", tripId), {
    ...tripData,
    updatedAt: serverTimestamp(),
  });
};

export const deleteTrip = async (userId, tripId) => {
  // Delete subcollections first
  const subcollections = ["itinerary", "expenses", "journal"];
  for (const sub of subcollections) {
    const snap = await getDocs(collection(db, "users", userId, "trips", tripId, sub));
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  }
  await deleteDoc(doc(db, "users", userId, "trips", tripId));
};

export const getTrip = async (userId, tripId) => {
  const snap = await getDoc(doc(db, "users", userId, "trips", tripId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const subscribeToTrips = (userId, callback) => {
  const q = query(
    collection(db, "users", userId, "trips"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const trips = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(trips);
  });
};

// ============ ITINERARY ============
export const addItineraryDay = async (userId, tripId, dayData) => {
  const ref = await addDoc(
    collection(db, "users", userId, "trips", tripId, "itinerary"),
    { ...dayData, createdAt: serverTimestamp() }
  );
  return ref.id;
};

export const updateItineraryDay = async (userId, tripId, dayId, dayData) => {
  await updateDoc(
    doc(db, "users", userId, "trips", tripId, "itinerary", dayId),
    dayData
  );
};

export const deleteItineraryDay = async (userId, tripId, dayId) => {
  await deleteDoc(doc(db, "users", userId, "trips", tripId, "itinerary", dayId));
};

export const subscribeToItinerary = (userId, tripId, callback) => {
  const q = query(
    collection(db, "users", userId, "trips", tripId, "itinerary"),
    orderBy("dayNumber", "asc")
  );
  return onSnapshot(q, (snapshot) => {
    const days = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(days);
  });
};

// ============ EXPENSES ============
export const addExpense = async (userId, tripId, expenseData) => {
  const ref = await addDoc(
    collection(db, "users", userId, "trips", tripId, "expenses"),
    { ...expenseData, createdAt: serverTimestamp() }
  );
  return ref.id;
};

export const updateExpense = async (userId, tripId, expenseId, data) => {
  await updateDoc(
    doc(db, "users", userId, "trips", tripId, "expenses", expenseId),
    data
  );
};

export const deleteExpense = async (userId, tripId, expenseId) => {
  await deleteDoc(
    doc(db, "users", userId, "trips", tripId, "expenses", expenseId)
  );
};

export const subscribeToExpenses = (userId, tripId, callback) => {
  const q = query(
    collection(db, "users", userId, "trips", tripId, "expenses"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const expenses = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(expenses);
  });
};

// ============ JOURNAL ============
export const addJournalEntry = async (userId, tripId, entryData) => {
  const ref = await addDoc(
    collection(db, "users", userId, "trips", tripId, "journal"),
    { ...entryData, createdAt: serverTimestamp() }
  );
  return ref.id;
};

export const updateJournalEntry = async (userId, tripId, entryId, data) => {
  await updateDoc(
    doc(db, "users", userId, "trips", tripId, "journal", entryId),
    data
  );
};

export const deleteJournalEntry = async (userId, tripId, entryId) => {
  await deleteDoc(
    doc(db, "users", userId, "trips", tripId, "journal", entryId)
  );
};

export const subscribeToJournal = (userId, tripId, callback) => {
  const q = query(
    collection(db, "users", userId, "trips", tripId, "journal"),
    orderBy("createdAt", "desc")
  );
  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    callback(entries);
  });
};
