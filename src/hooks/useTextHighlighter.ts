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
 * Cho phép người dùng bôi chọn text trong container rồi bấm nút nổi để đánh
 * dấu đậm/bỏ đánh dấu - lưu lại theo `contentKey` (vd "note:slug",
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

    let toolbarEl: HTMLButtonElement | null = null;
    function hideToolbar() {
      toolbarEl?.remove();
      toolbarEl = null;
    }
    function showToolbar(rect: DOMRect, isHighlighted: boolean, onClick: () => void) {
      hideToolbar();
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = isHighlighted ? "Bỏ bôi đậm" : "🖊 Bôi đậm";
      btn.className = "highlight-toolbar-btn";
      btn.style.top = `${rect.top + window.scrollY - 38}px`;
      btn.style.left = `${rect.left + window.scrollX}px`;
      btn.onmousedown = (e) => e.preventDefault(); // đừng xoá vùng chọn khi bấm nút
      btn.onclick = (e) => {
        e.stopPropagation();
        onClick();
      };
      document.body.appendChild(btn);
      toolbarEl = btn;
    }

    function handleMouseUp(e: MouseEvent) {
      if (toolbarEl && e.target === toolbarEl) return;
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      if (!selection || !text || selection.rangeCount === 0) {
        hideToolbar();
        return;
      }
      const range = selection.getRangeAt(0);
      if (!container!.contains(range.commonAncestorContainer)) {
        hideToolbar();
        return;
      }
      const rect = range.getBoundingClientRect();
      const isHighlighted = (readHighlights()[contentKey!] ?? []).includes(text);
      showToolbar(rect, isHighlighted, () => {
        const map = readHighlights();
        const list = map[contentKey!] ?? [];
        map[contentKey!] = isHighlighted ? list.filter((t) => t !== text) : [...list, text];
        writeHighlights(map);
        selection.removeAllRanges();
        hideToolbar();
        applyHighlights();
      });
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mouseup", handleMouseUp);
      hideToolbar();
      CSS.highlights.delete("medquiz-highlight");
    };
  }, [contentKey]);

  return containerRef;
}
