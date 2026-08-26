import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, RotateCcw } from "lucide-react";
import { subjects } from "../config/subjects";
import { SubjectCard } from "../components/SubjectCard";
import { ProgressOverview } from "../components/ProgressOverview";
import { ReviewReminder } from "../components/ReviewReminder";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { StudySchedule } from "../components/StudySchedule";
import { useAuth } from "../contexts/AuthContext";
import { getTodayQuote } from "../data/quotes";
import { getWrongAnswerCount } from "../services/progressService";

export function DashboardPage() {
  const { user } = useAuth();
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => setWrongCount(getWrongAnswerCount()), []);

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <p className="dashboard-eyebrow">Chúc bạn ôn thi thật tốt</p>
        <h1>
          Xin chào, {user?.displayName || user?.email?.split("@")[0]}
        </h1>
        <p className="dashboard-sub">Chọn một môn để bắt đầu ôn tập.</p>
        <p className="dashboard-quote">"{getTodayQuote()}"</p>
      </header>

      <ProgressOverview />
      <StudySchedule />
      <NotificationPrompt />
      <ReviewReminder />

      <div className="dashboard-quicklinks">
        <Link to="/lam-lai-cau-sai" className="dashboard-quicklink">
          <span className="dashboard-quicklink-icon">
            <RotateCcw size={22} strokeWidth={1.75} />
          </span>
          <span className="dashboard-quicklink-text">
            <h3>Làm lại câu sai</h3>
            <p>{wrongCount > 0 ? `${wrongCount} câu cần ôn lại` : "Không còn câu sai nào"}</p>
          </span>
        </Link>
        <Link to="/video-bai-giang" className="dashboard-quicklink">
          <span className="dashboard-quicklink-icon">
            <Film size={22} strokeWidth={1.75} />
          </span>
          <span className="dashboard-quicklink-text">
            <h3>Video bài giảng</h3>
            <p>Xem lại các buổi giảng</p>
          </span>
        </Link>
      </div>

      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
