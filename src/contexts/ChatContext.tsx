import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { askAi, clearChatHistory, getChatHistory, saveChatMessage } from "../services/chatService";
import type { ChatMessage } from "../types";

interface ChatContextValue {
  open: boolean;
  historyLoaded: boolean;
  messages: ChatMessage[];
  input: string;
  sending: boolean;
  error: string;
  setInput: (value: string) => void;
  toggleOpen: () => void;
  closeChat: () => void;
  send: (text: string) => void;
  /** Mở khung chat (nếu đang đóng) và gửi ngay 1 câu hỏi soạn sẵn — dùng cho các nút "Hỏi AI" theo ngữ cảnh. */
  askAboutQuestion: (prompt: string) => void;
  /** Xóa lịch sử chat (dùng khi hội thoại bị hỏng, AI cứ báo lỗi liên tục). */
  clearHistory: () => void;
}

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);

  useEffect(() => {
    if (open && !historyLoaded && user) {
      getChatHistory(user.uid)
        .then(setMessages)
        .catch((err) => console.error(err))
        .finally(() => setHistoryLoaded(true));
    }
  }, [open, historyLoaded, user]);

  const send = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || !user || sending || !historyLoaded) return;

      setError("");
      setInput("");

      const userMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        role: "user",
        content: trimmed,
        createdAt: Date.now(),
      };
      // Tính trước mảng tin nhắn mới từ closure (không đặt bên trong callback của
      // setMessages) vì React Strict Mode gọi lại updater callback 2 lần ở dev mode —
      // nếu side-effect (gọi API) nằm trong đó sẽ bị gọi trùng.
      const nextMessages = [...messages, userMessage];
      setMessages(nextMessages);
      setSending(true);

      const aiMessageId = `local-${Date.now()}-ai`;

      (async () => {
        try {
          await saveChatMessage(user.uid, "user", trimmed);

          let started = false;
          const reply = await askAi(
            nextMessages.map((m) => ({ role: m.role, content: m.content })),
            (_chunk, fullTextSoFar) => {
              if (!started) {
                started = true;
                setMessages((prev) => [
                  ...prev,
                  {
                    id: aiMessageId,
                    role: "assistant",
                    content: fullTextSoFar,
                    createdAt: Date.now(),
                  },
                ]);
              } else {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === aiMessageId ? { ...m, content: fullTextSoFar } : m,
                  ),
                );
              }
            },
          );

          if (!started) {
            setMessages((prev) => [
              ...prev,
              {
                id: aiMessageId,
                role: "assistant",
                content: reply,
                createdAt: Date.now(),
              },
            ]);
          }
          await saveChatMessage(user.uid, "assistant", reply);
        } catch (err) {
          console.error(err);
          setError(
            err instanceof Error ? err.message : "Có lỗi xảy ra, thử lại sau.",
          );
        } finally {
          setSending(false);
        }
      })();
    },
    [user, sending, historyLoaded, messages],
  );

  // Nếu đang có 1 câu hỏi trong lúc gửi (vd. người dùng bấm nút "Hỏi AI"
  // nhiều lần liên tiếp trên mạng chậm), bỏ qua các lần bấm thêm thay vì xếp
  // hàng gửi lại - tránh gửi trùng nhiều bản y hệt nhau (đã gặp trên mobile).
  const askAboutQuestion = useCallback(
    (prompt: string) => {
      setOpen(true);
      if (sending) return;
      setPendingPrompt(prompt);
    },
    [sending],
  );

  // Chờ lịch sử tải xong (nếu khung chat vừa được mở) rồi mới gửi câu hỏi soạn sẵn.
  useEffect(() => {
    if (pendingPrompt && historyLoaded && !sending) {
      const prompt = pendingPrompt;
      setPendingPrompt(null);
      send(prompt);
    }
  }, [pendingPrompt, historyLoaded, sending, send]);

  const clearHistory = useCallback(() => {
    if (!user) return;
    setMessages([]);
    setError("");
    clearChatHistory(user.uid).catch((err) => console.error(err));
  }, [user]);

  const value: ChatContextValue = {
    open,
    historyLoaded,
    messages,
    input,
    sending,
    error,
    setInput,
    toggleOpen: () => setOpen((o) => !o),
    closeChat: () => setOpen(false),
    send,
    askAboutQuestion,
    clearHistory,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChatContext() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}
