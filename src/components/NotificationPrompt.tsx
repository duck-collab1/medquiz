import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { enablePushNotifications, type PushSetupResult } from "../services/pushService";

const MESSAGES: Record<PushSetupResult["status"], string> = {
  "not-configured": "",
  unsupported: "Trình duyệt này chưa hỗ trợ thông báo đẩy.",
  "needs-install": "Hãy thêm app ra Màn hình chính (nút Chia sẻ → Thêm vào MH chính), rồi mở lại từ biểu tượng đó để bật thông báo.",
  denied: "Bạn đã từ chối quyền thông báo. Vào Cài đặt > Thông báo để bật lại.",
  granted: "Đã bật thông báo cho thiết bị này!",
};

export function NotificationPrompt() {
  const { user } = useAuth();
  const [result, setResult] = useState<PushSetupResult | null>(null);
  const [loading, setLoading] = useState(false);

  if (!import.meta.env.VITE_FIREBASE_VAPID_KEY || !user) return null;
  if (result?.status === "granted") return null;

  async function handleEnable() {
    setLoading(true);
    try {
      setResult(await enablePushNotifications(user!.uid));
    } catch {
      setResult({ status: "unsupported" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="notification-prompt">
      <button onClick={handleEnable} disabled={loading}>
        🔔 {loading ? "Đang bật..." : "Bật thông báo nhắc học"}
      </button>
      {result && MESSAGES[result.status] && (
        <p className="notification-prompt-msg">{MESSAGES[result.status]}</p>
      )}
    </div>
  );
}
