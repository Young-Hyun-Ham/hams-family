// src/features/chat/mock.ts
import type { ChatMessage, ChatRoom } from "./types";

export const mockRooms: ChatRoom[] = [
  {
    id: "family",
    title: "🏠 우리 가족",
    lastMessage: "오늘 저녁 뭐 먹을까?",
    lastAt: Date.now() - 1000 * 60 * 3,
    unreadCount: 2,
    avatarText: "F",
  },
  {
    id: "dm-mom",
    title: "엄마",
    lastMessage: "약 챙겨 먹었지?",
    lastAt: Date.now() - 1000 * 60 * 40,
    unreadCount: 0,
    avatarText: "엄",
  },
  {
    id: "dm-dad",
    title: "아빠",
    lastMessage: "주말에 시간 되니?",
    lastAt: Date.now() - 1000 * 60 * 120,
    unreadCount: 1,
    avatarText: "아",
  },
];

export const mockMessagesByRoom: Record<string, ChatMessage[]> = {
  family: [
    {
      id: "m1",
      roomId: "family",
      text: "다들 오늘 몇 시에 와?",
      createdAt: Date.now() - 1000 * 60 * 25,
      senderId: "mom",
      senderName: "엄마",
    },
    {
      id: "m2",
      roomId: "family",
      text: "6시쯤 도착할 듯!",
      createdAt: Date.now() - 1000 * 60 * 20,
      senderId: "me",
      senderName: "나",
    },
    {
      id: "m3",
      roomId: "family",
      text: "오늘 저녁 뭐 먹을까?",
      createdAt: Date.now() - 1000 * 60 * 3,
      senderId: "dad",
      senderName: "아빠",
    },
  ],
  "dm-mom": [
    {
      id: "m1",
      roomId: "dm-mom",
      text: "약 챙겨 먹었지?",
      createdAt: Date.now() - 1000 * 60 * 40,
      senderId: "mom",
      senderName: "엄마",
    },
    {
      id: "m2",
      roomId: "dm-mom",
      text: "응! 먹었어 ㅎㅎ",
      createdAt: Date.now() - 1000 * 60 * 38,
      senderId: "me",
      senderName: "나",
    },
  ],
  "dm-dad": [
    {
      id: "m1",
      roomId: "dm-dad",
      text: "주말에 시간 되니?",
      createdAt: Date.now() - 1000 * 60 * 120,
      senderId: "dad",
      senderName: "아빠",
    },
  ],
};
