// app/_layout.tsx
import { AuthProvider } from "@/src/features/auth/AuthProvider";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerTitleAlign: "center" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* 그룹 라우트 */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* 모달 라우트 */}
        <Stack.Screen
          name="(modals)/signup"
          options={{ presentation: "modal", title: "회원가입" }}
        />
        <Stack.Screen
          name="(modals)/home-edit"
          options={{ presentation: "modal", title: "홈 화면 편집" }}
        />
        <Stack.Screen
          name="(modals)/posts-edit"
          options={{ presentation: "modal", title: "추억 작성" }}
        />
        <Stack.Screen
          name="(modals)/invite-room"
          options={{ presentation: "modal", title: "맴버 초대" }}
        />
      </Stack>
    </AuthProvider>
  );
}
