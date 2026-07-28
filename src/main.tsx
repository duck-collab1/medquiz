import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./contexts/AuthContext";
import { ChatProvider } from "./contexts/ChatContext";
import { isFirebaseConfigured } from "./firebase";
import { FirebaseSetupNotice } from "./components/FirebaseSetupNotice";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isFirebaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <ChatProvider>
            <App />
          </ChatProvider>
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <FirebaseSetupNotice />
    )}
  </StrictMode>,
);
