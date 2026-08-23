import { useLayoutEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAuth } from "../contexts/AuthContext";
import { useChatContext } from "../contexts/ChatContext";

export function ChatWidget() {
  const { user } = useAuth();
  const {
    open,
    historyLoaded,
    messages,
    input,
    sending,
    error,
    setInput,
    toggleOpen,
    closeChat,
    send,
    clearHistory,
  } = useChatContext();
  const listRef = useRef<HTMLDivElement>(null);

  // Khung chat bị unmount/mount lại mỗi lần đóng/mở (render có điều kiện theo
  // `open`), nên phải cuộn lại mỗi lần mở (thêm `open` vào dependency) chứ
  // không chỉ khi có tin nhắn mới - nếu không, lần mở lại sẽ luôn ở đầu trang
  // vì phần tử DOM là mới, dù `messages`/`sending` không đổi.
  useLayoutEffect(() => {
    if (!open) return;
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [open, historyLoaded, messages, sending]);

  if (!user) return null;

  const lastMessage = messages[messages.length - 1];
  const showTypingPlaceholder = sending && lastMessage?.role !== "assistant";

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>Trợ lý AI</span>
            <div className="chat-panel-header-actions">
              {messages.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm("Xóa toàn bộ lịch sử trò chuyện? Dùng khi AI cứ báo lỗi liên tục.")) {
                      clearHistory();
                    }
                  }}
                  aria-label="Xóa lịch sử trò chuyện"
                  title="Xóa lịch sử trò chuyện"
                >
                  🗑️
                </button>
              )}
              <button onClick={closeChat} aria-label="Đóng">
                ✕
              </button>
            </div>
          </div>

          <div className="chat-messages" ref={listRef}>
            {!historyLoaded && <p className="chat-empty">Đang tải lịch sử...</p>}
            {historyLoaded && messages.length === 0 && (
              <p className="chat-empty">
                Hỏi mình bất cứ điều gì về Nội, Ngoại, Sản, Nhi để ôn thi nhé.
              </p>
            )}
            {messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="chat-bubble chat-bubble-user">
                  {m.content}
                </div>
              ) : (
                <div key={m.id} className="chat-bubble chat-bubble-ai chat-markdown">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {m.content}
                  </ReactMarkdown>
                </div>
              ),
            )}
            {showTypingPlaceholder && (
              <div className="chat-bubble chat-bubble-ai chat-typing">
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
                <span className="chat-typing-dot" />
              </div>
            )}
          </div>

          {error && <p className="form-error chat-error">{error}</p>}

          <div className="chat-input-row">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Nhập câu hỏi..."
              rows={2}
            />
            <button
              onClick={() => send(input)}
              disabled={sending || !historyLoaded || !input.trim()}
            >
              Gửi
            </button>
          </div>
        </div>
      )}

      <button
        className="chat-toggle"
        onClick={toggleOpen}
        aria-label={open ? "Đóng chat" : "Mở chat hỏi đáp AI"}
      >
        {open ? "✕" : "💬"}
      </button>
    </div>
  );
}
