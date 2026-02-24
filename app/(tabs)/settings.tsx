// app/(tabs)/settings.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import { auth } from "@/src/lib/firebase";
import { showAlert } from "@/src/utils/alert";
import { useNavigation, useRouter } from "expo-router";
import { signOut } from "firebase/auth";
import { Pressable, Text, View } from "react-native";

export default function Settings() {
  const router = useRouter();
  const navigation = useNavigation();
  navigation.setOptions({ title: "설정" });

  const { user } = useAuth();

  async function onLogout() {
    try {
      await signOut(auth);
      showAlert("로그아웃", "로그아웃 되었습니다.");
      // 뒤로가기로 돌아오지 않게 replace 추천
      router.replace("/(auth)/login");
    } catch (e: any) {
      showAlert("로그아웃 실패", e?.message ?? String(e));
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 12, backgroundColor: "#fff" }}>
      {/* <Text style={{ fontSize: 18, fontWeight: "800" }}>설정</Text> */}

      <View
        style={{
          padding: 14,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: "#eee",
          gap: 6,
        }}
      >
        <Text style={{ fontWeight: "800" }}>
          {user?.displayName ?? "사용자"}
        </Text>
        <Text style={{ color: "#666" }}>{user?.email ?? ""}</Text>
      </View>

      {/* 서브 메뉴 형태 */}
      <View style={{ marginTop: 6, gap: 10 }}>
        <Pressable
          onPress={() => router.push("/(modals)/home-edit")}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#eee",
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800" }}>홈 본문 편집</Text>
        </Pressable>

        <Pressable
          onPress={onLogout}
          style={{
            padding: 14,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: "#eee",
            alignItems: "center",
          }}
        >
          <Text style={{ fontWeight: "800" }}>로그아웃</Text>
        </Pressable>
      </View>
    </View>
  );
}
