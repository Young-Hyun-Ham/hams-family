// app/chat/[roomId].tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  markRoomRead,
  sendMessage,
  subscribeMessages,
} from "@/src/features/chat/chatRepo";
import type { ChatMessage } from "@/src/features/chat/types";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

// 추가: chatRooms title 구독
import { db } from "@/src/lib/firebase"; // 프로젝트에서 db export 경로에 맞춰 조정 필요
import { doc, onSnapshot } from "firebase/firestore";

export default function ChatRoomScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { roomId } = useLocalSearchParams<{ roomId: string }>();
  const rid = String(roomId ?? "");

  const { user } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const myUid = user?.uid;

  // 추가: 방 제목
  const [roomTitle, setRoomTitle] = useState<string>("채팅");

  // chatRooms/{roomId} 문서에서 title 실시간 구독
  useEffect(() => {
    if (!rid) return;

    const roomRef = doc(db, "chatRooms", rid);

    const unsub = onSnapshot(roomRef, (snap) => {
      const data = snap.data() as any;
      const title = String(data?.title ?? "채팅");

      setRoomTitle(title);
      useLayoutEffect(() => {
        navigation.setOptions({ title });
      }, [navigation]);
    });

    return () => unsub();
  }, [rid]);

  useEffect(() => {
    if (!rid || !myUid) return;

    const unsub = subscribeMessages(
      rid,
      (list) => {
        setMessages(list);
        // 마지막으로 스크롤
        requestAnimationFrame(() =>
          listRef.current?.scrollToEnd({ animated: true }),
        );
      },
      (e) => {
        console.error("[subscribeMessages ERROR]", e);
        // @ts-ignore
        console.error("code=", e?.code, "message=", e?.message);
      },
    );

    // 방 진입 시 읽음처리
    markRoomRead(rid, myUid).catch(console.warn);

    return () => unsub();
  }, [rid, myUid]);

  const data = useMemo(() => messages, [messages]);

  async function onSend() {
    if (!rid || !myUid) return;
    const t = text.trim();
    if (!t) return;

    setText("");

    try {
      await sendMessage({
        roomId: rid,
        text: t,
        senderId: myUid,
        senderName: user?.displayName ?? null,
      });
    } catch (e: any) {
      console.error("[sendMessage ERROR]", e);
      console.error("code=", e?.code, "message=", e?.message);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: "#fff" }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 80 : 0}
    >
      {/* Header */}
      <View
        style={{
          height: 52,
          borderBottomWidth: 1,
          borderColor: "#eee",
          paddingHorizontal: 12,
          flexDirection: "row",
          alignItems: "center",
        }}
      >
        {/* 뒤로가기 */}
        <Pressable onPress={() => router.back()} style={{ padding: 8 }}>
          {/* <Text style={{ fontSize: 18 }}>←</Text> */}
        </Pressable>

        {/* 가운데 타이틀: chatRooms.title */}
        <View style={{ flex: 1, alignItems: "center" }}>
          {/* <Text
            numberOfLines={1}
            style={{ fontSize: 16, fontWeight: "800", maxWidth: "90%" }}
          >
            {roomTitle}
          </Text> */}
        </View>

        {/* 우측: 초대 */}
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/invite-room",
              params: { roomId: rid },
            })
          }
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text style={{ fontWeight: "800" }}>초대</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: 12 }}
        renderItem={({ item }) => {
          const t = item.type ?? "user";

          // 시스템 메시지: 중앙 pill
          if (t === "system") {
            return (
              <View style={{ alignItems: "center", marginVertical: 6 }}>
                <View
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 999,
                    borderWidth: 1,
                    borderColor: "#e5e7eb",
                    backgroundColor: "#fff",
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#6b7280",
                      fontWeight: "700",
                    }}
                  >
                    {item.text}
                  </Text>
                </View>
              </View>
            );
          }

          // 일반 메시지 (기존 로직)
          const mine = item.senderId === myUid;

          return (
            <View
              style={{
                flexDirection: "row",
                justifyContent: mine ? "flex-end" : "flex-start",
              }}
            >
              <View
                style={{
                  maxWidth: "78%",
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: mine ? "#dbeafe" : "#eee",
                  backgroundColor: mine ? "#eff6ff" : "#f7f7f7",
                }}
              >
                {!mine && item.senderName ? (
                  <Text
                    style={{ fontSize: 12, color: "#666", marginBottom: 4 }}
                  >
                    {item.senderName}
                  </Text>
                ) : null}
                <Text style={{ fontSize: 15, lineHeight: 20 }}>
                  {item.text}
                </Text>
              </View>
            </View>
          );
        }}
      />

      {/* Input */}
      <View
        style={{
          borderTopWidth: 1,
          borderColor: "#eee",
          padding: 10,
          flexDirection: "row",
          alignItems: "flex-end",
          gap: 8,
        }}
      >
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="메시지 입력…"
          multiline
          style={{
            flex: 1,
            minHeight: 40,
            maxHeight: 120,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <Pressable
          onPress={onSend}
          style={{
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "#111",
            backgroundColor: "#111",
          }}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>전송</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
