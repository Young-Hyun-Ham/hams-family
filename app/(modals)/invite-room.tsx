// app/modal/invite-room.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  addMemberToRoom,
  addSystemMessage,
} from "@/src/features/chat/chatRepo";
import { findUserByEmail } from "@/src/features/user/userRepo";
import { showAlert } from "@/src/utils/alert";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

export default function InviteRoomModal() {
  const router = useRouter();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "맴버초대" });
  }, [navigation]);

  const { user } = useAuth();

  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const rid = String(roomId ?? "");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function onInvite() {
    if (!rid) return;
    setLoading(true);
    try {
      const u = await findUserByEmail(email);
      if (!u?.uid) {
        showAlert("사용자 없음", "해당 이메일로 가입된 사용자가 없습니다.");
        return;
      }

      await addMemberToRoom({ roomId: rid, uid: u.uid });
      showAlert("초대 완료", "멤버를 채팅방에 추가했습니다.");
      console.log("user==========> ", user);
      await addSystemMessage({
        roomId,
        text: `${await findUserByEmail(user?.email ?? "").then((v) => v.name)}가 ${u.name}를 초대하였습니다`,
      });

      router.back();
    } catch (e: any) {
      console.error("[invite error]", e);
      showAlert("오류", e?.message ?? "초대에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16 }}>
      {/* <Text style={{ fontSize: 18, fontWeight: "900", marginBottom: 10 }}>
        멤버 초대
      </Text> */}
      <Text style={{ color: "#666", marginBottom: 12 }}>
        초대할 가족의 이메일을 입력하세요.
      </Text>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="example@gmail.com"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          borderColor: "#ddd",
          borderRadius: 12,
          paddingHorizontal: 12,
          paddingVertical: 12,
        }}
      />

      <Pressable
        onPress={onInvite}
        disabled={loading}
        style={{
          marginTop: 12,
          borderRadius: 12,
          paddingVertical: 12,
          alignItems: "center",
          backgroundColor: "#111",
          opacity: loading ? 0.6 : 1,
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900" }}>
          {loading ? "초대 중..." : "초대하기"}
        </Text>
      </Pressable>

      <Pressable
        onPress={() => router.back()}
        style={{ marginTop: 10, paddingVertical: 12, alignItems: "center" }}
      >
        <Text style={{ color: "#666", fontWeight: "800" }}>닫기</Text>
      </Pressable>
    </View>
  );
}
function inviteMemberToRoom(arg0: { roomId: string; text: string }) {
  throw new Error("Function not implemented.");
}
