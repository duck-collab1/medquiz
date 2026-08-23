import { useState } from "react";
import { Link } from "react-router-dom";
import { NoteViewer } from "./NoteViewer";
import { QuizRunner } from "./QuizRunner";
import { SubjectIcon } from "./SubjectIcon";
import type { IconName } from "../config/icons";
import type { NoteFile } from "../services/notesService";
import type { SubjectId } from "../types";

type Tab = "notes" | "quiz" | "case";

interface LessonViewProps {
  title: string;
  icon?: IconName;
  backTo: string;
  backLabel: string;
  notes: NoteFile[];
  subject: SubjectId;
  group?: string;
  chapter?: string;
}

export function LessonView({
  title,
  icon,
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
      <div className="lesson-sticky-header">
        <header className="subject-header">
          <Link to={backTo} className="back-link">
            {backLabel}
          </Link>
          <h1>
            {icon && <SubjectIcon name={icon} className="heading-icon" size={30} />} {title}
          </h1>
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
          <button
            className={tab === "case" ? "tab active" : "tab"}
            onClick={() => setTab("case")}
          >
            Case lâm sàng
          </button>
        </div>
      </div>

      <div className="tab-content">
        {tab === "notes" && <NoteViewer notes={notes} />}
        {tab === "quiz" && (
          <QuizRunner subject={subject} group={group} chapter={chapter} />
        )}
        {tab === "case" && (
          <QuizRunner subject={subject} group={group} chapter={chapter} onlyCase />
        )}
      </div>
    </div>
  );
}
