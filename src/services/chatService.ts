import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import type { ChatMessage, ChatRole } from "../types";

const HISTORY_LIMIT = 10;

export async function getChatHistory(uid: string): Promise<ChatMessage[]> {
  const q = query(
    collection(db!, "chats", uid, "messages"),
    orderBy("createdAt", "asc"),
    limit(50),
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      role: data.role as ChatRole,
      content: data.content as string,
      createdAt: (data.createdAt as Timestamp | null)?.toMillis() ?? Date.now(),
    };
  });
}

export async function saveChatMessage(
  uid: string,
  role: ChatRole,
  content: string,
): Promise<void> {
  await addDoc(collection(db!, "chats", uid, "messages"), {
    role,
    content,
    createdAt: serverTimestamp(),
  });
}

export async function askAi(
  messages: { role: ChatRole; content: string }[],
  onDelta?: (chunk: string, fullTextSoFar: string) => void,
): Promise<string> {
  const user = auth!.currentUser;
  if (!user) throw new Error("Chưa đăng nhập.");

  const workerUrl = import.meta.env.VITE_CHAT_WORKER_URL;
  if (!workerUrl) {
    throw new Error(
      "Chưa cấu hình VITE_CHAT_WORKER_URL trong file .env — xem README mục AI hỏi đáp.",
    );
  }

  const idToken = await user.getIdToken();
  const recent = messages.slice(-HISTORY_LIMIT);

  const res = await fetch(workerUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ messages: recent }),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(errorBody?.error || "Không nhận được phản hồi từ AI.");
  }

  if (!res.body) {
    const data = (await res.json()) as { reply: string };
    onDelta?.(data.reply, data.reply);
    return data.reply;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) {
      full += chunk;
      onDelta?.(chunk, full);
    }
  }

  if (!full.trim()) {
    throw new Error("Không nhận được phản hồi từ AI.");
  }

  return full;
}
