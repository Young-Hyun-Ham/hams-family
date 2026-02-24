// src/features/chat/chatRepo.ts
import { db } from "@/src/lib/firebase"; // 너 프로젝트에서 이미 쓰는 경로 기준
import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  FirestoreError,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from "firebase/firestore";
import { findUserByEmail } from "../user/userRepo";
import type { ChatMessage, ChatRoom } from "./types";

/**
 * Firestore 타입 보정(런타임 변환)
 */
function tsToMs(ts: any): number | undefined {
  // serverTimestamp()는 처음엔 null일 수 있음
  if (!ts) return undefined;
  if (typeof ts === "number") return ts;
  if (typeof ts?.toMillis === "function") return ts.toMillis();
  return undefined;
}

export type CreateRoomInput = {
  roomId?: string; // 지정 가능(없으면 auto id)
  type: "group" | "dm";
  title: string;
  memberUids: string[]; // 반드시 본인 포함
  createdBy: string; // uid
  familyId?: "default";
  email?: string;
  uid: string;
};

/**
 * 채팅방 생성 (room + members 서브컬렉션 초기화)
 * - Rules: 가족 멤버만 가능
 */
export async function createRoom(input: CreateRoomInput) {
  if (!input.uid) {
    throw new Error("familyId is required. (default 사용 금지)");
  }
  const familyId = input.uid;
  const roomRef = input.roomId
    ? doc(db, "chatRooms", input.roomId)
    : doc(collection(db, "chatRooms"));

  const roomId = roomRef.id;

  // 1) room doc
  await setDoc(roomRef, {
    familyId,
    type: input.type,
    title: input.title,
    createdAt: serverTimestamp(),
    createdBy: input.createdBy,
    memberUids: Array.from(new Set(input.memberUids)),
    lastMessage: null,
    lastReadAtByUid: {
      [input.createdBy]: serverTimestamp(),
    },
  });

  await addSystemMessage({
    roomId: roomRef.id,
    text: `${(await findUserByEmail(input.email ?? "").then((v) => v.name)) ?? "누군가"}님이 방을 생성하였습니다`,
  });

  // 2) members subcollection docs
  // MVP: 멤버들의 member docs를 다 만들어 둬야 Rules에서 접근 가능해짐
  await Promise.all(
    Array.from(new Set(input.memberUids)).map((uid) =>
      setDoc(doc(db, "chatRooms", roomId, "members", uid), {
        uid,
        role: uid === input.createdBy ? "owner" : "member",
        joinedAt: serverTimestamp(),
      }),
    ),
  );

  return { roomId };
}

// 채팅 목록 디버그용
export async function debugListRoomsOnce(myUid: string) {
  const q = query(
    collection(db, "chatRooms"),
    where("memberUids", "array-contains", myUid),
    orderBy("createdAt", "desc"),
    limit(20),
  );

  try {
    const snap = await getDocs(q);
    console.log("[debugListRoomsOnce] size=", snap.size);
    snap.docs.forEach((d) => console.log("room:", d.id, d.data()));
  } catch (e: any) {
    console.error("[debugListRoomsOnce ERROR]", e);
    console.error("code=", e?.code, "message=", e?.message);
  }
}

/**
 * 내 채팅방 목록 실시간 구독
 * - room.memberUids array-contains 로 빠르게 목록을 뽑음
 * - Rules는 members 서브컬렉션 존재로 막지만,
 *   목록 쿼리 자체는 room doc read 권한이 있어야 하므로,
 *   createRoom에서 members/{uid} 반드시 만들어져야 함.
 */
export function subscribeMyRooms(
  myUid: string,
  onChange: (rooms: ChatRoom[]) => void,
  onError?: (e: unknown) => void,
): Unsubscribe {
  const q = query(
    collection(db, "chatRooms"),
    where("memberUids", "array-contains", myUid),
    orderBy("createdAt", "desc"),
    limit(200),
  );

  return onSnapshot(
    q,
    (snap) => {
      const rooms: ChatRoom[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          title: data.title ?? "채팅",
          lastMessage: data?.lastMessage?.text ?? "",
          lastAt:
            tsToMs(data?.lastMessage?.createdAt) ?? tsToMs(data?.createdAt),
          unreadCount: 0, // MVP에서는 client에서 계산 or 다음 단계에서 서버/맵 기반 계산
          avatarText: (data.title ?? "C").slice(0, 1),
        };
      });
      onChange(rooms);
    },
    (e) => onError?.(e),
  );
}

export type SendMessageInput = {
  roomId: string;
  text: string;
  senderId: string;
  senderName?: string | null;
};

/**
 * (옵션) 방 접근 가능한지 체크 (members/{uid} 존재 확인)
 * - 라우팅 들어가기 전에 guard로 쓸 수 있음
 */
export async function assertRoomMember(roomId: string, uid: string) {
  const ref = doc(db, "chatRooms", roomId, "members", uid);
  const s = await getDoc(ref);
  if (!s.exists()) throw new Error("NOT_A_ROOM_MEMBER");
}

