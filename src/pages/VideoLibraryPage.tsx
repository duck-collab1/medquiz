import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Headphones, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { LECTURE_VIDEOS, type LectureVideo } from "../data/videos";
import { subjects } from "../config/subjects";
import { SubjectIcon } from "../components/SubjectIcon";
import type { IconName } from "../config/icons";
import { loadYouTubeApi, type YTPlayer } from "../utils/youtube";
import { auth } from "../firebase";
import { pushVideoProgress } from "../services/cloudSyncService";

const PROGRESS_KEY = "medquiz:videoProgress";
const SAVE_INTERVAL_MS = 5000;

interface VideoProgress {
  seconds: number;
  updatedAt: number;
}

function readProgress(): Record<string, VideoProgress> {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, VideoProgress>) : {};
  } catch {
    return {};
  }
}

function saveProgress(videoId: string, seconds: number): void {
  const map = readProgress();
  map[videoId] = { seconds, updatedAt: Date.now() };
  try {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch {
    // bỏ qua nếu localStorage không dùng được
  }
  const uid = auth?.currentUser?.uid;
  if (uid) pushVideoProgress(uid, map);
}

/** Video đang xem dở gần nhất (nếu còn tồn tại trong danh sách hiện tại). */
function findLastWatched(videos: LectureVideo[]): string | null {
  const map = readProgress();
  let best: { id: string; updatedAt: number } | null = null;
  for (const v of videos) {
    const p = map[v.id];
    if (p && (!best || p.updatedAt > best.updatedAt)) best = { id: v.id, updatedAt: p.updatedAt };
  }
  return best?.id ?? null;
}

/** Popup phát video - tự phát tiếp đúng chỗ đã dừng lần trước (lưu theo giây,
 * cập nhật định kỳ + khi đóng), dùng YouTube IFrame Player API thật (seekTo/
 * getCurrentTime) thay vì iframe thô vì iframe thô không đọc/điều khiển được
 * tiến trình phát. */
function VideoModal({ video, onClose }: { video: LectureVideo; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  useEffect(() => {
    const youtubeId = video.youtubeId;
    if (video.audioUrl || !youtubeId || !containerRef.current) return;
    let cancelled = false;
    const container = containerRef.current;
    container.innerHTML = "";
    const target = document.createElement("div");
    container.appendChild(target);
    let saveTimer: number | undefined;

    loadYouTubeApi().then(() => {
      if (cancelled || !window.YT) return;
      const startSeconds = Math.floor(readProgress()[video.id]?.seconds ?? 0);
      playerRef.current = new window.YT.Player(target, {
        videoId: youtubeId,
        playerVars: { autoplay: 1, start: startSeconds },
        events: {
          onReady: () => {
            saveTimer = window.setInterval(() => {
              const t = playerRef.current?.getCurrentTime();
              if (typeof t === "number" && t > 0) saveProgress(video.id, t);
            }, SAVE_INTERVAL_MS);
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (saveTimer) clearInterval(saveTimer);
      const t = playerRef.current?.getCurrentTime();
      if (typeof t === "number" && t > 0) saveProgress(video.id, t);
      playerRef.current?.destroy();
      playerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id, video.youtubeId, video.audioUrl]);

  return (
    <div className="video-modal-backdrop" onClick={onClose}>
      <div className="video-modal" onClick={(e) => e.stopPropagation()}>
        <div className="chat-panel-header">
          <span>{video.title}</span>
          <button onClick={onClose} aria-label="Đóng">
            ✕
          </button>
        </div>
        {video.audioUrl ? (
          <AudioBody videoId={video.id} src={video.audioUrl} />
        ) : (
          <div ref={containerRef} className="video-modal-frame" />
        )}
      </div>
    </div>
  );
}

/** Trình phát audio cho bài giảng tự host - cũng nhớ chỗ nghe dở như bản YouTube. */
const RATE_KEY = "medquiz:audioRate";
const RATES = [1, 1.25, 1.5, 1.75, 2];

function readRate(): number {
  try {
    const r = Number(localStorage.getItem(RATE_KEY));
    return RATES.includes(r) ? r : 1;
  } catch {
    return 1;
  }
}

function fmtTime(s: number): string {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

function AudioBody({ videoId, src }: { videoId: string; src: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [rate, setRate] = useState(readRate);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const start = readProgress()[videoId]?.seconds ?? 0;
    const onMeta = () => {
      setDur(el.duration);
      if (start > 0) el.currentTime = start;
      setCur(el.currentTime);
      void el.play().catch(() => undefined);
    };
    const onTime = () => setCur(el.currentTime);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    const timer = window.setInterval(() => {
      if (!el.paused && el.currentTime > 0) saveProgress(videoId, el.currentTime);
    }, SAVE_INTERVAL_MS);
    return () => {
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      clearInterval(timer);
      if (el.currentTime > 0) saveProgress(videoId, el.currentTime);
    };
  }, [videoId]);

  useEffect(() => {
    if (ref.current) ref.current.playbackRate = rate;
    try {
      localStorage.setItem(RATE_KEY, String(rate));
    } catch {
      // bỏ qua nếu localStorage không dùng được
    }
  }, [rate]);

  // Phím tắt: Space = phát/tạm dừng, ← / → = lùi/tới 15 giây.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const el = ref.current;
      if (!el || e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (
        t &&
        (t.isContentEditable ||
          t.tagName === "TEXTAREA" ||
          t.tagName === "SELECT" ||
          (t.tagName === "INPUT" && (t as HTMLInputElement).type !== "range"))
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat) return;
        if (el.paused) void el.play().catch(() => undefined);
        else el.pause();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const delta = e.key === "ArrowRight" ? 15 : -15;
        el.currentTime = Math.max(0, Math.min(el.duration || Infinity, el.currentTime + delta));
        setCur(el.currentTime);
      }
    };
    // Space trên nút đang focus kích hoạt click ở keyup - chặn để không bật/tắt 2 lần.
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") e.preventDefault();
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  const seekTo = (t: number) => {
    const el = ref.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(dur || t, t));
    setCur(el.currentTime);
  };
  const toggle = () => {
    const el = ref.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => undefined);
    else el.pause();
  };
  const pct = dur > 0 ? (cur / dur) * 100 : 0;

  return (
    <div className="audio-player">
      <div className={playing ? "audio-art playing" : "audio-art"}>
        <Headphones size={44} strokeWidth={1.5} />
        <span className="audio-eq" aria-hidden="true">
          <i />
          <i />
          <i />
          <i />
        </span>
      </div>

      <input
        className="audio-seek"
        type="range"
        min={0}
        max={dur || 0}
        step={1}
        value={Math.min(cur, dur || 0)}
        style={{ ["--pct" as string]: `${pct}%` }}
        onChange={(e) => seekTo(Number(e.target.value))}
        aria-label="Tua"
      />
      <div className="audio-times">
        <span>{fmtTime(cur)}</span>
        <span>-{fmtTime(dur - cur)}</span>
      </div>

      <div className="audio-controls">
        <button className="audio-skip" onClick={() => seekTo(cur - 15)} aria-label="Lùi 15 giây">
          <RotateCcw size={26} strokeWidth={1.75} />
          <span>15</span>
        </button>
        <button className="audio-play" onClick={toggle} aria-label={playing ? "Tạm dừng" : "Phát"}>
          {playing ? <Pause size={30} fill="currentColor" /> : <Play size={30} fill="currentColor" />}
        </button>
        <button className="audio-skip" onClick={() => seekTo(cur + 15)} aria-label="Tới 15 giây">
          <RotateCw size={26} strokeWidth={1.75} />
          <span>15</span>
        </button>
      </div>

      <div className="audio-rates">
        {RATES.map((r) => (
          <button key={r} className={r === rate ? "active" : ""} onClick={() => setRate(r)}>
            {r}x
          </button>
        ))}
      </div>

      <p className="audio-hint">Space: phát/tạm dừng · ← →: lùi/tới 15 giây</p>

      <audio ref={ref} src={src} preload="metadata" />
    </div>
  );
}

interface VideoTab {
  key: string;
  label: string;
  icon?: IconName;
  videos: LectureVideo[];
}

export function VideoLibraryPage() {
  const lastWatchedId = useMemo(() => findLastWatched(LECTURE_VIDEOS), []);
  const lastWatchedVideo = LECTURE_VIDEOS.find((v) => v.id === lastWatchedId);
  const [activeVideo, setActiveVideo] = useState<LectureVideo | null>(lastWatchedVideo ?? null);

  const tabs: VideoTab[] = subjects
    .map((s) => ({ key: s.id, label: s.name, icon: s.icon, videos: LECTURE_VIDEOS.filter((v) => v.subject === s.id) }))
    .filter((t) => t.videos.length > 0);
  const ungrouped = LECTURE_VIDEOS.filter((v) => !v.subject);
  if (ungrouped.length > 0) tabs.push({ key: "khac", label: "Khác", videos: ungrouped });

  const [activeTab, setActiveTab] = useState(() => {
    const idx = tabs.findIndex((t) => t.key === lastWatchedVideo?.subject);
    return idx >= 0 ? tabs[idx].key : (tabs[0]?.key ?? "");
  });
  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0];
  // "Tiếp tục xem" tính riêng cho từng tab; video đó bỏ khỏi danh sách bên dưới để không hiện trùng.
  const resumeId = current ? findLastWatched(current.videos) : null;
  const resumeVideo = current?.videos.find((v) => v.id === resumeId);

  return (
    <div className="video-library-page">
      <h1>
        <Film size={26} strokeWidth={1.75} /> Video bài giảng
      </h1>

      {LECTURE_VIDEOS.length === 0 && (
        <p>Chưa có video nào ở đây - gửi link YouTube để bổ sung nhé.</p>
      )}

      {tabs.length > 0 && (
        <>
          <div className="tab-bar">
            {tabs.map((t) => (
              <button
                key={t.key}
                className={t.key === activeTab ? "tab active" : "tab"}
                onClick={() => setActiveTab(t.key)}
              >
                {t.icon && <SubjectIcon name={t.icon} size={15} />} {t.label}
              </button>
            ))}
          </div>
          {resumeVideo && (
            <section className="video-section">
              <h2>▶ Tiếp tục xem</h2>
              <div className="video-list">
                <button className="video-list-item" onClick={() => setActiveVideo(resumeVideo)}>
                  <Play size={14} fill="currentColor" />
                  {resumeVideo.title}
                  <span className="video-list-resume">Đang xem dở</span>
                </button>
              </div>
            </section>
          )}
          <div className="video-list">
            {current?.videos.filter((v) => v.id !== resumeId).map((v) => (
              <button key={v.id} className="video-list-item" onClick={() => setActiveVideo(v)}>
                <Play size={14} fill="currentColor" />
                {v.title}
                {readProgress()[v.id] && <span className="video-list-resume">Đang xem dở</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {activeVideo && <VideoModal video={activeVideo} onClose={() => setActiveVideo(null)} />}
    </div>
  );
}
