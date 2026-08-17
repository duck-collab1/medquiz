import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import { getSubject } from "../config/subjects";
import {
  fetchQuestions,
  getGroups,
  getChaptersInGroup,
  KNOWN_GROUPS,
} from "../services/questionsService";
import { getNotesForChapter } from "../services/notesService";
import { LessonView } from "../components/LessonView";
import { slugify } from "../utils/slug";
import type { Question, SubjectId } from "../types";

export function ChapterPage() {
  const { subjectId, groupSlug, chapterSlug } = useParams<{
    subjectId: string;
    groupSlug: string;
    chapterSlug: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  const subject = subjectId ? getSubject(subjectId) : undefined;
  const knownGroups = subject ? KNOWN_GROUPS[subject.id as SubjectId] : undefined;
  const knownGroup = knownGroups?.find((g) => slugify(g) === groupSlug);

  useEffect(() => {
    if (!subject) return;
    if (knownGroups && !knownGroup) return;
    let cancelled = false;
    setLoading(true);
    fetchQuestions(subject.id as SubjectId, knownGroup)
      .then((qs) => {
        if (!cancelled) setQuestions(qs);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [subject, knownGroups, knownGroup]);

  if (!subject) return <Navigate to="/" replace />;
  if (knownGroups && !knownGroup) {
    return <Navigate to={`/subjects/${subject.id}`} replace />;
  }
  if (loading) {
    return (
      <div className="subject-page">
        <p>Đang tải...</p>
      </div>
    );
  }

  const group = knownGroup ?? getGroups(questions).find((g) => slugify(g) === groupSlug);
  if (!group) return <Navigate to={`/subjects/${subject.id}`} replace />;

  const groupPath = `/subjects/${subject.id}/${groupSlug}`;
  const isAll = chapterSlug === "tat-ca";
  const chapters = getChaptersInGroup(questions, group);
  const chapter = isAll ? undefined : chapters.find((c) => slugify(c) === chapterSlug);

  if (!isAll && !chapter) return <Navigate to={groupPath} replace />;

  const notes = getNotesForChapter(subject.id as SubjectId, group, chapter);

  return (
    <LessonView
      title={isAll ? `${group} — Tất cả các bài` : chapter!}
      backTo={groupPath}
      backLabel={`← ${group}`}
      notes={notes}
      subject={subject.id as SubjectId}
      group={group}
      chapter={chapter}
    />
  );
}
