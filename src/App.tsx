import { Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SubjectPage } from "./pages/SubjectPage";
import { GroupPage } from "./pages/GroupPage";
import { ChapterPage } from "./pages/ChapterPage";
import { WrongAnswersPage } from "./pages/WrongAnswersPage";
import { VideoLibraryPage } from "./pages/VideoLibraryPage";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { ChatWidget } from "./components/ChatWidget";
import { LabReferenceWidget } from "./components/LabReferenceWidget";
import { MusicWidget } from "./components/MusicWidget";

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
        <Route
          path="/lam-lai-cau-sai"
          element={
            <ProtectedRoute>
              <WrongAnswersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/video-bai-giang"
          element={
            <ProtectedRoute>
              <VideoLibraryPage />
            </ProtectedRoute>
          }
        />
      </Routes>
      <ChatWidget />
      <LabReferenceWidget />
      <MusicWidget />
    </>
  );
}

export default App;
