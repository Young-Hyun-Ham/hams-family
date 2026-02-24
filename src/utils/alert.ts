// src/utils/alert.ts
import { Alert, Platform } from "react-native";

export function showAlert(title: string, message?: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") {
      window.alert(`${title}${message ? `\n\n${message}` : ""}`);
    }
    return;
  }

  Alert.alert(title, message);
}
