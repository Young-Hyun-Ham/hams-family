// app/(tabs)/post-new.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import { createPost } from "@/src/features/posts/postRepo";
import { useNavigation } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

export default function PostNew() {
  const navigation = useNavigation();
  navigation.setOptions({ title: "작성" });

  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  async function submit() {
    if (!user) return;
    if (!title.trim()) return Alert.alert("확인", "제목을 입력해줘");
    if (!content.trim()) return Alert.alert("확인", "내용을 입력해줘");

    try {
      await createPost({
        authorId: user.uid,
        title: title.trim(),
        content: content.trim(),
      });
      setTitle("");
      setContent("");
      Alert.alert("완료", "저장했어!");
    } catch (e: any) {
      Alert.alert("저장 실패", e?.message ?? String(e));
    }
  }

  return (
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Text style={{ fontSize: 18, fontWeight: "700" }}>추억 글 작성</Text>

      <TextInput
        value={title}
        onChangeText={setTitle}
        placeholder="제목"
        style={{ borderWidth: 1, borderRadius: 10, padding: 12 }}
      />
      <TextInput
        value={content}
        onChangeText={setContent}
        placeholder="내용"
        multiline
        style={{
          borderWidth: 1,
          borderRadius: 10,
          padding: 12,
          minHeight: 160,
          textAlignVertical: "top",
        }}
      />

      <Pressable
        onPress={submit}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>저장</Text>
      </Pressable>
    </View>
  );
}
