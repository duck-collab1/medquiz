import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getSubject } from "../config/subjects";
import { getNotesForSubject } from "../services/notesService";
import {
  fetchQuestions,
  getGroups,
  hasHierarchy,
} from "../services/questionsService";
import { EntityGrid } from "../components/EntityGrid";
import { LessonView } from "../components/LessonView";
import { slugify } from "../utils/slug";
import type { Question, SubjectId } from "../types";

const GROUP_ICONS: Record<string, string> = {
  "Nội tiết": "🦋",
  "Hô hấp": "🫁",
};

export function SubjectPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  const subject = subjectId ? getSubject(subjectId) : undefined;

  useEffect(() => {
    if (!subject) return;
    let cancelled = false;
    setLoading(true);
    fetchQuestions(subject.id as SubjectId)
      .then((qs) => {
        if (!cancelled) setQuestions(qs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject]);

  if (!subject) {
    return <Navigate to="/" replace />;
  }

  if (loading) {
    return (
      <div className="subject-page">
        <p>Đang tải...</p>
      </div>
    );
  }

  const notes = getNotesForSubject(subject.id as SubjectId);

  if (hasHierarchy(questions)) {
    const groups = getGroups(questions);
    const items = groups.map((g) => ({
      slug: slugify(g),
      title: g,
      icon: GROUP_ICONS[g] || "📚",
    }));

    return (
      <div className="subject-page">
        <header className="subject-header">
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
          <h1>
            {subject.icon} {subject.name}
          </h1>
        </header>
        <EntityGrid items={items} basePath={`/subjects/${subject.id}`} />
      </div>
    );
  }

  return (
    <LessonView
      title={`${subject.icon} ${subject.name}`}
      backTo="/"
      backLabel="← Dashboard"
      notes={notes}
      subject={subject.id as SubjectId}
    />
  );
}
