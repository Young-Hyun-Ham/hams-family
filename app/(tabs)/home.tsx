// app/(tabs)/home.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import { Family, listFamilies } from "@/src/features/families/familyRepo";
import { db } from "@/src/lib/firebase";
import { showAlert } from "@/src/utils/alert";
import { useNavigation, useRouter } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import { classifyHref } from "@/src/features/render/linkPolicy";
import { renderSafeHtmlFromMarkdown } from "@/src/features/render/safeMarkdownWeb.web";
import { FamilyDoc } from "@/src/features/user/types";
import Markdown from "react-native-markdown-display";

export default function Home() {
  const router = useRouter();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({ title: "홈" });
  }, [navigation]);
  const { user } = useAuth();

  const [family, setFamily] = useState<FamilyDoc | null>(null);
  const [loading, setLoading] = useState(false);

  const [familyName, setFamilyName] = useState<string | null>(null);
  const [pickOpen, setPickOpen] = useState(false);
  const [families, setFamilies] = useState<Family[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(false);

  const familyId = useMemo(() => user?.uid ?? null, [user?.uid]);
  // 웹에서 클릭 이벤트 위임용 ref
  const webContainerRef = useRef<HTMLDivElement | null>(null);

  async function openFamilyPicker() {
    setPickOpen(true);

    // 이미 로드했다면 재사용
    if (families.length > 0) return;

    try {
      setFamiliesLoading(true);
      const list = await listFamilies();
      setFamilies(list);
    } catch (e: any) {
      showAlert("패밀리 목록 로드 실패", e?.message ?? String(e));
    } finally {
      setFamiliesLoading(false);
    }
  }

  useEffect(() => {
    if (!familyId) return;

    setLoading(true);

    const ref = doc(db, "families", familyId);
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
  }, [familyId]);

  const headerTitle =
    family?.headerTitle ?? `안녕, ${user?.displayName ?? "가족"} 👋`;

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
    <View style={{ flex: 1, padding: 16, gap: 10 }}>
      <Pressable
        onPress={openFamilyPicker}
        style={{
          padding: 12,
          borderRadius: 10,
          alignItems: "center",
          borderWidth: 1,
        }}
      >
        <Text style={{ fontWeight: "700" }}>팸조회</Text>
      </Pressable>

      <View style={{ flex: 1, backgroundColor: "#fff" }}>
        {/* 상단 타이틀 */}
        {/* <View style={{ padding: 16, paddingBottom: 10 }}>
          <Text style={{ fontSize: 18, fontWeight: "800" }}>{headerTitle}</Text>
        </View> */}

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

      {/* ====================== 패밀리 선택 모달 ====================== */}
      <Modal
        visible={pickOpen}
        animationType="slide"
        onRequestClose={() => setPickOpen(false)}
      >
        <View style={{ flex: 1, padding: 16, gap: 10 }}>
          <Text style={{ fontSize: 20, fontWeight: "800" }}>패밀리 조회</Text>

          {familiesLoading ? (
            <View style={{ paddingVertical: 20 }}>
              <ActivityIndicator />
            </View>
          ) : families.length === 0 ? (
            <Text style={{ opacity: 0.7 }}>
              등록된 패밀리가 없습니다. (families 컬렉션 확인)
            </Text>
          ) : (
            <ScrollView contentContainerStyle={{ gap: 10, paddingBottom: 20 }}>
              {families.map((f) => (
                <Pressable
                  key={f.id}
                  onPress={() => {
                    router.push({
                      pathname: "/home/[targetId]",
                      params: { targetId: f.id },
                    });
                    setPickOpen(false);
                  }}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    borderWidth: 1,
                  }}
                >
                  <Text style={{ fontWeight: "800" }}>{f.name}</Text>
                  <Text style={{ opacity: 0.6, marginTop: 4 }}>id: {f.id}</Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <Pressable
            onPress={() => setPickOpen(false)}
            style={{
              padding: 12,
              borderRadius: 10,
              alignItems: "center",
              borderWidth: 1,
            }}
          >
            <Text style={{ fontWeight: "800" }}>닫기</Text>
          </Pressable>
        </View>
      </Modal>
    </View>
  );
}
