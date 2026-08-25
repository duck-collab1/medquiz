// Dùng chung giữa MusicWidget (nhạc nền) và VideoLibraryPage (video bài
// giảng) - cả 2 đều cần YouTube IFrame Player API thật (không phải iframe
// thô) để điều khiển được (âm lượng, lưu tiến trình xem...).

export interface YTPlayer {
  setVolume(volume: number): void;
  mute(): void;
  unMute(): void;
  destroy(): void;
  loadVideoById(videoId: string): void;
  seekTo(seconds: number, allowSeekAhead?: boolean): void;
  getCurrentTime(): number;
}

export interface YTPlayerEvent {
  data: number;
  target: YTPlayer;
}

export const YT_STATE_ENDED = 0;

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

// Tải script IFrame Player API chính thức của YouTube 1 lần duy nhất (dùng
// API thật thay vì tự dò DOM bên trong iframe - vốn bị chặn bởi
// Same-Origin Policy của trình duyệt, không thể can thiệp được).
let apiLoadPromise: Promise<void> | null = null;
export function loadYouTubeApi(): Promise<void> {
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
