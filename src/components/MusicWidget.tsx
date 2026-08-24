import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";

// Chấp nhận link dạng youtube.com/watch?v=, youtu.be/, youtube.com/embed/,
// hoặc dán thẳng 11 ký tự ID của video.
function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

export function MusicWidget() {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");

  if (!user) return null;

  function handlePlay() {
    const id = extractVideoId(urlInput);
    if (!id) {
      setInputError("Link YouTube không hợp lệ.");
      return;
    }
    setInputError("");
    setVideoId(id);
  }

  function handleStop() {
    setVideoId(null);
    setUrlInput("");
  }

  return (
    <div className="music-widget">
      {(panelOpen || videoId) && (
        <div className={panelOpen ? "music-panel" : "music-panel music-panel-collapsed"}>
          <div className="chat-panel-header">
            <span>🎵 Nhạc nền học bài</span>
            <button onClick={() => setPanelOpen(false)} aria-label="Đóng">
              ✕
            </button>
          </div>

          <div className="music-input-row">
            <input
              type="text"
              placeholder="Dán link YouTube..."
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handlePlay()}
            />
            <button onClick={handlePlay}>Phát</button>
          </div>
          {inputError && <p className="form-error music-error">{inputError}</p>}

          {videoId && (
            <>
              <iframe
                className="music-iframe"
                src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                title="Nhạc nền học bài"
                allow="autoplay; encrypted-media"
                allowFullScreen
              />
              <button className="music-stop" onClick={handleStop}>
                Dừng nhạc
              </button>
            </>
          )}
        </div>
      )}

      <button
        className={videoId ? "music-toggle music-toggle-playing" : "music-toggle"}
        onClick={() => setPanelOpen((o) => !o)}
        aria-label={panelOpen ? "Đóng nhạc nền" : "Mở nhạc nền"}
      >
        {panelOpen ? "✕" : "🎵"}
      </button>
    </div>
  );
}
