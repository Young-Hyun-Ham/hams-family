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
import type { ImageStyle, TextStyle, ViewStyle } from "react-native";
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

  const markdownGuideText = `%% 
[마크다운 가이드]
- 텍스트 입력 후 커서 위치에 이미지가 삽입됩니다.
- 텍스트 꾸미기: **굵게**, *기울임*, ~~취소선~~, \`코드\`, > 인용문, # 제목1, ## 제목2, ### 제목3, - 목록
- 텍스트 정렬: ![right](내용), ![center](내용), ![left](내용)
- 이미지 정렬: ![right](![image](url)), ![center](![image](url)), ![left](![image](url))
- 배경 이미지: ![background](url) (예: ![background](https://example.com/bg.jpg) )
%%`;

  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [md, setMd] = useState(markdownGuideText);
  const [saving, setSaving] = useState(false);

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
      setMd(markdownGuideText + data.bodyMarkdown);
      setLoading(false);
    })();
  }, [familyId]);

  // 웹 safe html
  const safeHtml = useMemo(() => {
    if (Platform.OS !== "web") return "";
    return renderSafeHtmlFromMarkdown(md);
  }, [md]);

  // 네이티브용 파싱 결과(훅은 최상단!)
  const parsed = useMemo(() => {
    // 웹에서도 호출해도 문제 없음(렌더에만 안 쓰면 됨)
    return parseAppMarkdown(md);
  }, [md]);

  // 네이티브 Markdown 스타일도 최상단에서 계산
  const mdStyles = useMemo(() => {
    const baseShadow: TextStyle = {
      textShadowColor: "rgba(0,0,0,0.8)",
      textShadowRadius: 12,
      textShadowOffset: { width: 0, height: 2 },
    };

    const isOnBg = !!parsed.backgroundUrl;
    const textColor = isOnBg ? "#fff" : "#111";
    const shadow = isOnBg ? baseShadow : {};

    return {
      body: { color: textColor } as TextStyle,

      heading1: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      heading2: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      heading3: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      heading4: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      heading5: { color: textColor, ...(shadow as TextStyle) } as TextStyle,

      text: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      paragraph: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
      list_item: { color: textColor, ...(shadow as TextStyle) } as TextStyle,
    } as Record<string, ViewStyle | TextStyle | ImageStyle>;
  }, [parsed.backgroundUrl]);

  function alignItems(align: "left" | "center" | "right") {
    return align === "right"
      ? "flex-end"
      : align === "center"
      ? "center"
      : "flex-start";
  }

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

    const { url } = await uploadFamilyHomeImage({
      familyId,
      fileUri: uri,
      mimeType,
    });

    insertAtCursor(`\n\n![image](${url})\n\n`);
  }

  async function onSave() {
    if (!familyId) {
      showAlert("로그인이 필요합니다.");
      return;
    }

    try {
      setSaving(true);
      await updateFamilyBodyMarkdown({ familyId, bodyMarkdown: md });
      showAlert("저장 완료!");
      router.replace("/home");
    } catch (e: any) {
      console.error("[onSave ERROR]", e);
      console.error("code=", e?.code, "message=", e?.message);
      showAlert(`저장 실패: ${e?.message ?? "알 수 없는 오류"}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#fff", padding: 16, gap: 12 }}>
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
          disabled={saving}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#111",
            backgroundColor: "#111",
            opacity: saving ? 0.6 : 1,
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>
            {saving ? "저장 중..." : "저장"}
          </Text>
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
          <ScrollView style={{ flex: 1 }}>
            {parsed.backgroundUrl ? (
              <ImageBackground
                source={{ uri: parsed.backgroundUrl }}
                style={{ minHeight: 450, padding: 5 }}
                imageStyle={{ borderRadius: 12 }}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: "rgba(0,0,0,0.55)",
                      borderRadius: 12,
                    },
                  ]}
                />
                <View style={{ padding: 5, gap: 10 }}>
                  {parsed.parts.map((p, idx) => {
                    if (p.type === "markdown") {
                      return (
                        <Markdown key={`md-${idx}`} style={mdStyles}>
                          {p.md}
                        </Markdown>
                      );
                    }
                    // 텍스트 정렬 값
                    const textAlign = p.align === "right" ? "right" : p.align === "center" ? "center" : "left";
                    const withAlign = (base: any) => ({
                      ...(base ?? {}),
                      textAlign,
                      width: "100%",
                      alignSelf: "stretch",
                    });
                    // 이미지 정렬 값
                    const alignSelf = p.align === "right" ? "flex-end" : p.align === "center" ? "center" : "flex-start";

                    return (
                      <View
                        key={`al-${idx}`}
                        style={{
                          width: "100%",
                          alignItems: alignItems(p.align),
                          marginVertical: 5,
                        }}
                      >
                        {p.contentType === "image" ? (
                          <Image
                            source={{ uri: p.imageUrl }}
                            style={{
                              width: "60%",
                              maxWidth: 520,
                              height: 240,
                              borderRadius: 12,
                              // resizeMode: "contain",
                              alignSelf,
                            }}
                          />
                        ) : (
                          <Markdown
                            style={{
                              ...mdStyles,
                              heading1: withAlign(mdStyles.heading1),
                              heading2: withAlign(mdStyles.heading2),
                              heading3: withAlign(mdStyles.heading3),
                              heading4: withAlign(mdStyles.heading4),
                              heading5: withAlign(mdStyles.heading5),
                              paragraph: withAlign(mdStyles.paragraph),
                              text: withAlign(mdStyles.text),
                              list_item: withAlign(mdStyles.list_item),
                            }}
                          >
                            {p.textMd ?? ""}
                          </Markdown>
                        )}
                      </View>
                    );
                  })}
                </View>
              </ImageBackground>
            ) : (
              <View style={{ padding: 12, gap: 10 }}>
                {parsed.parts.map((p, idx) => {
                  if (p.type === "markdown") {
                    return (
                      <Markdown key={`md-${idx}`} style={mdStyles}>
                        {p.md}
                      </Markdown>
                    );
                  }

                  return (
                    <View
                      key={`al-${idx}`}
                      style={{
                        width: "100%",
                        alignItems: alignItems(p.align),
                        marginVertical: 6,
                      }}
                    >
                      {p.contentType === "image" ? (
                        <Image
                          source={{ uri: p.imageUrl }}
                          style={{
                            width: "100%",
                            height: 240,
                            borderRadius: 12,
                            resizeMode: "contain",
                          }}
                        />
                      ) : (
                        <View style={{ width: "100%" }}>
                          <Markdown style={mdStyles}>{p.textMd ?? ""}</Markdown>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}