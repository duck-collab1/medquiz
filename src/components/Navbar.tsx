import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Film, RotateCcw } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getWrongAnswerCount } from "../services/progressService";

export function Navbar() {
  const { user, logout } = useAuth();
  const [wrongCount, setWrongCount] = useState(0);

  useEffect(() => {
    if (user) setWrongCount(getWrongAnswerCount());
  }, [user]);

  if (!user) return null;

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-mark">✦</span>
        <span className="navbar-brand-text">Ôn thi nội trú</span>
      </Link>
      <Link to="/lam-lai-cau-sai" className="navbar-tab">
        <RotateCcw size={15} strokeWidth={2} aria-hidden />
        Làm lại câu sai
        {wrongCount > 0 && <span className="navbar-tab-badge">{wrongCount}</span>}
      </Link>
      <Link to="/video-bai-giang" className="navbar-tab">
        <Film size={15} strokeWidth={2} aria-hidden />
        Video bài giảng
      </Link>
      <div className="navbar-user">
        <span className="navbar-greeting">
          Xin chào, {user.displayName || user.email}
        </span>
        <button className="navbar-logout" onClick={() => logout()}>
          Đăng xuất
        </button>
      </div>
    </header>
  );
}
