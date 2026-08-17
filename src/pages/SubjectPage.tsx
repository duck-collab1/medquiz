import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getSubject } from "../config/subjects";
import { getNotesForSubject } from "../services/notesService";
import {
  fetchQuestions,
  getGroups,
  hasHierarchy,
  KNOWN_GROUPS,
} from "../services/questionsService";
import { EntityGrid } from "../components/EntityGrid";
import { LessonView } from "../components/LessonView";
import { SubjectIcon } from "../components/SubjectIcon";
import { GROUP_ICONS } from "../config/groupIcons";
import { slugify } from "../utils/slug";
import type { Question, SubjectId } from "../types";

export function SubjectPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  const subject = subjectId ? getSubject(subjectId) : undefined;

  const knownGroups = subject ? KNOWN_GROUPS[subject.id as SubjectId] : undefined;

  useEffect(() => {
    if (!subject || knownGroups) return;
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
  }, [subject, knownGroups]);

  if (!subject) {
    return <Navigate to="/" replace />;
  }

  if (loading && !knownGroups) {
    return (
      <div className="subject-page">
        <p>Đang tải...</p>
      </div>
    );
  }

  const notes = getNotesForSubject(subject.id as SubjectId);

  if (knownGroups || hasHierarchy(questions)) {
    const groups = knownGroups ?? getGroups(questions);
    const items = groups.map((g) => ({
      slug: slugify(g),
      title: g,
      icon: GROUP_ICONS[g],
    }));

    return (
      <div className="subject-page">
        <header className="subject-header">
          <Link to="/" className="back-link">
            ← Dashboard
          </Link>
          <h1>
            <SubjectIcon name={subject.icon} className="heading-icon" size={30} /> {subject.name}
          </h1>
        </header>
        <EntityGrid items={items} basePath={`/subjects/${subject.id}`} />
      </div>
    );
  }

  return (
    <LessonView
      title={subject.name}
      icon={subject.icon}
      backTo="/"
      backLabel="← Dashboard"
      notes={notes}
      subject={subject.id as SubjectId}
    />
  );
}
