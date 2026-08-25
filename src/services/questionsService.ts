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
  "test-anh-hai": ["Nội", "Nhi"],
};

export function splitByReviewStatus(questions: Question[]) {
  const ready = questions.filter((q) => !q.needsReview);
  const needsReview = questions.filter((q) => q.needsReview);
  return { ready, needsReview };
}

/**
 * Sắp xếp lại đúng thứ tự gốc của đề theo id (vd mcq-001, mcq-002...) - so
 * sánh kiểu tự nhiên (numeric) để "bai-2" đứng trước "bai-10" thay vì so
 * sánh chuỗi thường sẽ ra sai thứ tự. Firestore không đảm bảo thứ tự trả về
 * nếu không có orderBy, nên phải tự sắp lại sau khi tải về.
 */
export function sortByOriginalOrder(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
}

/**
 * Gom các câu hỏi liên tiếp (sau khi đã sắp đúng thứ tự) cùng chung 1 case
 * lâm sàng (case_stem giống hệt nhau) thành 1 nhóm - để hiển thị chung 1
 * trang thay vì phân trang từng câu một. Câu không có case_stem (hoặc case
 * khác câu trước) tự thành nhóm riêng 1 câu.
 */
export function groupByCaseStem(questions: Question[]): Question[][] {
  const groups: Question[][] = [];
  for (const q of questions) {
    const last = groups[groups.length - 1];
    if (q.caseStem && last?.[0].caseStem === q.caseStem) {
      last.push(q);
    } else {
      groups.push([q]);
    }
  }
  return groups;
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
