import { useEffect, useState } from "react";
import { fetchQuestions, splitByReviewStatus } from "../services/questionsService";
import type { AnswerKey, Question, SubjectId } from "../types";
import { QuizResult } from "./QuizResult";
import { useChatContext } from "../contexts/ChatContext";
import { buildExplainPrompt } from "../utils/quizPrompt";

interface QuizRunnerProps {
  subject: SubjectId;
  /** Lọc theo chương (group). Bỏ trống = lấy tất cả chương của môn. */
  group?: string;
  /** Lọc theo bài (chapter). Bỏ trống = lấy tất cả bài trong group đã chọn (hoặc cả môn). */
  chapter?: string;
}

const ANSWER_KEYS: AnswerKey[] = ["a", "b", "c", "d", "e"];

export function QuizRunner({ subject, group, chapter }: QuizRunnerProps) {
  const { askAboutQuestion } = useChatContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<Question[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [selected, setSelected] = useState<AnswerKey | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchQuestions(subject)
      .then((questions) => {
        if (cancelled) return;
        const scoped = questions.filter(
          (q) =>
            (!group || (q.group || "Khác") === group) &&
            (!chapter || q.chapter === chapter),
        );
        const { ready, needsReview } = splitByReviewStatus(scoped);
        setReady(ready);
        setNeedsReviewCount(needsReview.length);
        resetSession();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject, group, chapter]);

  function resetSession() {
    setCurrentIndex(0);
    setAnswers({});
    setSelected(null);
    setShowFeedback(false);
    setFinished(false);
  }

  function handleCheck() {
    if (!selected) return;
    const current = ready[currentIndex];
    setAnswers((prev) => ({ ...prev, [current.id]: selected }));
    setShowFeedback(true);
  }

  function handleNext() {
    setSelected(null);
    setShowFeedback(false);
    if (currentIndex + 1 >= ready.length) {
      setFinished(true);
    } else {
      setCurrentIndex((i) => i + 1);
    }
  }

  if (loading) return <p>Đang tải câu hỏi...</p>;
  if (error) return <p className="form-error">{error}</p>;

  if (ready.length === 0) {
    return (
      <div>
        <p>Chưa có câu hỏi nào sẵn sàng cho môn này.</p>
        {needsReviewCount > 0 && (
          <p>
            Có {needsReviewCount} câu đang chờ bổ sung đáp án, chưa dùng để
            luyện tập được.
          </p>
        )}
      </div>
    );
  }

  if (finished) {
    return (
      <QuizResult questions={ready} answers={answers} onRestart={resetSession} />
    );
  }

  const current = ready[currentIndex];

  return (
    <div className="quiz-runner">
      <p className="quiz-progress">
        Câu {currentIndex + 1}/{ready.length}
        {needsReviewCount > 0 &&
          ` · ${needsReviewCount} câu chưa có đáp án (đã ẩn)`}
      </p>
      {current.chapter && <p className="quiz-chapter">{current.chapter}</p>}
      <p className="quiz-question">{current.question}</p>

      <div className="quiz-options">
        {ANSWER_KEYS.filter((key) => current.options[key]).map((key) => {
          const isSelected = selected === key;
          const isCorrect = key === current.correctAnswer;
          let className = "quiz-option";
          if (showFeedback) {
            if (isCorrect) className += " correct";
            else if (isSelected) className += " wrong";
          } else if (isSelected) {
            className += " selected";
          }
          return (
            <button
              key={key}
              className={className}
              disabled={showFeedback}
              onClick={() => setSelected(key)}
            >
              <strong>{key.toUpperCase()}.</strong> {current.options[key]}
            </button>
          );
        })}
      </div>

      {showFeedback && current.explanation && (
        <p className="quiz-explanation">{current.explanation}</p>
      )}

      {showFeedback && (
        <button
          className="quiz-ask-ai"
          onClick={() =>
            askAboutQuestion(buildExplainPrompt(current, selected ?? undefined))
          }
        >
          🤖 Hỏi AI giải thích câu này
        </button>
      )}

      {!showFeedback ? (
        <button
          className="quiz-action"
          disabled={!selected}
          onClick={handleCheck}
        >
          Kiểm tra
        </button>
      ) : (
        <button className="quiz-action" onClick={handleNext}>
          {currentIndex + 1 >= ready.length ? "Xem kết quả" : "Câu tiếp theo"}
        </button>
      )}
    </div>
  );
}
