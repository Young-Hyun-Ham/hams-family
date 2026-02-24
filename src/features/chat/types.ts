// src/features/chat/types.ts

export type ChatMessageType = "user" | "system";

export type ChatRoom = {
  id: string;
  title: string;
  lastMessage?: string;
  lastAt?: number; // epoch ms
  unreadCount?: number;
  avatarText?: string; // UI용
};

export type ChatMessage = {
  id: string;
  roomId: string;
  type?: ChatMessageType;
  text: string;
  senderId: string | null;
  senderName?: string | null;
  createdAt: any;
};
