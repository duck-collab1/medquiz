import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Question, SubjectId } from "../types";

export async function fetchQuestions(
  subject: SubjectId,
): Promise<Question[]> {
  const q = query(
    collection(db!, "questions"),
    where("subject", "==", subject),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Question);
}

export function splitByReviewStatus(questions: Question[]) {
  const ready = questions.filter((q) => !q.needsReview);
  const needsReview = questions.filter((q) => q.needsReview);
  return { ready, needsReview };
}

/** Nhóm ảo cho câu hỏi chưa gán chương — không lưu trong Firestore. */
export const FALLBACK_GROUP = "Khác";

/** Môn có ít nhất 1 câu hỏi được gán chương thì mới hiển thị màn chọn chương. */
export function hasHierarchy(questions: Question[]): boolean {
  return questions.some((q) => q.group && q.group.trim());
}

export function getGroups(questions: Question[]): string[] {
  const set = new Set(questions.map((q) => q.group || FALLBACK_GROUP));
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}

export function getChaptersInGroup(questions: Question[], group: string): string[] {
  const set = new Set(
    questions
      .filter((q) => (q.group || FALLBACK_GROUP) === group && q.chapter)
      .map((q) => q.chapter),
  );
  return [...set].sort((a, b) => a.localeCompare(b, "vi"));
}
