import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";

// Ghi lên Firestore để tiến trình quiz + lịch ôn đồng bộ được giữa các thiết
// bị (trước đây chỉ lưu localStorage, mỗi máy 1 tiến trình riêng). Mọi hàm
// ghi ở đây là "fire and forget" - không chặn thao tác của người dùng, chỉ
// âm thầm đồng bộ nền; nếu lỗi mạng thì bỏ qua, lần ghi tiếp theo sẽ tự bù.

// Firestore không cho "/" trong doc id (hiểu là dấu phân cách đường dẫn).
function docSafeId(key: string): string {
  return key.replace(/\//g, "_");
}

export function pushStats(uid: string, stats: unknown): void {
  setDoc(doc(db!, "users", uid), { stats }, { merge: true }).catch(() => {});
}

export function pushSession(uid: string, sessionKey: string, session: unknown): void {
  setDoc(doc(db!, "users", uid, "sessions", docSafeId(sessionKey)), {
    ...(session as object),
    updatedAt: Date.now(),
  }).catch(() => {});
}

export function deleteCloudSession(uid: string, sessionKey: string): void {
  deleteDoc(doc(db!, "users", uid, "sessions", docSafeId(sessionKey))).catch(() => {});
}

export function pushReview(uid: string, reviewKey: string, entry: unknown): void {
  setDoc(doc(db!, "users", uid, "reviews", docSafeId(reviewKey)), entry as object).catch(() => {});
}

export function pushWrongAnswer(uid: string, questionId: string, entry: unknown): void {
  setDoc(doc(db!, "users", uid, "wrongAnswers", docSafeId(questionId)), entry as object).catch(() => {});
}

export function deleteCloudWrongAnswer(uid: string, questionId: string): void {
  deleteDoc(doc(db!, "users", uid, "wrongAnswers", docSafeId(questionId))).catch(() => {});
}

export function pushStreak(uid: string, streak: unknown): void {
  setDoc(doc(db!, "users", uid), { streak }, { merge: true }).catch(() => {});
}

export function pushMusicFavorites(uid: string, favorites: unknown): void {
  setDoc(doc(db!, "users", uid), { musicFavorites: favorites }, { merge: true }).catch(() => {});
}

export function pushVideoProgress(uid: string, progress: unknown): void {
  setDoc(doc(db!, "users", uid), { videoProgress: progress }, { merge: true }).catch(() => {});
}

export interface CloudProgress {
  stats: unknown;
  streak: unknown;
  musicFavorites: unknown;
  videoProgress: unknown;
  sessions: Record<string, unknown>;
  reviews: Record<string, unknown>;
  wrongAnswers: Record<string, unknown>;
}

/** Tải toàn bộ tiến trình từ server - gọi 1 lần sau khi đăng nhập để đồng bộ về máy hiện tại. */
export async function pullAllProgress(uid: string): Promise<CloudProgress> {
  const [userSnap, sessionsSnap, reviewsSnap, wrongSnap] = await Promise.all([
    getDoc(doc(db!, "users", uid)),
    getDocs(collection(db!, "users", uid, "sessions")),
    getDocs(collection(db!, "users", uid, "reviews")),
    getDocs(collection(db!, "users", uid, "wrongAnswers")),
  ]);

  const sessions: Record<string, unknown> = {};
  for (const d of sessionsSnap.docs) sessions[d.id] = d.data();

  const reviews: Record<string, unknown> = {};
  for (const d of reviewsSnap.docs) reviews[d.id] = d.data();

  const wrongAnswers: Record<string, unknown> = {};
  for (const d of wrongSnap.docs) wrongAnswers[d.id] = d.data();

  return {
    stats: userSnap.exists() ? userSnap.data().stats : undefined,
    streak: userSnap.exists() ? userSnap.data().streak : undefined,
    musicFavorites: userSnap.exists() ? userSnap.data().musicFavorites : undefined,
    videoProgress: userSnap.exists() ? userSnap.data().videoProgress : undefined,
    sessions,
    reviews,
    wrongAnswers,
  };
}
