// src/features/families/familyRepo.ts
import { db, storage } from "@/src/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";
import { User } from "../user/types";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export type Family = {
  id: string;
  name: string;
};

const SAMPLE_BODY_MARKDOWN = `## 팸앱에 오신 걸 환영해요!
메인을 Markdown으로 꾸며보세요.

> 문의/요청사항은 단톡방에 남겨줘.
`;

export async function getMyFamilyId(uid: string, type?: string) {
  const q = query(
    collection(db, "families"),
    where("memberUids", "array-contains", uid),
    limit(1),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return snap.docs[0].id;
}

export async function listFamilies(): Promise<Family[]> {
  const q = query(collection(db, "families"), orderBy("name"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      id: d.id,
      name: String(data?.name ?? d.id),
    };
  });
}

export async function initFamilies(userInfo: User): Promise<Family> {
  const familyId = userInfo.uid;

  // families 본문(문서)
  const familyRef = doc(db, "families", familyId);
  const payload = {
    id: familyId,
    name: userInfo.name ?? "유저",
    headerTitle: `${userInfo.name ?? "가족"}에 오신걸 환영합니다.`,
    bodyTitle: `${userInfo.name ?? "가족"}의 공간`,
    bodyMarkdown: SAMPLE_BODY_MARKDOWN,
    footer: "하단내용",
    ownerUid: familyId,
    memberUids: [familyId],
    createdAt: serverTimestamp(),
  };
  await setDoc(familyRef, payload, { merge: true });

  // members 하위 컬렉션 (문서ID = uid 고정)
  const memberRef = doc(db, "families", familyId, "members", familyId);
  await setDoc(
    memberRef,
    {
      uid: familyId,
      role: "owner",
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  return { id: payload.id, name: payload.name };
}

export async function updateFamilyBodyMarkdown(params: {
  familyId: string;
  bodyMarkdown: string;
}) {
  const familyRef = doc(db, "families", params.familyId);
  await setDoc(
    familyRef,
    {
      bodyMarkdown: params.bodyMarkdown,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

/**
 * 이미지 업로드 → 다운로드 URL 반환
 * - path: families/{familyId}/home/{timestamp}.jpg
 */
export async function uploadFamilyHomeImage(params: {
  familyId: string;
  fileUri: string;
  mimeType?: string;
}) {
  const res = await fetch(params.fileUri);
  const blob = await res.blob();

  const ext = params.mimeType?.includes("png")
    ? "png"
    : params.mimeType?.includes("webp")
      ? "webp"
      : "jpg";

  const filePath = `families/${params.familyId}/home/${Date.now()}.${ext}`;
  const storageRef = ref(storage, filePath);

  await uploadBytes(storageRef, blob, {
    contentType: params.mimeType ?? "image/jpeg",
  });

  const url = await getDownloadURL(storageRef);
  return { url, filePath };
}
