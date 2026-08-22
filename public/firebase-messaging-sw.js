importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.16.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBW-r3KrqkYcLODAahxZNVCyn3cKPWbRgk",
  authDomain: "onthinoitru-d1a99.firebaseapp.com",
  projectId: "onthinoitru-d1a99",
  storageBucket: "onthinoitru-d1a99.firebasestorage.app",
  messagingSenderId: "315099962721",
  appId: "1:315099962721:web:ea6fdd9e1ee0063e49f920",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || "Ôn thi nội trú";
  const body = payload.notification?.body || "";
  self.registration.showNotification(title, {
    body,
    icon: "/apple-touch-icon.png",
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});
