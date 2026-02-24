import { classifyHref } from "@/src/features/render/linkPolicy";
import { renderSafeHtmlFromMarkdown } from "@/src/features/render/safeMarkdownWeb.web";
import { FamilyDoc } from "@/src/features/user/types";
import { db } from "@/src/lib/firebase"; // 프로젝트에서 db export 경로에 맞춰 조정 필요
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import Markdown from "react-native-markdown-display";

export default function UserfamScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { targetId } = useLocalSearchParams<{ targetId: string }>();

  const [family, setFamily] = useState<FamilyDoc | null>(null);
  const [loading, setLoading] = useState(false);

  // 웹에서 클릭 이벤트 위임용 ref
  const webContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!targetId) return;

    const ref = doc(db, "families", targetId);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setFamily((snap.data() as FamilyDoc) ?? null);
        setLoading(false);
      },
      (err) => {
        console.error("[home] family onSnapshot error:", err);
        setFamily(null);
        setLoading(false);
      },
    );

    return () => unsub();
  }, [targetId]);

  useEffect(() => {
    // 타이틀 변경
    useLayoutEffect(() => {
      navigation.setOptions({ title: `${family?.name} 팸에 오신걸 환영합니다.` });
    }, [navigation]);
  }, [family]);

  const md = family?.bodyMarkdown ?? "";

  // 웹용 safeHtml
  const safeHtml = useMemo(() => {
    if (Platform.OS !== "web") return "";
    return renderSafeHtmlFromMarkdown(md);
  }, [md]);

  // 웹 링크 클릭 정책(이벤트 위임)
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const el = webContainerRef.current;
    if (!el) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const a = target?.closest?.("a") as HTMLAnchorElement | null;
      if (!a) return;

      const href = a.getAttribute("href") ?? "";
      const action = classifyHref(href);

      if (action.type === "app") {
        e.preventDefault();
        // router.push(action.path);
      } else if (action.type === "external") {
        e.preventDefault();
        window.open(action.url, "_blank", "noopener,noreferrer");
      } else {
        e.preventDefault();
      }
    };

    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [router, safeHtml]);

  async function handleNativeLinkPress(href: string) {
    const action = classifyHref(href);

    if (action.type === "app") {
      // router.push(action.path);
      return;
    }

    if (action.type === "external") {
      // 네이티브 외부 링크
      const can = await Linking.canOpenURL(action.url);
      if (can) await Linking.openURL(action.url);
      return;
    }

    // blocked: 아무것도 안 함
  }

  return (
    <View
      style={{ flex: 1, paddingHorizontal: 16, paddingVertical: 10, gap: 10 }}
    >
      <View style={{ flexDirection: "row", gap: 8 }}>
        {[1, 2, 3, 4].map((num) => (
          <Pressable
            key={num}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: pressed ? "#f0f0f0" : "#fff",
                paddingVertical: 14,
                borderRadius: 12,
                alignItems: "center",
                justifyContent: "center",
                // 안드로이드 그림자 (Elevation)
                elevation: 3,
                // iOS 그림자
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                // 테두리는 아주 연하게
                borderWidth: 1,
                borderColor: "rgba(0,0,0,0.05)",
              },
            ]}
          >
            <Text style={{ color: "#333", fontWeight: "700", fontSize: 13 }}>
              메뉴 {num}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={{ flex: 1, padding: 2, backgroundColor: "#fff" }}>
        {/* 본문 */}
        {/* 카드 박스 (고정 높이) */}
        <View
          style={{
            flex: 1,
            borderWidth: 1,
            borderColor: "#eee",
            borderRadius: 14,
            padding: 16,
            backgroundColor: "#fafafa",
            overflow: "hidden",
          }}
        >
          {loading ? (
            <ActivityIndicator />
          ) : Platform.OS === "web" ? (
            <div
              ref={(node) => {
                webContainerRef.current = node;
              }}
              style={{
                height: "100%", // 🔥 카드 높이에 맞춤
                overflowY: "auto", // 🔥 내부 스크롤
                lineHeight: 1.6,
                scrollbarWidth: "thin",
                WebkitOverflowScrolling: "touch",
              }}
              dangerouslySetInnerHTML={{ __html: safeHtml }}
            />
          ) : (
            // 네이티브: 카드 내부 ScrollView + Markdown 렌더
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{ paddingBottom: 16 }}
            >
              <Markdown
                onLinkPress={(url) => {
                  handleNativeLinkPress(url);
                  return false; // 기본 동작 막고 우리가 처리
                }}
              >
                {md}
              </Markdown>
            </ScrollView>
          )}
        </View>
      </View>
    </View>
  );
}
