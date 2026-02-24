// src/features/families/familyRepo.ts
import { db, storage } from "@/src/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import { User } from "../user/types";

import { getDownloadURL, ref, uploadBytes } from "firebase/storage";

export type Family = {
  id: string;
  name: string;
};

const SAMPLE_BODY_MARKDOWN = `## 👨‍👩‍👧‍👦 우리 가족 앱에 오신 걸 환영해요!

이 앱은 **우리 가족만** 사용하는 공간이에요.  
여기서는 아래 기능을 사용할 수 있어요:

### ✅ 오늘 할 일
- [ ] 가족 단톡방에서 안부 인사하기
- [ ] 추억 페이지에 사진 1장 올리기
- [ ] 이번 주 가족 일정 공유하기

### 📌 공지사항
- 초대 코드는 **가족장(Owner)**만 발급할 수 있어요.
- 사진은 자동으로 Firebase Storage에 저장돼요.
- 채팅은 실시간(onSnapshot)으로 동작해요.

### 🔗 자주 쓰는 링크
- [우리 가족 단톡방](app://chat)
- [추억 타임라인](app://posts)

> 문의/요청사항은 단톡방에 남겨줘 🙂
`;

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
 * ✅ 이미지 업로드 → 다운로드 URL 반환
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
