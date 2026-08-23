import {
  addDoc,
  collection,
  deleteDoc,
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
const MAX_MESSAGE_LENGTH = 4000;

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

/**
 * Xóa toàn bộ lịch sử chat của người dùng - dùng khi hội thoại bị hỏng (vd.
 * nhiều tin nhắn "user" liên tiếp do 1 bug gửi trùng trước đây khiến
 * Anthropic API từ chối mọi câu hỏi sau đó) và người dùng muốn bắt đầu lại.
 */
export async function clearChatHistory(uid: string): Promise<void> {
  const snapshot = await getDocs(collection(db!, "chats", uid, "messages"));
  await Promise.all(snapshot.docs.map((d) => deleteDoc(d.ref)));
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
  // Lọc bỏ tin nhắn rỗng/sai định dạng (có thể sót lại từ dữ liệu lịch sử cũ) và cắt bớt
  // nội dung quá dài — tránh để 1 bản ghi hỏng làm cả request bị worker từ chối.
  const recent = messages
    .filter(
      (m) =>
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim().length > 0,
    )
    .slice(-HISTORY_LIMIT)
    .map((m) => ({
      role: m.role,
      content:
        m.content.length > MAX_MESSAGE_LENGTH
          ? m.content.slice(0, MAX_MESSAGE_LENGTH)
          : m.content,
    }));

  // fetch() ném lỗi mạng cấp trình duyệt với thông báo rất khó hiểu với người
  // dùng ("Load failed" trên Safari/iOS, "Failed to fetch" trên Chrome...) -
  // đổi thành thông báo tiếng Việt rõ ràng thay vì hiện nguyên văn lỗi đó.
  let res: Response;
  try {
    res = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ messages: recent }),
    });
  } catch {
    throw new Error("Mất kết nối mạng, vui lòng kiểm tra internet và thử lại.");
  }

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
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        full += chunk;
        onDelta?.(chunk, full);
      }
    }
  } catch {
    // Kết nối bị ngắt giữa chừng (mất mạng, chuyển tab nền trên iOS...).
    // Nếu đã nhận được 1 phần trả lời thì vẫn giữ lại, không báo lỗi mất hết.
    if (!full.trim()) {
      throw new Error("Mất kết nối trong lúc chờ AI trả lời, vui lòng thử lại.");
    }
  }

  if (!full.trim()) {
    throw new Error("Không nhận được phản hồi từ AI.");
  }

  return full;
}
