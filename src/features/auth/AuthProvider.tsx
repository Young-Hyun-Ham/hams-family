// src/features/auth/AuthProvider.tsx
import { auth } from "@/src/lib/firebase";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { upsertUser } from "../user/userRepo";

type AuthCtx = {
  user: User | null;
  loading: boolean;
};

const Ctx = createContext<AuthCtx>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u ?? null);
      setLoading(false);

      // 로그인 성공 시 users/{uid} upsert
      if (u) {
        try {
          await upsertUser({
            uid: u.uid,
            email: u.email,
            name: u.displayName,
            photoURL: u.photoURL,
          });
        } catch (e) {
          console.warn("upsertUser failed:", e);
        }
      }
    });

    return unsub;
  }, []);

  const value = useMemo(() => ({ user, loading }), [user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  return useContext(Ctx);
}
