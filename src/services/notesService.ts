import { slugify } from "../utils/slug";
import type { SubjectId } from "../types";

export interface NoteFile {
  slug: string;
  title: string;
  content: string;
}

const noteModules = import.meta.glob<string>("../../data/notes/**/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

function extractTitle(content: string, fallback: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

function notesUnderPrefix(prefix: string): NoteFile[] {
  return Object.entries(noteModules)
    .filter(([path]) => path.startsWith(prefix))
    .map(([path, content]) => {
      const slug = path.slice(prefix.length).replace(/\.md$/, "");
      return {
        slug,
        title: extractTitle(content, slug),
        content,
      };
    })
    .sort((a, b) => a.title.localeCompare(b.title, "vi"));
}

/** Ghi chú ở cấp môn (dùng cho các môn chưa phân theo chương — Ngoại/Sản/Nhi). */
export function getNotesForSubject(subject: SubjectId): NoteFile[] {
  return notesUnderPrefix(`../../data/notes/${subject}/`);
}

/**
 * Ghi chú theo chương/bài (data/notes/<subject>/<chương-slug>/<bài-slug>.md).
 * Bỏ trống `chapter` để lấy toàn bộ ghi chú trong chương (ví dụ khi làm quiz
 * "toàn chương"). File ghi chú được đặt tên trùng slug của bài (`chapter`) để
 * khớp với slug dùng trong URL.
 */
export function getNotesForChapter(
  subject: SubjectId,
  group: string,
  chapter?: string,
): NoteFile[] {
  const prefix = `../../data/notes/${subject}/${slugify(group)}/`;
  const all = notesUnderPrefix(prefix);
  if (!chapter) return all;
  const chapterSlug = slugify(chapter);
  return all.filter((n) => n.slug === chapterSlug || n.slug.startsWith(`${chapterSlug}-`));
}
