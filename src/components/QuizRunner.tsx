import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { fetchQuestions, splitByReviewStatus } from "../services/questionsService";
import {
  clearSession,
  loadSession,
  recordAnswer,
  recordChapterCompletion,
  saveSession,
  trackWrongAnswer,
} from "../services/progressService";
import type { AnswerKey, Question, SubjectId } from "../types";
import { QuizResult } from "./QuizResult";
import { useChatContext } from "../contexts/ChatContext";
import { buildExplainPrompt } from "../utils/quizPrompt";
import { useTextHighlighter } from "../hooks/useTextHighlighter";

interface QuizRunnerProps {
  /** Bỏ trống khi dùng cùng `questions` (câu hỏi có thể thuộc nhiều môn khác nhau, vd. tab làm lại câu sai). */
  subject?: SubjectId;
  /** Lọc theo chương (group). Bỏ trống = lấy tất cả chương của môn. */
  group?: string;
  /** Lọc theo bài (chapter). Bỏ trống = lấy tất cả bài trong group đã chọn (hoặc cả môn). */
  chapter?: string;
  /** true = chỉ lấy câu hỏi ca lâm sàng (có case_stem); false/bỏ trống = chỉ lấy câu hỏi thường. */
  onlyCase?: boolean;
  /**
   * Khi truyền vào: dùng đúng danh sách câu hỏi này thay vì tự tải theo
   * subject/group/chapter (vd. tab "làm lại câu sai"). Ở chế độ này không
   * lưu/khôi phục tiến trình dở dang và không tính hoàn thành chương.
   */
  questions?: Question[];
}

const ANSWER_KEYS: AnswerKey[] = ["a", "b", "c", "d", "e", "f"];

export function QuizRunner({ subject, group, chapter, onlyCase, questions: externalQuestions }: QuizRunnerProps) {
  const { askAboutQuestion, sending: aiSending } = useChatContext();
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
    if (externalQuestions) {
      const { ready, needsReview } = splitByReviewStatus(externalQuestions);
      setReady(ready);
      setNeedsReviewCount(needsReview.length);
      setAnswers({});
      goTo(0, ready, {});
      setFinished(false);
      setError("");
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError("");
    fetchQuestions(subject as SubjectId, group)
      .then((fetched) => {
        if (cancelled) return;
        const scoped = fetched.filter(
          (q) =>
            (!chapter || q.chapter === chapter) &&
            (onlyCase ? Boolean(q.caseStem) : !q.caseStem),
        );
        const { ready, needsReview } = splitByReviewStatus(scoped);
        setReady(ready);
        setNeedsReviewCount(needsReview.length);

        const saved = loadSession(subject as SubjectId, ready.map((q) => q.id), group, chapter, onlyCase);
        if (saved) {
          setAnswers(saved.answers);
          goTo(saved.currentIndex, ready, saved.answers);
        } else {
          setAnswers({});
          goTo(0, ready, {});
        }
        setFinished(false);
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
  }, [subject, group, chapter, onlyCase, externalQuestions]);

  function goTo(index: number, list: Question[], answerMap: Record<string, AnswerKey>) {
    const target = list[index];
    const savedAnswer = target ? answerMap[target.id] : undefined;
    setCurrentIndex(index);
    setSelected(savedAnswer ?? null);
    setShowFeedback(Boolean(savedAnswer));
  }

  function resetSession() {
    if (!externalQuestions) clearSession(subject as SubjectId, group, chapter, onlyCase);
    setAnswers({});
    goTo(0, ready, {});
    setFinished(false);
  }

  function handleSelect(key: AnswerKey) {
    if (showFeedback) return;
    const current = ready[currentIndex];
    const isCorrect = key === current.correctAnswer;
    const nextAnswers = { ...answers, [current.id]: key };
    setSelected(key);
    setAnswers(nextAnswers);
    setShowFeedback(true);
    recordAnswer(current.subject, isCorrect);
    trackWrongAnswer(current.id, current.subject, current.group, current.chapter, isCorrect);
    if (!externalQuestions) {
      saveSession(
        subject as SubjectId,
        { currentIndex, answers: nextAnswers, questionIds: ready.map((q) => q.id) },
        group,
        chapter,
        onlyCase,
      );
    }
  }

  function handleNext() {
    if (currentIndex + 1 >= ready.length) {
      if (!externalQuestions) {
        clearSession(subject as SubjectId, group, chapter, onlyCase);
        recordChapterCompletion(subject as SubjectId, group, chapter);
      }
      setFinished(true);
      return;
    }
    const nextIndex = currentIndex + 1;
    goTo(nextIndex, ready, answers);
    if (!externalQuestions) {
      saveSession(
        subject as SubjectId,
        { currentIndex: nextIndex, answers, questionIds: ready.map((q) => q.id) },
        group,
        chapter,
        onlyCase,
      );
    }
  }

  function handlePrev() {
    if (currentIndex === 0) return;
    const prevIndex = currentIndex - 1;
    goTo(prevIndex, ready, answers);
    if (!externalQuestions) {
      saveSession(
        subject as SubjectId,
        { currentIndex: prevIndex, answers, questionIds: ready.map((q) => q.id) },
        group,
        chapter,
        onlyCase,
      );
    }
  }

  // Phím tắt: 1-6 chọn đáp án theo thứ tự hiển thị, Enter/Space/→ sang câu
  // tiếp theo, ← quay lại câu trước.
  useEffect(() => {
    if (loading || error || finished || ready.length === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ") {
        if (showFeedback) {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        if (currentIndex > 0) {
          e.preventDefault();
          handlePrev();
        }
        return;
      }
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= ANSWER_KEYS.length) {
        const current = ready[currentIndex];
        if (!current) return;
        const visibleKeys = ANSWER_KEYS.filter((k) => current.options[k]);
        const target = visibleKeys[digit - 1];
        if (!target || showFeedback) return;
        e.preventDefault();
        handleSelect(target);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, finished, ready, currentIndex, showFeedback, answers]);

  const highlightRef = useTextHighlighter(
    !loading && !error && !finished && ready[currentIndex] ? `question:${ready[currentIndex].id}` : null,
  );

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
      <div ref={highlightRef}>
        {current.caseStem && (
          <div className="quiz-case-stem">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{current.caseStem}</ReactMarkdown>
          </div>
        )}
        <p className="quiz-question">{current.question}</p>
      </div>
      {current.image && (
        <img className="quiz-image" src={current.image} alt="" />
      )}

      <div className="quiz-options">
        {ANSWER_KEYS.filter((key) => current.options[key]).map((key, i) => {
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
              onClick={() => handleSelect(key)}
            >
              <strong>{i + 1}.</strong> {current.options[key]}
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
          disabled={aiSending}
          onClick={() =>
            askAboutQuestion(buildExplainPrompt(current, selected ?? undefined))
          }
        >
          {aiSending ? "Đang hỏi AI..." : "🤖 Hỏi AI giải thích câu này"}
        </button>
      )}

      <div className="quiz-nav">
        <button
          className="quiz-action quiz-action-secondary"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← Câu trước
        </button>
        {showFeedback && (
          <button className="quiz-action" onClick={handleNext}>
            {currentIndex + 1 >= ready.length ? "Xem kết quả" : "Câu tiếp theo"}
          </button>
        )}
      </div>
    </div>
  );
}
