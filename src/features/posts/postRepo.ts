// src/features/posts/postRepo.ts
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  limit,
} from "firebase/firestore";
import { db } from "@/src/lib/firebase";
import type { Post } from "./types";

export async function createPost(params: { authorId: string; title: string; content: string }) {
  const ref = await addDoc(collection(db, "posts"), {
    authorId: params.authorId,
    title: params.title,
    content: params.content,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listPosts() {
  const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(50));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Post[];
}

export async function getPost(postId: string) {
  const snap = await getDoc(doc(db, "posts", postId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...(snap.data() as any) } as Post;
}

export async function updatePost(postId: string, data: Partial<Pick<Post, "title" | "content">>) {
  await updateDoc(doc(db, "posts", postId), { ...data, updatedAt: serverTimestamp() });
}

export async function removePost(postId: string) {
  await deleteDoc(doc(db, "posts", postId));
}