// app/(tabs)/chat.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import {
  createRoom,
  debugListRoomsOnce,
  subscribeMyRooms,
} from "@/src/features/chat/chatRepo";
import { ChatRoom } from "@/src/features/chat/types";
import { auth } from "@/src/lib/firebase";
import { useNavigation, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";

function formatTime(ts?: number) {
  if (!ts) return "";
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function ChatList() {
  console.log("uid:", auth.currentUser?.uid);
  const router = useRouter();
  const navigation = useNavigation();
  navigation.setOptions({ title: "채팅" });

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const myUid = user?.uid;
    setLoading(true);
    console.log("[ChatList] uid:", myUid);

    if (!myUid) {
      setLoading(false);
      return;
    }
    debugListRoomsOnce(myUid);

    const unsub = subscribeMyRooms(
      myUid,
      (list) => {
        console.log("[rooms]", list);
        setRooms(list);
        setLoading(false);
      },
      (e) => {
        console.error("[subscribeMyRooms error]", e);
        // FirestoreError면 아래가 핵심
        // @ts-ignore
        console.error("code=", e?.code, "message=", e?.message, e);
        setLoading(false);
      },
    );

    return unsub;
  }, [user?.uid]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      {/* 상단바 */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 12,
          borderBottomWidth: 1,
          borderColor: "#eee",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: "800" }}>채팅목록</Text>

        <Pressable
          onPress={async () => {
            if (!user?.uid) return;

            // MVP: “나 혼자 방”이라도 만들어서 목록에 뜨게 하자
            const { roomId } = await createRoom({
              type: "group",
              title: "🧪 테스트 채팅",
              memberUids: [user.uid], // 본인 포함 필수
              email: user.email ?? "",
              createdBy: user.uid,
            });

            router.push({ pathname: "/chat/[roomId]", params: { roomId } });
          }}
          style={{
            paddingHorizontal: 12,
            paddingVertical: 8,
            borderRadius: 10,
            borderWidth: 1,
            borderColor: "#ddd",
          }}
        >
          <Text style={{ fontWeight: "700" }}>+ 새 채팅</Text>
        </Pressable>
      </View>

      {rooms.length === 0 ? (
        <View style={{ padding: 16 }}>
          <Text style={{ color: "#666" }}>
            아직 채팅방이 없어요. “+ 새 채팅”을 눌러 만들어보자.
          </Text>
        </View>
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(x) => x.id}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: "#f1f1f1" }} />
          )}
          renderItem={({ item }) => (
            <Pressable
              onPress={() =>
                router.push({
                  pathname: "/chat/[roomId]",
                  params: { roomId: item.id },
                })
              }
              style={{
                paddingHorizontal: 16,
                paddingVertical: 14,
                flexDirection: "row",
                gap: 12,
                alignItems: "center",
              }}
            >
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  backgroundColor: "#f2f2f2",
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: "#e7e7e7",
                }}
              >
                <Text style={{ fontWeight: "800" }}>
                  {item.avatarText ?? "?"}
                </Text>
              </View>

              <View style={{ flex: 1, minWidth: 0 }}>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <Text
                    numberOfLines={1}
                    style={{ fontSize: 16, fontWeight: "800", flex: 1 }}
                  >
                    {item.title}
                  </Text>
                  <Text style={{ fontSize: 12, color: "#777" }}>
                    {formatTime(item.lastAt)}
                  </Text>
                </View>

                <Text numberOfLines={1} style={{ color: "#666", marginTop: 4 }}>
                  {item.lastMessage ?? ""}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
