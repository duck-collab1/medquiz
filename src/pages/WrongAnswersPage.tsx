import { useEffect, useState } from "react";
import { QuizRunner } from "../components/QuizRunner";
import { fetchQuestions } from "../services/questionsService";
import { getWrongAnswers } from "../services/progressService";
import type { Question, SubjectId } from "../types";

export function WrongAnswersPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);

  useEffect(() => {
    let cancelled = false;
    const wrongMap = getWrongAnswers();
    const ids = Object.keys(wrongMap);
    if (ids.length === 0) {
      setLoading(false);
      return;
    }
    const subjects = [...new Set(Object.values(wrongMap).map((w) => w.subject))] as SubjectId[];
    Promise.all(subjects.map((s) => fetchQuestions(s)))
      .then((bySubject) => {
        if (cancelled) return;
        const idSet = new Set(ids);
        setQuestions(bySubject.flat().filter((q) => idSet.has(q.id)));
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) setError("Không tải được câu hỏi. Thử lại sau.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="wrong-answers-page">
      <h1>🔁 Làm lại câu sai</h1>
      {loading && <p>Đang tải...</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && !error && questions.length === 0 && (
        <p>Bạn chưa có câu nào cần làm lại - trả lời sai câu nào, câu đó sẽ xuất hiện ở đây.</p>
      )}
      {!loading && !error && questions.length > 0 && (
        <QuizRunner questions={questions} />
      )}
    </div>
  );
}
