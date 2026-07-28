import { useState } from "react";
import ReactMarkdown from "react-markdown";
import type { NoteFile } from "../services/notesService";

export function NoteViewer({ notes }: { notes: NoteFile[] }) {
  const [activeSlug, setActiveSlug] = useState(notes[0]?.slug);

  if (notes.length === 0) {
    return <p>Chưa có ghi chú nào cho môn này.</p>;
  }

  const active = notes.find((n) => n.slug === activeSlug) ?? notes[0];

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
      </nav>
      <article className="note-content">
        <ReactMarkdown>{active.content}</ReactMarkdown>
      </article>
    </div>
  );
}
