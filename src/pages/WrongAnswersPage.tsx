import { useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
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
        const all = bySubject.flat();
        // Sai 1 câu trong case lâm sàng nhiều câu thì bắt làm lại cả case,
        // không chỉ riêng câu đã sai - nên gom thêm mọi câu cùng case_stem
        // (cùng môn, để tránh case_stem trùng giữa 2 môn khác nhau).
        const wrongCaseStems = new Set(
          all.filter((q) => idSet.has(q.id) && q.caseStem).map((q) => `${q.subject}:${q.caseStem}`),
        );
        setQuestions(
          all.filter((q) => idSet.has(q.id) || (q.caseStem && wrongCaseStems.has(`${q.subject}:${q.caseStem}`))),
        );
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
      <h1>
        <RotateCcw size={22} strokeWidth={2} aria-hidden /> Làm lại câu sai
      </h1>
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
