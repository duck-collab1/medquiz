import { useEffect, useMemo, useRef, useState } from "react";
import { Film, Play } from "lucide-react";
import { LECTURE_VIDEOS, type LectureVideo } from "../data/videos";
import { subjects } from "../config/subjects";
import { SubjectIcon } from "../components/SubjectIcon";
import type { IconName } from "../config/icons";
import { loadYouTubeApi, type YTPlayer } from "../utils/youtube";

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

function VideoCard({
  video,
  open,
  onToggle,
}: {
  video: LectureVideo;
  open: boolean;
  onToggle: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);

  // Mở video là tự phát tiếp đúng chỗ đã dừng lần trước (lưu theo giây, cập
  // nhật định kỳ + khi đóng) - dùng YouTube IFrame Player API thật (seekTo/
  // getCurrentTime) thay vì iframe thô vì iframe thô không đọc/điều khiển
  // được tiến trình phát.
  useEffect(() => {
    if (!open || !containerRef.current) return;
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
        videoId: video.youtubeId,
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
  }, [open, video.id, video.youtubeId]);

  const hasProgress = Boolean(readProgress()[video.id]);

  return (
    <div className="video-card">
      {open ? (
        <div ref={containerRef} className="video-card-frame" />
      ) : (
        <button className="video-card-thumb" onClick={onToggle} aria-label={`Phát ${video.title}`}>
          <img src={`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`} alt="" />
          <span className="video-card-play">
            <Play size={22} fill="currentColor" />
          </span>
          {hasProgress && <span className="video-card-resume-badge">Đang xem dở</span>}
        </button>
      )}
      <p className="video-card-title">{video.title}</p>
      {video.description && <p className="video-card-desc">{video.description}</p>}
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
  const [openId, setOpenId] = useState<string | null>(lastWatchedId);

  function toggle(id: string) {
    setOpenId((cur) => (cur === id ? null : id));
  }

  const lastWatchedVideo = LECTURE_VIDEOS.find((v) => v.id === lastWatchedId);
  // Bỏ video đang xem dở ra khỏi danh sách theo tab bên dưới - tránh hiện (và
  // mở player) trùng 2 lần cùng lúc (1 lần ở "Tiếp tục xem", 1 lần ở tab môn).
  const rest = LECTURE_VIDEOS.filter((v) => v.id !== lastWatchedId);
  const tabs: VideoTab[] = subjects
    .map((s) => ({ key: s.id, label: s.name, icon: s.icon, videos: rest.filter((v) => v.subject === s.id) }))
    .filter((t) => t.videos.length > 0);
  const ungrouped = rest.filter((v) => !v.subject);
  if (ungrouped.length > 0) tabs.push({ key: "khac", label: "Khác", videos: ungrouped });

  const [activeTab, setActiveTab] = useState(() => {
    const idx = tabs.findIndex((t) => t.key === lastWatchedVideo?.subject);
    return idx >= 0 ? tabs[idx].key : (tabs[0]?.key ?? "");
  });
  const current = tabs.find((t) => t.key === activeTab) ?? tabs[0];

  return (
    <div className="video-library-page">
      <h1>
        <Film size={26} strokeWidth={1.75} /> Video bài giảng
      </h1>

      {LECTURE_VIDEOS.length === 0 && (
        <p>Chưa có video nào ở đây - gửi link YouTube để bổ sung nhé.</p>
      )}

      {lastWatchedVideo && (
        <section className="video-section">
          <h2>▶ Tiếp tục xem</h2>
          <div className="video-grid">
            <VideoCard
              video={lastWatchedVideo}
              open={openId === lastWatchedVideo.id}
              onToggle={() => toggle(lastWatchedVideo.id)}
            />
          </div>
        </section>
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
          <div className="video-grid video-grid-tab">
            {current?.videos.map((v) => (
              <VideoCard key={v.id} video={v} open={openId === v.id} onToggle={() => toggle(v.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
