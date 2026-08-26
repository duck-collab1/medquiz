import { auth } from "../firebase";
import {
  deleteCloudSession,
  deleteCloudWrongAnswer,
  pullAllProgress,
  pushReview,
  pushSession,
  pushStats,
  pushStreak,
  pushWrongAnswer,
} from "./cloudSyncService";
import type { AnswerKey, SubjectId } from "../types";

const STATS_KEY = "medquiz:stats";
const SESSION_PREFIX = "medquiz:session:";
const WRONG_KEY = "medquiz:wrong";
const STREAK_KEY = "medquiz:streak";
// Khớp với FAVORITES_KEY trong MusicWidget.tsx và PROGRESS_KEY trong
// VideoLibraryPage.tsx - 2 nơi đó tự đẩy lên cloud trực tiếp (đã có sẵn uid
// từ useAuth), ở đây chỉ lo phần kéo về khi đăng nhập.
const MUSIC_FAVORITES_KEY = "medquiz:musicFavorites";
const VIDEO_PROGRESS_KEY = "medquiz:videoProgress";

function currentUid(): string | undefined {
  return auth?.currentUser?.uid;
}

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
  const uid = currentUid();
  if (uid) pushStats(uid, stats);
  touchStreak();
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

export interface WrongEntry {
  subject: SubjectId;
  group: string;
  chapter: string;
  wrongAt: string;
}

type WrongMap = Record<string, WrongEntry>;

function readWrongMap(): WrongMap {
  try {
    const raw = localStorage.getItem(WRONG_KEY);
    return raw ? (JSON.parse(raw) as WrongMap) : {};
  } catch {
    return {};
  }
}

function writeWrongMap(map: WrongMap): void {
  try {
    localStorage.setItem(WRONG_KEY, JSON.stringify(map));
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
}

/**
 * Ghi nhận câu vừa trả lời sai (gom vào tab "làm lại câu sai"). Nếu lần này
 * trả lời đúng thì xoá khỏi danh sách - coi như đã "trả nợ" câu đó, không
 * cần làm lại nữa.
 */
export function trackWrongAnswer(
  questionId: string,
  subject: SubjectId,
  group: string,
  chapter: string,
  isCorrect: boolean,
): void {
  const map = readWrongMap();
  const uid = currentUid();
  if (isCorrect) {
    if (!(questionId in map)) return;
    delete map[questionId];
    writeWrongMap(map);
    if (uid) deleteCloudWrongAnswer(uid, questionId);
    return;
  }
  map[questionId] = { subject, group, chapter, wrongAt: new Date().toISOString() };
  writeWrongMap(map);
  if (uid) pushWrongAnswer(uid, questionId, map[questionId]);
}

export function getWrongAnswers(): WrongMap {
  return readWrongMap();
}

export function getWrongAnswerCount(): number {
  return Object.keys(readWrongMap()).length;
}

const STREAK_INITIAL = { current: 0, longest: 0, lastActiveDate: "" };

export interface Streak {
  current: number;
  longest: number;
  lastActiveDate: string;
}

function readStreak(): Streak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    return raw ? (JSON.parse(raw) as Streak) : { ...STREAK_INITIAL };
  } catch {
    return { ...STREAK_INITIAL };
  }
}

/** "YYYY-MM-DD" theo giờ địa phương của thiết bị (không dùng toISOString - luôn quy về UTC). */
function localDateStr(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Cập nhật streak ngày ôn tập liên tiếp - gọi mỗi khi trả lời 1 câu. */
function touchStreak(): void {
  const today = localDateStr();
  const streak = readStreak();
  if (streak.lastActiveDate === today) return;

  const yesterday = localDateStr(new Date(Date.now() - 86400000));
  const current = streak.lastActiveDate === yesterday ? streak.current + 1 : 1;
  const next: Streak = {
    current,
    longest: Math.max(streak.longest, current),
    lastActiveDate: today,
  };
  try {
    localStorage.setItem(STREAK_KEY, JSON.stringify(next));
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
  const uid = currentUid();
  if (uid) pushStreak(uid, next);
}

export function getStreak(): Streak {
  return readStreak();
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
  const uid = currentUid();
  if (uid) pushReview(uid, key, map[key]);
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

/** Phần hậu tố định danh 1 phiên quiz - dùng làm id doc trên Firestore luôn. */
function sessionKeySuffix(
  subject: SubjectId,
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): string {
  return `${subject}:${group ?? ""}:${chapter ?? ""}:${onlyCase ? "case" : "mcq"}`;
}

function sessionKey(
  subject: SubjectId,
  group?: string,
  chapter?: string,
  onlyCase?: boolean,
): string {
  return `${SESSION_PREFIX}${sessionKeySuffix(subject, group, chapter, onlyCase)}`;
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
  const uid = currentUid();
  if (uid) pushSession(uid, sessionKeySuffix(subject, group, chapter, onlyCase), session);
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
  const uid = currentUid();
  if (uid) deleteCloudSession(uid, sessionKeySuffix(subject, group, chapter, onlyCase));
}

/**
 * Tải toàn bộ tiến trình từ server và ghi đè vào localStorage - gọi 1 lần
 * ngay sau khi đăng nhập để thiết bị hiện tại thấy được tiến trình đã làm
 * trên các thiết bị khác (trước đây mỗi máy chỉ biết tiến trình của chính nó).
 */
export async function syncFromCloud(uid: string): Promise<void> {
  const cloud = await pullAllProgress(uid);
  try {
    if (cloud.stats) localStorage.setItem(STATS_KEY, JSON.stringify(cloud.stats));
    if (cloud.streak) localStorage.setItem(STREAK_KEY, JSON.stringify(cloud.streak));
    if (Object.keys(cloud.reviews).length > 0) {
      localStorage.setItem(REVIEW_KEY, JSON.stringify(cloud.reviews));
    }
    if (Object.keys(cloud.wrongAnswers).length > 0) {
      localStorage.setItem(WRONG_KEY, JSON.stringify(cloud.wrongAnswers));
    }
    if (cloud.musicFavorites) localStorage.setItem(MUSIC_FAVORITES_KEY, JSON.stringify(cloud.musicFavorites));
    if (cloud.videoProgress) localStorage.setItem(VIDEO_PROGRESS_KEY, JSON.stringify(cloud.videoProgress));
    for (const [suffix, session] of Object.entries(cloud.sessions)) {
      localStorage.setItem(`${SESSION_PREFIX}${suffix}`, JSON.stringify(session));
    }
  } catch {
    // localStorage không dùng được - bỏ qua, vẫn tiếp tục dùng app bình thường
  }
}
