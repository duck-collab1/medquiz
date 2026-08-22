import type { AnswerKey, SubjectId } from "../types";

const STATS_KEY = "medquiz:stats";
const SESSION_PREFIX = "medquiz:session:";

interface SubjectStats {
  answered: number;
  correct: number;
}

type StatsMap = Partial<Record<SubjectId, SubjectStats>>;

function readStats(): StatsMap {
  try {
    const raw = localStorage.getItem(STATS_KEY);
    return raw ? (JSON.parse(raw) as StatsMap) : {};
  } catch {
    return {};
  }
}

/** Ghi nhận 1 câu vừa được trả lời (cho thẻ tổng quan tiến độ ở Dashboard). */
export function recordAnswer(subject: SubjectId, isCorrect: boolean): void {
  const stats = readStats();
  const current = stats[subject] ?? { answered: 0, correct: 0 };
  stats[subject] = {
    answered: current.answered + 1,
    correct: current.correct + (isCorrect ? 1 : 0),
  };
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch {
    // localStorage đầy hoặc bị chặn (chế độ ẩn danh) - bỏ qua, không ảnh hưởng quiz.
  }
}

export function getOverallStats(): SubjectStats {
  const stats = readStats();
  return Object.values(stats).reduce(
    (acc, s) => ({
      answered: acc.answered + (s?.answered ?? 0),
      correct: acc.correct + (s?.correct ?? 0),
    }),
    { answered: 0, correct: 0 },
  );
}

const REVIEW_KEY = "medquiz:review";
const REVIEW_INTERVALS_DAYS = [1, 3, 7, 14, 30];

export interface ReviewEntry {
  subject: SubjectId;
  group?: string;
  chapter?: string;
  lastCompleted: string;
  stage: number;
}

type ReviewMap = Record<string, ReviewEntry>;

function reviewEntryKey(subject: SubjectId, group?: string, chapter?: string): string {
  return `${subject}:${group ?? ""}:${chapter ?? ""}`;
}

function readReviewMap(): ReviewMap {
  try {
    const raw = localStorage.getItem(REVIEW_KEY);
    return raw ? (JSON.parse(raw) as ReviewMap) : {};
  } catch {
    return {};
  }
}

/** Ghi nhận vừa hoàn thành 1 bài/chương, dùng để tính lịch ôn lại kiểu spaced repetition. */
export function recordChapterCompletion(
  subject: SubjectId,
  group?: string,
  chapter?: string,
): void {
  const map = readReviewMap();
  const key = reviewEntryKey(subject, group, chapter);
  const prevStage = map[key]?.stage ?? -1;
  map[key] = {
    subject,
    group,
    chapter,
    lastCompleted: new Date().toISOString(),
    stage: Math.min(prevStage + 1, REVIEW_INTERVALS_DAYS.length - 1),
  };
  try {
    localStorage.setItem(REVIEW_KEY, JSON.stringify(map));
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
}

export interface DueReview extends ReviewEntry {
  daysOverdue: number;
}

/** Danh sách các bài/chương đã đến hạn ôn lại (theo lịch spaced repetition), sắp xếp quá hạn nhiều nhất trước. */
export function getDueReviews(): DueReview[] {
  const map = readReviewMap();
  const now = Date.now();
  const due: DueReview[] = [];
  for (const entry of Object.values(map)) {
    const intervalDays = REVIEW_INTERVALS_DAYS[entry.stage] ?? REVIEW_INTERVALS_DAYS[0];
    const dueAt = new Date(entry.lastCompleted).getTime() + intervalDays * 86400000;
    if (now >= dueAt) {
      due.push({ ...entry, daysOverdue: Math.floor((now - dueAt) / 86400000) });
    }
  }
  return due.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

export interface QuizSession {
  currentIndex: number;
  answers: Record<string, AnswerKey>;
  questionIds: string[];
}

function sessionKey(
  subject: SubjectId,
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): string {
  return `${SESSION_PREFIX}${subject}:${group ?? ""}:${chapter ?? ""}:${onlyCase ? "case" : "mcq"}`;
}

/** Đọc tiến độ đã lưu, chỉ trả về nếu bộ câu hỏi hiện tại khớp đúng với lúc lưu. */
export function loadSession(
  subject: SubjectId,
  questionIds: string[],
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): QuizSession | null {
  try {
    const raw = localStorage.getItem(sessionKey(subject, group, chapter, onlyCase));
    if (!raw) return null;
    const saved = JSON.parse(raw) as QuizSession;
    if (
      !Array.isArray(saved.questionIds) ||
      saved.questionIds.length !== questionIds.length ||
      saved.questionIds.some((id, i) => id !== questionIds[i])
    ) {
      return null;
    }
    return saved;
  } catch {
    return null;
  }
}

export function saveSession(
  subject: SubjectId,
  session: QuizSession,
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): void {
  try {
    localStorage.setItem(
      sessionKey(subject, group, chapter, onlyCase),
      JSON.stringify(session),
    );
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
}

export function clearSession(
  subject: SubjectId,
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): void {
  try {
    localStorage.removeItem(sessionKey(subject, group, chapter, onlyCase));
  } catch {
    // bỏ qua
  }
}
