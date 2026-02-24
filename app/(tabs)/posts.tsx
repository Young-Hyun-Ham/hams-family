// app/(tabs)/posts.tsx
import { listPosts, removePost } from "@/src/features/posts/postRepo";
import type { Post } from "@/src/features/posts/types";
import { useNavigation } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, RefreshControl, Text, View } from "react-native";

export default function Posts() {
  const navigation = useNavigation();
  navigation.setOptions({ title: "추억" });

  const [items, setItems] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await listPosts();
      setItems(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <View style={{ flex: 1, padding: 16 }}>
      <FlatList
        data={items}
        keyExtractor={(it) => it.id}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => (
          <View
            style={{ borderWidth: 1, borderRadius: 12, padding: 12, gap: 6 }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700" }}>
              {item.title}
            </Text>
            <Text numberOfLines={3}>{item.content}</Text>

            <Pressable
              onPress={async () => {
                await removePost(item.id);
                await load();
              }}
              style={{
                padding: 10,
                borderRadius: 10,
                alignItems: "center",
                borderWidth: 1,
                marginTop: 6,
              }}
            >
              <Text style={{ fontWeight: "700" }}>삭제</Text>
            </Pressable>
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text>아직 글이 없어. 첫 글을 써보자!</Text> : null
        }
      />
    </View>
  );
}