/**
 * 메시지 실시간 구독
 * - orderBy(createdAt) (서버타임스탬프 초기 null 주의)
 */
export function subscribeMessages(
  roomId: string,
  onChange: (messages: ChatMessage[]) => void,
  onError?: (e: FirestoreError) => void,
): Unsubscribe {
  const q = query(
    collection(db, "chatRooms", roomId, "messages"),
    orderBy("createdAt", "asc"),
    limit(500),
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: ChatMessage[] = snap.docs.map((d) => {
        const data = d.data() as any;
        return {
          id: d.id,
          roomId,
          text: data.text ?? "",
          type: data.type ?? "text",
          senderId: data.senderId,
          senderName: data.senderName ?? null,
          createdAt: tsToMs(data.createdAt) ?? Date.now(),
        };
      });
      onChange(list);
    },
    (e) => onError?.(e),
  );
}

/**
 * 메시지 전송
 * 1) messages addDoc
 * 2) room lastMessage 갱신
 * 3) 본인 lastReadAtByUid 갱신 (보낸 사람은 읽음 처리)
 */
export async function sendMessage(params: {
  roomId: string;
  text: string;
  senderId: string;
  senderName?: string | null;
}) {
  const text = params.text.trim();
  if (!text) return;

  // 1) 메시지 추가
  await addDoc(collection(db, "chatRooms", params.roomId, "messages"), {
    type: "text",
    text,
    senderId: params.senderId,
    senderName: params.senderName ?? null,
    createdAt: serverTimestamp(),
  });

  // 2) room summary 업데이트
  await updateDoc(doc(db, "chatRooms", params.roomId), {
    updatedAt: serverTimestamp(),
    lastMessage: {
      text,
      senderId: params.senderId,
      createdAt: serverTimestamp(),
    },
    [`lastReadAtByUid.${params.senderId}`]: serverTimestamp(), // 보낸 사람은 읽음 처리
  });
}

/**
 * 읽음 처리 (MVP: lastReadAtByUid 방식)
 * - 채팅방 열었을 때 호출
 */
export async function markRoomRead(roomId: string, uid: string) {
  await updateDoc(doc(db, "chatRooms", roomId), {
    [`lastReadAtByUid.${uid}`]: serverTimestamp(),
  });
}

// 방에 멤버 추가 (초대)
export async function addMemberToRoom(params: { roomId: string; uid: string }) {
  const roomRef = doc(db, "chatRooms", params.roomId);

  // 1) room.memberUids 추가
  await updateDoc(roomRef, {
    memberUids: arrayUnion(params.uid),
    updatedAt: serverTimestamp(),
  });

  // 2) members 서브컬렉션에도 생성(권장)
  await setDoc(
    doc(db, "chatRooms", params.roomId, "members", params.uid),
    {
      role: "member",
      joinedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

// 시스템 메시지 전용 함수
export async function addSystemMessage(params: {
  roomId: string;
  text: string;
}) {
  const { roomId, text } = params;

  const roomRef = doc(db, "chatRooms", roomId);
  const msgCol = collection(db, "chatRooms", roomId, "messages");
  const msgRef = doc(msgCol);

  const batch = writeBatch(db);

  batch.update(roomRef, { updatedAt: serverTimestamp() });

  batch.set(msgRef, {
    roomId,
    type: "system",
    text,
    senderId: null,
    senderName: null,
    createdAt: serverTimestamp(),
  });

  await batch.commit();
}

// 나가기 (Leave Room)
export async function leaveRoom(params: {
  roomId: string;
  uid: string;
  name: string | null;
}) {
  const { roomId, uid, name } = params;

  const roomRef = doc(db, "chatRooms", roomId);

  await updateDoc(roomRef, {
    members: arrayRemove(uid),
    updatedAt: serverTimestamp(),
  });

  await addSystemMessage({
    roomId,
    text: `${name ?? "누군가"}가 채팅방을 나갔습니다`,
  });
}

// 방 제목 변경
export async function changeRoomTitle(params: {
  roomId: string;
  newTitle: string;
  changerName: string | null;
}) {
  const { roomId, newTitle, changerName } = params;

  await updateDoc(doc(db, "chatRooms", roomId), {
    title: newTitle,
    updatedAt: serverTimestamp(),
  });

  await addSystemMessage({
    roomId,
    text: `${changerName ?? "누군가"}가 방 제목을 "${newTitle}"(으)로 변경하였습니다`,
  });
}

// 강퇴
export async function kickMember(params: {
  roomId: string;
  targetUid: string;
  targetName: string | null;
  kickerName: string | null;
}) {
  await updateDoc(doc(db, "chatRooms", params.roomId), {
    members: arrayRemove(params.targetUid),
    updatedAt: serverTimestamp(),
  });

  await addSystemMessage({
    roomId: params.roomId,
    text: `${params.kickerName}가 ${params.targetName}를 강퇴하였습니다`,
  });
}
