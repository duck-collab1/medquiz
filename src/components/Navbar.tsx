import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Navbar() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <header className="navbar">
      <Link to="/" className="navbar-brand">
        <span className="navbar-brand-mark">✦</span>
        <span className="navbar-brand-text">Ôn thi nội trú</span>
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
