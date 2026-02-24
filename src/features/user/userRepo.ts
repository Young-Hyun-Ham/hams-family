// src/features/user/userRepo.ts
import { db } from "@/src/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { User } from "./types";

export async function findUserByEmail(email: string) {
  const e = email.trim().toLowerCase();
  if (!e) return null;

  const q = query(collection(db, "users"), where("email", "==", e));
  const snap = await getDocs(q);
  if (snap.empty) return null;

  const d = snap.docs[0];
  return { uid: d.id, ...(d.data() as any) };
}

// users 업서트 + 가족 가입 정보 저장 확장
export async function upsertUser(params: {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  phone?: string | null;
}): Promise<User> {
  const ref = doc(db, "users", params.uid);
  const payload: User = {
    uid: params.uid,
    email: params.email ?? null,
    name: params.name ?? null,
    photoURL: params.photoURL ?? null,
    phone: params.phone ?? null,
    role: "family",
    updatedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload, { merge: true });

  const { createdAt, updatedAt, ...result } = payload;
  return result;
}
