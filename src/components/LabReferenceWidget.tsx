import { useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useFloatingWidget } from "../contexts/FloatingWidgetContext";
import { LAB_REFERENCE } from "../data/labReference";

export function LabReferenceWidget() {
  const { user } = useAuth();
  const { activeWidget, setActiveWidget, dockVisible } = useFloatingWidget();
  const open = activeWidget === "labref";
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return LAB_REFERENCE;
    return LAB_REFERENCE.map((cat) => ({
      ...cat,
      items: cat.items.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.value.toLowerCase().includes(q) ||
          it.note?.toLowerCase().includes(q),
      ),
    })).filter((cat) => cat.items.length > 0);
  }, [query]);

  if (!user) return null;
  // Ẩn hẳn cả nút mở khi khung chat AI đang mở - tránh bị đè lên nhau ở góc
  // dưới phải (panel chat rất cao, che mất nút này nếu vẫn hiện).
  if (activeWidget === "chat") return null;

  return (
    <div className="labref-widget">
      {open && (
        <div className="labref-panel">
          <div className="chat-panel-header">
            <span>Cận lâm sàng tham chiếu</span>
            <button onClick={() => setActiveWidget(null)} aria-label="Đóng">
              ✕
            </button>
          </div>

          <input
            className="labref-search"
            type="text"
            placeholder="Tìm xét nghiệm..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />

          <div className="labref-list">
            {filtered.length === 0 && (
              <p className="chat-empty">Không tìm thấy kết quả.</p>
            )}
            {filtered.map((cat) => (
              <div key={cat.category} className="labref-category">
                <h4>{cat.category}</h4>
                <table className="labref-table">
                  <tbody>
                    {cat.items.map((it, i) => (
                      <tr key={`${it.name}-${i}`}>
                        <td className="labref-name">{it.name}</td>
                        <td>
                          <strong>{it.value}</strong>
                          {it.note && <div className="labref-note">{it.note}</div>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        className={dockVisible || open ? "labref-toggle" : "labref-toggle dock-hidden"}
        onClick={() => setActiveWidget(open ? null : "labref")}
        aria-label={open ? "Đóng cận lâm sàng tham chiếu" : "Mở cận lâm sàng tham chiếu"}
      >
        {open ? "✕" : "🧪"}
      </button>
    </div>
  );
}
