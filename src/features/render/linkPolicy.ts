// src/features/render/linkPolicy.ts
export type LinkAction =
  | { type: "app"; path: string }
  | { type: "external"; url: string }
  | { type: "blocked"; reason: string };

// 링크 정책: app://, http(s):// 만 허용
export function classifyHref(href: string): LinkAction {
  const raw = (href ?? "").trim();
  if (!raw) return { type: "blocked", reason: "empty" };

  if (raw.startsWith("app://")) {
    const rest = raw.replace("app://", "").replace(/^\/+/, "");
    if (rest === "chat") return { type: "app", path: "/(tabs)/chat" };
    if (rest === "posts") return { type: "app", path: "/(tabs)/posts" };
    return { type: "app", path: `/${rest}` };
  }

  if (raw.startsWith("https://") || raw.startsWith("http://")) {
    return { type: "external", url: raw };
  }

  return { type: "blocked", reason: "scheme not allowed" };
}
