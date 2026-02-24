// app/(tabs)/home-edit.tsx
import * as ImagePicker from "expo-image-picker";
import { doc, getDoc } from "firebase/firestore";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image,
  ImageBackground,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Markdown from "react-native-markdown-display";

import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  updateFamilyBodyMarkdown,
  uploadFamilyHomeImage,
} from "@/src/features/families/familyRepo";
import { parseAppMarkdown } from "@/src/features/render/safeMarkdownWeb.native";
import { renderSafeHtmlFromMarkdown } from "@/src/features/render/safeMarkdownWeb.web";
import { db } from "@/src/lib/firebase";
import { showAlert } from "@/src/utils/alert";
import { useRouter } from "expo-router";

type FamilyDoc = {
  bodyMarkdown?: string;
};

export default function HomeEdit() {
  const router = useRouter();
  const { user } = useAuth();
  const familyId = user?.uid ?? null;

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [md, setMd] = useState("");

  // 커서 위치로 삽입하기 위한 selection 추적
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });

  // 웹 preview용 div ref
  const webPreviewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!familyId) return;

    (async () => {
      setLoading(true);
      const snap = await getDoc(doc(db, "families", familyId));
      const data = (snap.data() as FamilyDoc) ?? {};
      setMd(data.bodyMarkdown ?? "");
      setLoading(false);
    })();
  }, [familyId]);

  const safeHtml = useMemo(() => {
    if (Platform.OS !== "web") return "";
    return renderSafeHtmlFromMarkdown(md);
  }, [md]);

  function insertAtCursor(textToInsert: string) {
    const start = selection.start ?? md.length;
    const end = selection.end ?? md.length;

    const next = md.slice(0, start) + textToInsert + md.slice(end);
    setMd(next);

    const nextCursor = start + textToInsert.length;
    setSelection({ start: nextCursor, end: nextCursor });
  }

  async function onPickImage() {
    if (!familyId) return;

    // 권한(네이티브)
    if (Platform.OS !== "web") {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.9,
    });

    if (result.canceled) return;

    const asset = result.assets[0];
    const uri = asset.uri;
    const mimeType = asset.mimeType ?? "image/jpeg";

    // ✅ 업로드
    const { url } = await uploadFamilyHomeImage({
      familyId,
      fileUri: uri,
      mimeType,
    });

    // ✅ 마크다운 자동 삽입 (현재 커서 위치)
    insertAtCursor(`\n\n![image](${url})\n\n`);
  }

  async function onSave() {
    if (!familyId) return;
    await updateFamilyBodyMarkdown({ familyId, bodyMarkdown: md });
    // 최소 UX: 저장 완료 표시(원하면 alert 유틸로)
    if (Platform.OS === "web") {
      showAlert("저장 완료!");
      router.push("/home");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 }}>
      {/* <Text style={{ fontSize: 18, fontWeight: "800" }}>홈 본문 편집</Text> */}

      {/* 상단 버튼 바 */}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          onPress={() => setMode("edit")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#eee",
            backgroundColor: mode === "edit" ? "#111" : "#fff",
          }}
        >
          <Text
            style={{
              color: mode === "edit" ? "#fff" : "#111",
              fontWeight: "800",
            }}
          >
            편집
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setMode("preview")}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#eee",
            backgroundColor: mode === "preview" ? "#111" : "#fff",
          }}
        >
          <Text
            style={{
              color: mode === "preview" ? "#fff" : "#111",
              fontWeight: "800",
            }}
          >
            미리보기
          </Text>
        </Pressable>

        <View style={{ flex: 1 }} />

        <Pressable
          onPress={onPickImage}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#eee",
            backgroundColor: "#fff",
          }}
        >
          <Text style={{ color: "#111", fontWeight: "800" }}>이미지 추가</Text>
        </Pressable>

        <Pressable
          onPress={onSave}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111",
            backgroundColor: "#111",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>저장</Text>
        </Pressable>
      </View>

      {/* 본문 */}
      <View
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: "#eee",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        {loading ? (
          <View style={{ padding: 16 }}>
            <Text>로딩중...</Text>
          </View>
        ) : mode === "edit" ? (
          <TextInput
            value={md}
            onChangeText={setMd}
            multiline
            placeholder="Markdown을 입력하세요..."
            style={{
              flex: 1,
              padding: 12,
              textAlignVertical: "top",
              fontSize: 14,
              lineHeight: 20,
            }}
            onSelectionChange={(e) => setSelection(e.nativeEvent.selection)}
            selection={selection}
          />
        ) : Platform.OS === "web" ? (
          // ✅ 웹 미리보기: safeHtml
          <div
            ref={(n) => {
              webPreviewRef.current = n;
            }}
            style={{
              height: "100%",
              overflowY: "auto",
              padding: 12,
              lineHeight: 1.6,
            }}
            dangerouslySetInnerHTML={{ __html: safeHtml }}
          />
        ) : (
          // ✅ 네이티브 미리보기 수정
          <ScrollView style={{ flex: 1 }}>
            {(() => {
              const { backgroundUrl, cleanMd } = parseAppMarkdown(md);

              // 배경 이미지가 있을 경우 ImageBackground로 감싸줌
              const Content = (
                // Markdown 컴포넌트에 rules 추가
                <Markdown
                  rules={{
                    // 이미지 문법을 가로채서 정렬 지시어인지 확인
                    image: (node, children, parent, styles) => {
                      const { src, alt } = node.attributes;

                      // 우리가 만든 ![right], ![left], ![center] 지시어 처리
                      if (
                        alt === "right" ||
                        alt === "left" ||
                        alt === "center"
                      ) {
                        // 실제로는 이 안에 텍스트가 오는 구조이므로,
                        // 앱에서는 파싱 단계에서 정규식으로 미리 텍스트를 치환하는 것이 더 유리합니다.
                        return null; // 지시어 자체는 렌더링 안함
                      }

                      return (
                        <Image
                          key={node.key}
                          source={{ uri: src }}
                          style={{
                            width: "100%",
                            height: 200,
                            resizeMode: "contain",
                          }}
                        />
                      );
                    },
                  }}
                >
                  {cleanMd}
                </Markdown>
              );

              if (backgroundUrl) {
                return (
                  <ImageBackground
                    source={{ uri: backgroundUrl }}
                    style={{ minHeight: 450, padding: 20 }}
                    imageStyle={{ borderRadius: 12 }}
                  >
                    {/* 배경 어둡게 처리 (Dimmer) */}
                    <View
                      style={[
                        StyleSheet.absoluteFill,
                        {
                          backgroundColor: "rgba(0,0,0,0.4)",
                          borderRadius: 12,
                        },
                      ]}
                    />
                    {Content}
                  </ImageBackground>
                );
              }

              return <View style={{ padding: 12 }}>{Content}</View>;
            })()}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
