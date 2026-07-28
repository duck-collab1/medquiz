import { useState } from "react";
import { Link } from "react-router-dom";
import { NoteViewer } from "./NoteViewer";
import { QuizRunner } from "./QuizRunner";
import type { NoteFile } from "../services/notesService";
import type { SubjectId } from "../types";

type Tab = "notes" | "quiz";

interface LessonViewProps {
  title: string;
  backTo: string;
  backLabel: string;
  notes: NoteFile[];
  subject: SubjectId;
  group?: string;
  chapter?: string;
}

export function LessonView({
  title,
  backTo,
  backLabel,
  notes,
  subject,
  group,
  chapter,
}: LessonViewProps) {
  const [tab, setTab] = useState<Tab>("notes");

  return (
    <div className="subject-page">
      <header className="subject-header">
        <Link to={backTo} className="back-link">
          {backLabel}
        </Link>
        <h1>{title}</h1>
      </header>

      <div className="tab-bar">
        <button
          className={tab === "notes" ? "tab active" : "tab"}
          onClick={() => setTab("notes")}
        >
          Ghi chú
        </button>
        <button
          className={tab === "quiz" ? "tab active" : "tab"}
          onClick={() => setTab("quiz")}
        >
          Trắc nghiệm
        </button>
      </div>

      <div className="tab-content">
        {tab === "notes" ? (
          <NoteViewer notes={notes} />
        ) : (
          <QuizRunner subject={subject} group={group} chapter={chapter} />
        )}
      </div>
    </div>
  );
}
