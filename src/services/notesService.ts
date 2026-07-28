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

export function getNotesForSubject(subject: SubjectId): NoteFile[] {
  const prefix = `../../data/notes/${subject}/`;
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
