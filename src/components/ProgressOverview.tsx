import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CircleCheck, CircleX, Flame } from "lucide-react";
import { getOverallStats, getStreak, getWrongAnswerCount } from "../services/progressService";

export function ProgressOverview() {
  const [stats, setStats] = useState<{ answered: number; correct: number } | null>(null);
  const [wrongCount, setWrongCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setStats(getOverallStats());
    setWrongCount(getWrongAnswerCount());
    setStreak(getStreak().current);
    // Delay 1 khung hình để CSS transition chạy từ 0 lên giá trị thật (hiệu ứng "đổ đầy").
    const id = requestAnimationFrame(() => setAnimate(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!stats || stats.answered === 0) return null;

  const accuracy = Math.round((stats.correct / stats.answered) * 100);
  const circumference = 2 * Math.PI * 26;
  const offset = circumference * (1 - (animate ? accuracy : 0) / 100);

  return (
    <div className="progress-overview">
      <div className="progress-ring">
        <svg viewBox="0 0 60 60" width="60" height="60">
          <circle className="progress-ring-track" cx="30" cy="30" r="26" />
          <circle
            className="progress-ring-fill"
            cx="30"
            cy="30"
            r="26"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
          />
        </svg>
        <span className="progress-ring-label">{accuracy}%</span>
      </div>
      <div className="progress-overview-text">
        <p className="progress-overview-title">Tiến độ ôn tập</p>
        <p className="progress-overview-sub">
          Đã trả lời <strong>{stats.answered}</strong> câu · đúng{" "}
          <strong>{stats.correct}</strong> câu ({accuracy}%)
        </p>
        <div className="progress-overview-chips">
          <span className="progress-chip">
            <Flame size={14} strokeWidth={2} aria-hidden />
            Streak {streak} ngày
          </span>
          {wrongCount > 0 ? (
            <Link to="/lam-lai-cau-sai" className="progress-chip progress-chip-link">
              <CircleX size={14} strokeWidth={2} aria-hidden />
              {wrongCount} câu sai cần làm lại
            </Link>
          ) : (
            <span className="progress-chip">
              <CircleCheck size={14} strokeWidth={2} aria-hidden />
              Không còn câu sai nào
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
