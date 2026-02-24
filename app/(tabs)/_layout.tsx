// app/(tabs)/_layout.tsx
import { useAuth } from "@/src/features/auth/AuthProvider";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Text, View } from "react-native";

export default function TabsLayout() {
  const { user } = useAuth();
  return (
    <Tabs screenOptions={{ headerTitleAlign: "center" }}>
      <Tabs.Screen
        name="home"
        options={{
          title: "",
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name={focused ? "caret-up" : "caret-down"}
                size={14}
                color={focused ? "#007aff" : "#999"}
              />
              <Text style={{ fontSize: 12 }}>홈</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="posts"
        options={{
          title: "",
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name={focused ? "caret-up" : "caret-down"}
                size={14}
                color={focused ? "#007aff" : "#999"}
              />
              <Text style={{ fontSize: 12 }}>추억</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "",
          tabBarLabel: "",
          tabBarIcon: ({ focused }) => (
            <View style={{ alignItems: "center" }}>
              <Ionicons
                name={focused ? "caret-up" : "caret-down"}
                size={14}
                color={focused ? "#007aff" : "#999"}
              />
              <Text style={{ fontSize: 12 }}>채팅</Text>
            </View>
          ),
        }}
      />
      {/* 로그인 상태일 때만 설정 탭 노출 */}
      {user ? (
        <Tabs.Screen
          name="settings"
          options={{
            title: "",
            tabBarLabel: "",
            tabBarIcon: ({ focused }) => (
              <View style={{ alignItems: "center" }}>
                <Ionicons
                  name={focused ? "caret-up" : "caret-down"}
                  size={14}
                  color={focused ? "#007aff" : "#999"}
                />
                <Text style={{ fontSize: 12 }}>설정</Text>
              </View>
            ),
          }}
        />
      ) : null}
    </Tabs>
  );
}
