import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFloatingWidget } from "../contexts/FloatingWidgetContext";

// Chấp nhận link dạng youtube.com/watch?v=, youtu.be/, youtube.com/embed/,
// hoặc dán thẳng 11 ký tự ID của video.
function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  const match = trimmed.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{11})/);
  if (match) return match[1];
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return null;
}

interface YTPlayer {
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
}

interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

const YT_STATE_ENDED = 0;

declare global {
  interface Window {
    YT?: {
      Player: new (
        element: string | HTMLElement,
        options: {
          videoId: string;
          playerVars?: Record<string, number | string>;
          events?: {
            onReady?: (event: YTPlayerEvent) => void;
            onStateChange?: (event: YTPlayerEvent) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

const FAVORITES_KEY = "medquiz:musicFavorites";

interface Favorite {
  id: string;
  title: string;
}

function loadFavorites(): Favorite[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? (JSON.parse(raw) as Favorite[]) : [];
  } catch {
    return [];
  }
}

// Tải script IFrame Player API chính thức của YouTube 1 lần duy nhất (dùng
// API thật thay vì tự dò DOM bên trong iframe - vốn bị chặn bởi
// Same-Origin Policy của trình duyệt, không thể can thiệp được).
let apiLoadPromise: Promise<void> | null = null;
function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) return Promise.resolve();
  if (apiLoadPromise) return apiLoadPromise;
  apiLoadPromise = new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return apiLoadPromise;
}

export function MusicWidget() {
  const { user } = useAuth();
  const { dockVisible } = useFloatingWidget();
  const [panelOpen, setPanelOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");
  const [volume, setVolume] = useState(100);
  const [muted, setMuted] = useState(false);
  const [favorites, setFavorites] = useState<Favorite[]>(loadFavorites);
  const playerRef = useRef<YTPlayer | null>(null);
  const playerContainerRef = useRef<HTMLDivElement>(null);
  const favoritesRef = useRef(favorites);
  favoritesRef.current = favorites;

  function playNextFavorite(currentId: string) {
    const list = favoritesRef.current;
    if (list.length === 0) return;
    const idx = list.findIndex((f) => f.id === currentId);
    setVideoId(list[(idx + 1) % list.length].id);
  }

  useEffect(() => {
    if (!videoId || !playerContainerRef.current) return;
    let cancelled = false;
    // Tạo 1 node thuần túy nằm ngoài tầm quản lý của React để YouTube API tự
    // do thay thế bằng iframe của nó - nếu để React JSX render trực tiếp node
    // đó, React sẽ "insertBefore" lỗi khi diff lại vì node đã bị YouTube thay.
    const container = playerContainerRef.current;
    container.innerHTML = "";
    const target = document.createElement("div");
    container.appendChild(target);
    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      playerRef.current = new window.YT.Player(target, {
        videoId,
        playerVars: { autoplay: 1 },
        events: {
          onReady: (e) => e.target.setVolume(volume),
          onStateChange: (e) => {
            if (e.data === YT_STATE_ENDED) playNextFavorite(videoId);
          },
        },
      });
    });
    return () => {
      cancelled = true;
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

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

  function persistFavorites(next: Favorite[]) {
    setFavorites(next);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  }

  function saveFavorite() {
    if (!videoId || favorites.some((f) => f.id === videoId)) return;
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`)
      .then((r) => r.json())
      .then((data: { title?: string }) =>
        persistFavorites([...favorites, { id: videoId, title: data.title || videoId }]),
      )
      .catch(() => persistFavorites([...favorites, { id: videoId, title: videoId }]));
  }

  function removeFavorite(id: string) {
    persistFavorites(favorites.filter((f) => f.id !== id));
  }

  function handleVolumeChange(value: number) {
    setVolume(value);
    playerRef.current?.setVolume(value);
    if (value === 0 && !muted) setMuted(true);
    else if (value > 0 && muted) setMuted(false);
  }

  function toggleMute() {
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
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

          {favorites.length > 0 && (
            <div className="music-favorites">
              {favorites.map((f) => (
                <span key={f.id} className="music-favorite-chip">
                  <button onClick={() => setVideoId(f.id)} title={f.title}>
                    ▶ {f.title}
                  </button>
                  <button
                    className="music-favorite-remove"
                    onClick={() => removeFavorite(f.id)}
                    aria-label="Xóa khỏi danh sách yêu thích"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          )}

          {videoId && (
            <>
              <div ref={playerContainerRef} className="music-iframe" />
              <div className="music-volume-row">
                <button
                  className="music-mute"
                  onClick={toggleMute}
                  aria-label={muted ? "Bật tiếng" : "Tắt tiếng"}
                >
                  {muted || volume === 0 ? "🔇" : "🔊"}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={muted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(Number(e.target.value))}
                  aria-label="Âm lượng"
                />
                <button
                  className="music-favorite"
                  onClick={saveFavorite}
                  disabled={favorites.some((f) => f.id === videoId)}
                  aria-label="Lưu bài này"
                  title="Lưu bài này"
                >
                  {favorites.some((f) => f.id === videoId) ? "★" : "☆"}
                </button>
                <button className="music-stop" onClick={handleStop}>
                  Dừng
                </button>
              </div>
            </>
          )}
        </div>
      )}

      <button
        className={
          (videoId ? "music-toggle music-toggle-playing" : "music-toggle") +
          (dockVisible || panelOpen ? "" : " dock-hidden")
        }
        onClick={() => setPanelOpen((o) => !o)}
        aria-label={panelOpen ? "Đóng nhạc nền" : "Mở nhạc nền"}
      >
        {panelOpen ? "✕" : "🎵"}
      </button>
    </div>
  );
}
