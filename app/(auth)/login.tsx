// app/(auth)/login.tsx
import { auth } from "@/src/lib/firebase";
import { showAlert } from "@/src/utils/alert";
import { useNavigation, useRouter } from "expo-router";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useLayoutEffect, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

function prettyAuthError(e: any) {
  const code = e?.code ?? "";
  const msg = e?.message ?? String(e);
  const detail = e?.customData ? JSON.stringify(e.customData) : "";
  return `[${code}] ${msg}${detail ? `\n${detail}` : ""}`;
}

export default function Login() {
  const router = useRouter();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "로그인" });
  }, [navigation]);
  
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");

  async function signIn() {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pw);
      showAlert("로그인 성공", "환영합니다!");
      router.push("/home");
    } catch (e: any) {
      console.log("signIn error:", e);
      showAlert("로그인 실패", prettyAuthError(e));
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, justifyContent: "center", gap: 10 }}>
      {/* <Text style={{ fontSize: 24, fontWeight: "700" }}>가족 앱 로그인</Text> */}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="이메일"
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />
      <TextInput
        value={pw}
        onChangeText={setPw}
        placeholder="비밀번호(6자 이상)"
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <Pressable
        onPress={signIn}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>로그인</Text>
      </Pressable>

      <Pressable
        onPress={() => router.push("/(modals)/signup")}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>회원가입</Text>
      </Pressable>
    </View>
  );
}
