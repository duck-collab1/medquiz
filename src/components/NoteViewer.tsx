import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { slugify } from "../utils/slug";
import { useTextHighlighter } from "../hooks/useTextHighlighter";
import type { NoteFile } from "../services/notesService";

interface Heading {
  level: number;
  text: string;
  id: string;
  line: number;
}

/**
 * Lấy các heading H2/H3 (bỏ H1 vì đã là tiêu đề note) để làm mục lục, gắn id
 * duy nhất + số dòng nguồn. Dùng số dòng (không phải bộ đếm khi render) để
 * khớp ngược sang id trong lúc ReactMarkdown vẽ ra <h2>/<h3> - tránh lệch id
 * do React StrictMode gọi lại component render 2 lần (double-invoke sẽ làm
 * hỏng 1 bộ đếm dùng chung nếu có side-effect lúc render).
 */
function extractHeadings(markdown: string): Heading[] {
  const seen = new Map<string, number>();
  const headings: Heading[] = [];
  markdown.split("\n").forEach((line, i) => {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    if (!match) return;
    const text = match[2].trim();
    const base = slugify(text);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    headings.push({ level: match[1].length, text, id: count === 0 ? base : `${base}-${count}`, line: i + 1 });
  });
  return headings;
}

function scrollToHeading(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

interface HeadingNodeProps {
  node?: { position?: { start?: { line?: number } } };
}

export function NoteViewer({ notes }: { notes: NoteFile[] }) {
  const [activeSlug, setActiveSlug] = useState(notes[0]?.slug);

  const active = notes.find((n) => n.slug === activeSlug) ?? notes[0];
  const headings = useMemo(() => (active ? extractHeadings(active.content) : []), [active]);
  const idByLine = useMemo(() => new Map(headings.map((h) => [h.line, h.id])), [headings]);
  const highlightRef = useTextHighlighter(active ? `note:${active.slug}` : null);

  if (notes.length === 0) {
    return <p>Chưa có ghi chú nào cho môn này.</p>;
  }

  function idFor(props: HeadingNodeProps): string | undefined {
    const line = props.node?.position?.start?.line;
    return line != null ? idByLine.get(line) : undefined;
  }

  return (
    <div className="note-viewer">
      <nav className="note-list">
        {notes.map((note) => (
          <button
            key={note.slug}
            className={note.slug === active.slug ? "note-list-item active" : "note-list-item"}
            onClick={() => setActiveSlug(note.slug)}
          >
            {note.title}
          </button>
        ))}
        {headings.length > 0 && (
          <div className="note-toc">
            <p className="note-toc-title">Mục lục</p>
            {headings.map((h) => (
              <button
                key={h.id}
                className="note-toc-item"
                data-level={h.level}
                onClick={() => scrollToHeading(h.id)}
              >
                {h.text}
              </button>
            ))}
          </div>
        )}
      </nav>
      <article className="note-content" ref={highlightRef}>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h2: ({ node, ...rest }) => <h2 id={idFor({ node })} {...rest} />,
            h3: ({ node, ...rest }) => <h3 id={idFor({ node })} {...rest} />,
          }}
        >
          {active.content}
        </ReactMarkdown>
      </article>
    </div>
  );
}
