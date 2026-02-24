// app/(modals)/signup.tsx
import { initFamilies } from "@/src/features/families/familyRepo";
import { upsertUser } from "@/src/features/user/userRepo";
import { auth } from "@/src/lib/firebase";
import { showAlert } from "@/src/utils/alert";
import { router } from "expo-router";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  TextInput,
} from "react-native";

export default function SignupModal() {
  // form
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    if (!email.trim()) return false;
    if (!pw) return false;
    if (pw !== pw2) return false;
    if (!name.trim()) return false;
    if (!phone.trim()) return false;
    return true;
  }, [email, pw, pw2, name, phone]);

  async function submit() {
    if (!canSubmit) {
      if (pw !== pw2) showAlert("확인", "비밀번호 확인이 일치하지 않습니다.");
      else showAlert("확인", "입력값을 모두 채워주세요.");
      return;
    }

    try {
      // console.log("=============familyId ::: ", familyId);
      setSaving(true);

      // firebase console > Authentication > 사용자 > 사용자 자동 등록
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), pw);

      // displayName 업데이트
      await updateProfile(cred.user, { displayName: name.trim() });

      // Firestore 유저/멤버십 기록
      const userInfo = await upsertUser({
        uid: cred.user.uid,
        email: cred.user.email,
        name: name.trim(),
        photoURL: cred.user.photoURL,
        phone: phone.trim(),
      });
      console.log("userInfo =====================> ", userInfo);
      // 패밀리 생성
      try {
        if (userInfo) await initFamilies(userInfo);
      } catch (e: any) {
        console.log("init families error ======>", e);
      }

      showAlert("완료", "회원가입이 완료되었습니다.");
      router.push("/login");
    } catch (e: any) {
      showAlert("회원가입 실패", e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView
      contentContainerStyle={{
        padding: 16,
        gap: 10,
        paddingBottom: 30,
      }}
    >
      <Text style={{ fontSize: 22, fontWeight: "800" }}>회원가입</Text>

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
        placeholder="비밀번호"
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        value={pw2}
        onChangeText={setPw2}
        placeholder="비밀번호 확인"
        secureTextEntry
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="이름"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      <TextInput
        value={phone}
        onChangeText={setPhone}
        placeholder="전화번호"
        keyboardType="phone-pad"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />

      {/* 가입 버튼 */}
      <Pressable
        onPress={submit}
        disabled={!canSubmit || saving}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
          opacity: !canSubmit || saving ? 0.5 : 1,
        }}
      >
        {saving ? (
          <ActivityIndicator />
        ) : (
          <Text style={{ fontWeight: "800" }}>가입하기</Text>
        )}
      </Pressable>

      {/* 취소 */}
      <Pressable
        onPress={() => router.back()}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>취소</Text>
      </Pressable>
    </ScrollView>
  );
}
