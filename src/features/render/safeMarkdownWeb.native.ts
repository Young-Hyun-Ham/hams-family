// src/features/render/safeMarkdownWeb.native.ts
// 배경과 본문을 분리하는 헬퍼 함수
export function parseAppMarkdown(md: string) {
  let backgroundUrl = "";

  // 1. 배경 이미지 주소 추출 후 본문에서 제거
  const bgRegex = /!\[background\]\((.*?)\)/i;
  const bgMatch = md.match(bgRegex);
  if (bgMatch) {
    backgroundUrl = bgMatch[1];
  }

  // 2. 본문에서 배경 문법은 제거하고 반환
  const cleanMd = md.replace(bgRegex, "").trim();

  return { backgroundUrl, cleanMd };
}
