import { subjects } from "../config/subjects";
import { SubjectCard } from "../components/SubjectCard";
import { useAuth } from "../contexts/AuthContext";

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
      </header>

      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
