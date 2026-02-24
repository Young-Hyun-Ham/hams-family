// src/features/posts/types.ts
export type Post = {
  id: string;
  authorId: string;
  title: string;
  content: string;
  createdAt?: any;
  updatedAt?: any;
};