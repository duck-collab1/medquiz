import { doc, arrayUnion, setDoc } from "firebase/firestore";
import { db } from "../firebase";

export type PushSetupResult =
  | { status: "not-configured" }
  | { status: "unsupported" }
  | { status: "needs-install" }
  | { status: "denied" }
  | { status: "granted" };

/** true nếu app đang chạy ở chế độ đã cài ra màn hình chính (bắt buộc với Safari iOS để nhận push). */
function isStandalone(): boolean {
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export async function enablePushNotifications(uid: string): Promise<PushSetupResult> {
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!vapidKey) return { status: "not-configured" };
  if (!("serviceWorker" in navigator) || !("Notification" in window)) {
    return { status: "unsupported" };
  }
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (isIOS && !isStandalone()) return { status: "needs-install" };

  const { getMessaging, getToken, isSupported } = await import("firebase/messaging");
  if (!(await isSupported())) return { status: "unsupported" };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return { status: "denied" };

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging();
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration,
  });

  await setDoc(doc(db!, "users", uid), { pushTokens: arrayUnion(token) }, { merge: true });
  return { status: "granted" };
}
