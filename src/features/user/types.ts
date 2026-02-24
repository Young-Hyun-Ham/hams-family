// src/features/user/types.ts
export type User = {
  uid: string;
  email?: string | null;
  name?: string | null;
  photoURL?: string | null;
  phone?: string | null;
  role?: string | null;
  createdAt?: any;
  updatedAt?: any;
};

export type FamilyDoc = {
  id?: string;
  name?: string;
  headerTitle?: string;
  bodyTitle?: string;
  bodyMarkdown?: string;
  footer?: string;
};
