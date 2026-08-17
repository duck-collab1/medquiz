import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import type { Question, SubjectId } from "../types";

export async function fetchQuestions(
  subject: SubjectId,
  group?: string,
): Promise<Question[]> {
  const constraints = [where("subject", "==", subject)];
  if (group) constraints.push(where("group", "==", group));
  const q = query(collection(db!, "questions"), ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data() as Question);
}

/**
 * Danh sách chương (group) đã biết trước cho các môn có quá nhiều câu hỏi
 * (hàng chục nghìn) - tránh phải tải toàn bộ câu hỏi của môn chỉ để liệt kê
 * chương trên SubjectPage/GroupPage.
 */
export const KNOWN_GROUPS: Partial<Record<SubjectId, string[]>> = {
  "test-moi": ["Nội", "Ngoại", "Sản", "Nhi"],
};

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
