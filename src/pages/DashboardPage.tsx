import { subjects } from "../config/subjects";
import { SubjectCard } from "../components/SubjectCard";
import { ProgressOverview } from "../components/ProgressOverview";
import { ReviewReminder } from "../components/ReviewReminder";
import { NotificationPrompt } from "../components/NotificationPrompt";
import { StudySchedule } from "../components/StudySchedule";
import { useAuth } from "../contexts/AuthContext";
import { getTodayQuote } from "../data/quotes";

export function DashboardPage() {
  const { user } = useAuth();

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

      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
