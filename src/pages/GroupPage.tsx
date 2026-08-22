import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { getSubject } from "../config/subjects";
import {
  fetchQuestions,
  getChaptersInGroup,
  getGroups,
  KNOWN_GROUPS,
} from "../services/questionsService";
import { EntityGrid } from "../components/EntityGrid";
import { SubjectIcon } from "../components/SubjectIcon";
import { GROUP_ICONS } from "../config/groupIcons";
import { isExamTopic } from "../data/examSyllabus";
import { slugify } from "../utils/slug";
import type { Question, SubjectId } from "../types";

export function GroupPage() {
  const { subjectId, groupSlug } = useParams<{
    subjectId: string;
    groupSlug: string;
  }>();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);

  const subject = subjectId ? getSubject(subjectId) : undefined;
  const knownGroups = subject ? KNOWN_GROUPS[subject.id as SubjectId] : undefined;
  const knownGroup = knownGroups?.find((g) => slugify(g) === groupSlug);

  useEffect(() => {
    if (!subject) return;
    // Môn có danh sách chương tĩnh: chỉ tải đúng chương đang xem (tránh tải
    // toàn bộ hàng chục nghìn câu của cả môn).
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

  const chapters = getChaptersInGroup(questions, group);
  const items = [
    {
      slug: "tat-ca",
      title: "Trắc nghiệm toàn chương",
      subtitle: `Tất cả ${chapters.length} bài`,
      icon: "target" as const,
    },
    ...chapters.map((c) => ({
      slug: slugify(c),
      title: c,
      icon: "book-open" as const,
      isExamTopic: isExamTopic(subject.id, c),
    })),
  ];

  return (
    <div className="subject-page">
      <header className="subject-header">
        <Link to={`/subjects/${subject.id}`} className="back-link">
          ← {subject.name}
        </Link>
        <h1>
          <SubjectIcon name={GROUP_ICONS[group] ?? "book"} className="heading-icon" size={30} />{" "}
          {group}
        </h1>
      </header>
      <EntityGrid items={items} basePath={`/subjects/${subject.id}/${groupSlug}`} />
    </div>
  );
}
