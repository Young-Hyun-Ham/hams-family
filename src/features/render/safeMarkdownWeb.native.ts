// src/features/render/safeMarkdownWeb.native.ts

export type Align = "left" | "center" | "right";

export type MdPart =
  | { type: "markdown"; md: string }
  | {
      type: "align";
      align: Align;
      // align 블록 내부가 이미지인지 텍스트인지
      contentType: "image" | "text";
      // contentType === "image"
      imageAlt?: string;
      imageUrl?: string;
      // contentType === "text"
      textMd?: string;
    };

function _extractBackground(md: string) {
  let backgroundUrl = "";
  const bgRegex = /!\[background\]\((.*?)\)/i;
  const bgMatch = md.match(bgRegex);
  if (bgMatch) backgroundUrl = (bgMatch[1] ?? "").trim();
  const clean = md.replace(bgRegex, "").trim();
  return { backgroundUrl, md: clean };
}

function _isImageMarkdown(s: string) {
  // 웹과 동일: ![alt](url)
  const imageRegex = /!\[(.*?)\]\((.*?)\)/;
  const m = s.match(imageRegex);
  if (!m) return null;
  return { alt: (m[1] ?? "").trim(), url: (m[2] ?? "").trim() };
}

/**
 * 웹 renderSafeHtmlFromMarkdown와 동일한 목적:
 * - ![right|center|left](내용) => 정렬 블록으로 분해
 * - ![background](url) => 배경으로 분리
 */
export function parseAppMarkdown(md: string): {
  backgroundUrl: string;
  parts: MdPart[];
} {
  md = md.replace(/%%[\s\S]*?%%/g, "").trim();
  const src = md ?? "";
  const { backgroundUrl, md: withoutBg } = _extractBackground(src);

  const parts: MdPart[] = [];

  // 웹 정규식과 최대한 유사하게:
  // /!\[(right|center|left)\]\(([\s\S]*?)\)(?!\))/
  const alignRegex = /!\[(right|center|left)\]\(([\s\S]*?)\)(?!\))/gi;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = alignRegex.exec(withoutBg))) {
    const full = match[0];
    const alignRaw = (match[1] ?? "").toLowerCase();
    const contentRaw = (match[2] ?? "").trim();

    const start = match.index;
    const end = start + full.length;

    // 앞쪽 일반 마크다운
    const before = withoutBg.slice(lastIndex, start);
    if (before.trim().length > 0) {
      parts.push({ type: "markdown", md: before.trim() });
    }

    const align =
      alignRaw === "right" ? "right" : alignRaw === "center" ? "center" : "left";

    // 내부가 이미지 마크다운이면 이미지 블록
    const img = _isImageMarkdown(contentRaw);
    if (img) {
      parts.push({
        type: "align",
        align,
        contentType: "image",
        imageAlt: img.alt,
        imageUrl: img.url,
      });
    } else {
      // 텍스트(제목 포함)인 경우: 웹은 #/##/###... 판별해서 h 태그로 만들었는데,
      // RN에서는 Markdown 컴포넌트가 # 헤딩을 그대로 해석하므로 그냥 유지하면 동일하게 동작함.
      parts.push({
        type: "align",
        align,
        contentType: "text",
        textMd: contentRaw,
      });
    }

    lastIndex = end;
  }

  // 마지막 남은 일반 마크다운
  const tail = withoutBg.slice(lastIndex);
  if (tail.trim().length > 0) {
    parts.push({ type: "markdown", md: tail.trim() });
  }

  return { backgroundUrl, parts };
}