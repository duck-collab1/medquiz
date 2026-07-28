import { useEffect, useRef } from "react";
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
  } = useChatContext();
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, sending]);

  if (!user) return null;

  return (
    <div className="chat-widget">
      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <span>Trợ lý AI</span>
            <button onClick={closeChat} aria-label="Đóng">
              ✕
            </button>
          </div>

          <div className="chat-messages" ref={listRef}>
            {!historyLoaded && <p className="chat-empty">Đang tải lịch sử...</p>}
            {historyLoaded && messages.length === 0 && (
              <p className="chat-empty">
                Hỏi mình bất cứ điều gì về Nội, Ngoại, Sản, Nhi để ôn thi nhé.
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user"
                    ? "chat-bubble chat-bubble-user"
                    : "chat-bubble chat-bubble-ai"
                }
              >
                {m.content}
              </div>
            ))}
            {sending && (
              <div className="chat-bubble chat-bubble-ai chat-typing">
                Đang trả lời...
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
