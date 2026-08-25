import { useEffect, useRef } from "react";

// Dùng CSS Custom Highlight API (Highlight/CSS.highlights, hỗ trợ Chrome/Edge
// 105+, Safari 17.2+ - đủ cho máy tính/iPad) thay vì chèn <mark> vào DOM: chỉ
// cần tạo Range trỏ vào text đã render, không phải sửa cấu trúc DOM/markdown
// nguồn - tránh làm hỏng cú pháp markdown khi đoạn bôi đậm cắt ngang 1 span
// **in đậm**/link.
const HIGHLIGHTS_KEY = "medquiz:highlights";
const MIN_WIDTH = 768; // chỉ bật trên máy tính/iPad - trên điện thoại nhỏ khó bôi chọn text nên ẩn hẳn

type HighlightMap = Record<string, string[]>;

function readHighlights(): HighlightMap {
  try {
    const raw = localStorage.getItem(HIGHLIGHTS_KEY);
    return raw ? (JSON.parse(raw) as HighlightMap) : {};
  } catch {
    return {};
  }
}

function writeHighlights(map: HighlightMap): void {
  try {
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(map));
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
}

/** Tìm Range ứng với lần xuất hiện thứ `occurrence` của `text` trong toàn bộ text của container. */
function findRange(container: Node, text: string, occurrence: number): Range | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let full = "";
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const t = node as Text;
    nodes.push({ node: t, start: full.length });
    full += t.data;
  }

  let fromIndex = 0;
  let idx = -1;
  for (let i = 0; i <= occurrence; i++) {
    idx = full.indexOf(text, fromIndex);
    if (idx === -1) return null;
    fromIndex = idx + 1;
  }
  const endIdx = idx + text.length;
  const findNodeFor = (offset: number) => [...nodes].reverse().find((n) => n.start <= offset);
  const startNode = findNodeFor(idx);
  const endNode = findNodeFor(endIdx);
  if (!startNode || !endNode) return null;

  const range = document.createRange();
  range.setStart(startNode.node, idx - startNode.start);
  range.setEnd(endNode.node, Math.min(endIdx - endNode.start, endNode.node.data.length));
  return range;
}

/**
 * Bôi chọn text trong container là tự động đánh dấu đậm ngay (chọn lại đúng
 * đoạn đã đậm thì bỏ đậm) - lưu theo `contentKey` (vd "note:slug",
 * "question:id") để lần sau quay lại vẫn thấy.
 */
export function useTextHighlighter(contentKey: string | null) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contentKey) return;
    if (typeof window === "undefined" || !("highlights" in CSS) || window.innerWidth < MIN_WIDTH) return;
    const container = containerRef.current;
    if (!container) return;

    function applyHighlights() {
      const list = readHighlights()[contentKey!] ?? [];
      const seen = new Map<string, number>();
      const ranges: Range[] = [];
      for (const text of list) {
        const occurrence = seen.get(text) ?? 0;
        seen.set(text, occurrence + 1);
        const range = findRange(container!, text, occurrence);
        if (range) ranges.push(range);
      }
      CSS.highlights.set("medquiz-highlight", new Highlight(...ranges));
    }

    applyHighlights();

    function handleMouseUp() {
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!selection || !text || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      if (!container!.contains(range.commonAncestorContainer)) return;

      const map = readHighlights();
      const list = map[contentKey!] ?? [];
      const isHighlighted = list.includes(text);
      map[contentKey!] = isHighlighted ? list.filter((t) => t !== text) : [...list, text];
      writeHighlights(map);
      selection.removeAllRanges();
      applyHighlights();
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      CSS.highlights.delete("medquiz-highlight");
    };
  }, [contentKey]);

  return containerRef;
}
