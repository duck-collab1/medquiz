import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SubjectPage } from "./pages/SubjectPage";
import { GroupPage } from "./pages/GroupPage";
import { ChapterPage } from "./pages/ChapterPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { ChatWidget } from "./components/ChatWidget";

function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId"
          element={
            <ProtectedRoute>
              <SubjectPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/:groupSlug"
          element={
            <ProtectedRoute>
              <GroupPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subjects/:subjectId/:groupSlug/:chapterSlug"
          element={
            <ProtectedRoute>
              <ChapterPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatWidget />
    </>
  );
}

export default App;
