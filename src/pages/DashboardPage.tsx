import { subjects } from "../config/subjects";
import { SubjectCard } from "../components/SubjectCard";
import { useAuth } from "../contexts/AuthContext";

export function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Ôn thi nội trú</h1>
          <p>Xin chào, {user?.displayName || user?.email}</p>
        </div>
        <button onClick={() => logout()}>Đăng xuất</button>
      </header>

      <div className="subject-grid">
        {subjects.map((subject) => (
          <SubjectCard key={subject.id} subject={subject} />
        ))}
      </div>
    </div>
  );
}
