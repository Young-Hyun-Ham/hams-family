// src/features/render/safeMarkdownWeb.web.ts
import DOMPurify from "dompurify";
import { marked } from "marked";

// 이미지 정책: Firebase Storage 다운로드 URL만 허용(필요하면 확장)
function isAllowedImageSrc(src: string) {
  const s = (src ?? "").trim();
  return (
    s.startsWith("https://firebasestorage.googleapis.com/") ||
    s.includes(".appspot.com/")
  );
}

export function renderSafeHtmlFromMarkdown(md: string): string {
  let processedMd = md ?? "";

  // ✅ 1. ![정렬](내용) 패턴 처리 - 정규식 수정
  // [.*?\] : 탐욕적이지 않게 가장 가까운 닫는 대괄호를 찾음
  // \(([\s\S]*?)\)(?!\)) : 괄호 내부 내용을 다 가져오되, 이미지 마크다운의 닫는 괄호와 혼동하지 않도록 함
  processedMd = processedMd.replace(
    /!\[(right|center|left)\]\(([\s\S]*?)\)(?!\))/gi,
    (match, align, content) => {
      const alignment = align.toLowerCase();
      const innerContent = content.trim();

      // 부모 컨테이너 스타일
      const containerStyle = `display: flex; flex-direction: column; width: 100%; align-items: ${
        alignment === "right"
          ? "flex-end"
          : alignment === "center"
            ? "center"
            : "flex-start"
      }; text-align: ${alignment};`;

      // ✅ [중요] 이미지 마크다운 인식 로직 보강
      // 이미지 마크다운은 보통 ![alt](url) 형태이므로 이를 먼저 검사
      const imageRegex = /!\[(.*?)\]\((.*?)\)/;
      const imageMatch = innerContent.match(imageRegex);

      if (imageMatch) {
        const altText = imageMatch[1];
        const imageUrl = imageMatch[2];

        return `<div style="${containerStyle} margin: 15px 0;">
                  <img src="${imageUrl}" alt="${altText}" style="max-width: 100%; height: auto; border-radius: 12px; display: block;" />
                </div>`;
      } else {
        // --- 텍스트(제목 포함)인 경우 ---
        let tagName = "p";
        let text = innerContent;

        if (text.startsWith("#####")) {
          tagName = "h5";
          text = text.replace(/^#####\s*/, "");
        } else if (text.startsWith("####")) {
          tagName = "h4";
          text = text.replace(/^####\s*/, "");
        } else if (text.startsWith("###")) {
          tagName = "h3";
          text = text.replace(/^###\s*/, "");
        } else if (text.startsWith("##")) {
          tagName = "h2";
          text = text.replace(/^##\s*/, "");
        } else if (text.startsWith("#")) {
          tagName = "h1";
          text = text.replace(/^#\s*/, "");
        }

        return `<${tagName} style="${containerStyle} position: relative; z-index: 1; text-shadow: 0 2px 12px rgba(0,0,0,0.8); margin: 10px 0;">${text}</${tagName}>`;
      }
    },
  );

  // 2. 마크다운 변환
  const html = marked.parse(processedMd, { gfm: true, breaks: true }) as string;

  // 3. 보안 처리
  const safe = DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ALLOWED_TAGS: [
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "p",
      "br",
      "strong",
      "em",
      "ul",
      "ol",
      "li",
      "hr",
      "a",
      "img",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "title", "target", "rel", "style"],
  });

  const wrapper = document.createElement("div");
  wrapper.innerHTML = safe;

  // 4. 배경 이미지 처리
  const bgImg = wrapper.querySelector<HTMLImageElement>(
    "img[alt='background']",
  );
  if (bgImg && isAllowedImageSrc(bgImg.src)) {
    const bgSrc = bgImg.src;
    bgImg.remove();

    Object.assign(wrapper.style, {
      position: "relative",
      minHeight: "450px",
      padding: "80px 40px",
      display: "flex",
      flexDirection: "column",
      borderRadius: "24px",
      overflow: "hidden",
      color: "#ffffff",
    });

    const bgOverlay = document.createElement("div");
    bgOverlay.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background-image:url('${bgSrc}'); background-size:cover; background-position:center; z-index:-1;`;
    const dimmer = document.createElement("div");
    dimmer.style.cssText = `position:absolute; top:0; left:0; width:100%; height:100%; background-color:rgba(0,0,0,0.55); z-index:0;`;

    wrapper.prepend(dimmer);
    wrapper.prepend(bgOverlay);

    // 배경 위 요소 가독성 보정
    wrapper.querySelectorAll("h1, h2, h3, h4, h5, p, li").forEach((el) => {
      const target = el as HTMLElement;
      if (!target.style.position) {
        target.style.position = "relative";
        target.style.zIndex = "1";
        target.style.textShadow = "0 2px 12px rgba(0,0,0,0.8)";
      }
      // 개별 정렬이 없는 경우만 중앙 정렬
      if (
        !target.style.textAlign &&
        !target.closest('div[style*="display: flex"]')
      ) {
        target.style.textAlign = "center";
      }
    });
  }

  return wrapper.outerHTML;
}
