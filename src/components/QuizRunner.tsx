import { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  fetchQuestions,
  groupByCaseStem,
  sortByOriginalOrder,
  splitByReviewStatus,
} from "../services/questionsService";
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
  /** true = lấy tất cả câu hỏi theo đúng thứ tự gốc của đề, không lọc theo case_stem (dùng cho các bộ đề test dạng "Bài kiểm tra" trộn lẫn câu thường và case lâm sàng). */
  showAll?: boolean;
  /**
   * Khi truyền vào: dùng đúng danh sách câu hỏi này thay vì tự tải theo
   * subject/group/chapter (vd. tab "làm lại câu sai"). Ở chế độ này không
   * lưu/khôi phục tiến trình dở dang và không tính hoàn thành chương.
   */
  questions?: Question[];
}

const ANSWER_KEYS: AnswerKey[] = ["a", "b", "c", "d", "e", "f"];

export function QuizRunner({
  subject,
  group,
  chapter,
  onlyCase,
  showAll,
  questions: externalQuestions,
}: QuizRunnerProps) {
  const { askAboutQuestion, sending: aiSending } = useChatContext();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [ready, setReady] = useState<Question[]>([]);
  const [needsReviewCount, setNeedsReviewCount] = useState(0);
  const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    if (externalQuestions) {
      const { ready, needsReview } = splitByReviewStatus(externalQuestions);
      setReady(sortByOriginalOrder(ready));
      setNeedsReviewCount(needsReview.length);
      setAnswers({});
      setCurrentGroupIndex(0);
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
            (showAll || (onlyCase ? Boolean(q.caseStem) : !q.caseStem)),
        );
        const { ready, needsReview } = splitByReviewStatus(scoped);
        const sorted = sortByOriginalOrder(ready);
        setReady(sorted);
        setNeedsReviewCount(needsReview.length);

        const saved = loadSession(subject as SubjectId, sorted.map((q) => q.id), group, chapter, onlyCase);
        if (saved) {
          setAnswers(saved.answers);
          setCurrentGroupIndex(saved.currentIndex);
        } else {
          setAnswers({});
          setCurrentGroupIndex(0);
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
  }, [subject, group, chapter, onlyCase, showAll, externalQuestions]);

  // Gom các câu cùng chung 1 case lâm sàng thành 1 nhóm để hiển thị chung 1
  // trang - điều hướng theo nhóm (không phải theo từng câu) từ đây trở đi.
  const groups = useMemo(() => groupByCaseStem(ready), [ready]);

  // Cuộn lên đầu trang mỗi khi sang câu/case khác - nếu không, trang đứng
  // yên ở vị trí cũ (thường gần cuối, chỗ vừa bấm nút) và phải tự cuộn lên
  // để đọc câu/case mới.
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentGroupIndex]);

  function resetSession() {
    if (!externalQuestions) clearSession(subject as SubjectId, group, chapter, onlyCase);
    setAnswers({});
    setCurrentGroupIndex(0);
    setFinished(false);
  }

  // Lưu tiến trình mỗi khi answers/vị trí đổi - tách thành effect thay vì gọi
  // rải rác ở từng nơi mutate, để luôn dùng đúng answers mới nhất (nhiều câu
  // cùng 1 trang có thể được trả lời liên tiếp rất nhanh, gọi saveSession
  // ngay trong handler dễ bị lệch do React batch nhiều lần setState lại).
  useEffect(() => {
    if (externalQuestions || ready.length === 0) return;
    saveSession(
      subject as SubjectId,
      { currentIndex: currentGroupIndex, answers, questionIds: ready.map((q) => q.id) },
      group,
      chapter,
      onlyCase,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, currentGroupIndex]);

  function handleSelect(question: Question, key: AnswerKey) {
    if (answers[question.id] !== undefined) return;
    const isCorrect = key === question.correctAnswer;
    setAnswers((prev) => (prev[question.id] !== undefined ? prev : { ...prev, [question.id]: key }));
    recordAnswer(question.subject, isCorrect);
    trackWrongAnswer(question.id, question.subject, question.group, question.chapter, isCorrect);
  }

  function handleNext() {
    if (currentGroupIndex + 1 >= groups.length) {
      if (!externalQuestions) {
        clearSession(subject as SubjectId, group, chapter, onlyCase);
        recordChapterCompletion(subject as SubjectId, group, chapter);
      }
      setFinished(true);
      return;
    }
    setCurrentGroupIndex((i) => i + 1);
  }

  function handlePrev() {
    setCurrentGroupIndex((i) => Math.max(0, i - 1));
  }

  const currentGroup = groups[currentGroupIndex] ?? [];
  const allAnswered = currentGroup.length > 0 && currentGroup.every((q) => answers[q.id] !== undefined);

  // Phím tắt: 1-6 chọn đáp án (chỉ khi trang hiện tại có đúng 1 câu hỏi -
  // nhiều câu cùng trang thì bấm trực tiếp), Enter/Space/→ sang trang tiếp
  // theo (khi đã trả lời hết câu trong trang), ← quay lại trang trước.
  useEffect(() => {
    if (loading || error || finished || groups.length === 0) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Enter" || e.key === "ArrowRight" || e.key === " ") {
        if (allAnswered) {
          e.preventDefault();
          handleNext();
        }
        return;
      }
      if (e.key === "ArrowLeft") {
        if (currentGroupIndex > 0) {
          e.preventDefault();
          handlePrev();
        }
        return;
      }
      if (currentGroup.length !== 1) return;
      const only = currentGroup[0];
      if (answers[only.id] !== undefined) return;
      const digit = Number(e.key);
      if (Number.isInteger(digit) && digit >= 1 && digit <= ANSWER_KEYS.length) {
        const visibleKeys = ANSWER_KEYS.filter((k) => only.options[k]);
        const target = visibleKeys[digit - 1];
        if (!target) return;
        e.preventDefault();
        handleSelect(only, target);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, error, finished, groups, currentGroupIndex, answers, allAnswered]);

  const highlightRef = useTextHighlighter(
    !loading && !error && !finished && currentGroup[0] ? `question:${currentGroup[0].id}` : null,
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

  const flatStart = groups.slice(0, currentGroupIndex).reduce((sum, g) => sum + g.length, 0);
  const isCaseGroup = currentGroup.length > 1;

  return (
    <div className="quiz-runner">
      <p className="quiz-progress">
        {isCaseGroup
          ? `Case lâm sàng ${currentGroupIndex + 1}/${groups.length} · câu ${flatStart + 1}-${flatStart + currentGroup.length}/${ready.length}`
          : `Câu ${flatStart + 1}/${ready.length}`}
        {needsReviewCount > 0 &&
          ` · ${needsReviewCount} câu chưa có đáp án (đã ẩn)`}
      </p>
      {currentGroup[0]?.chapter && <p className="quiz-chapter">{currentGroup[0].chapter}</p>}

      <div ref={highlightRef}>
        {currentGroup[0]?.caseStem && (
          <div className="quiz-case-stem">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{currentGroup[0].caseStem}</ReactMarkdown>
          </div>
        )}

        {currentGroup.map((q) => {
          const selected = answers[q.id];
          const showFeedback = selected !== undefined;
          return (
            <div key={q.id} className="quiz-case-question">
              <p className="quiz-question">{q.question}</p>
              {q.image && <img className="quiz-image" src={q.image} alt="" />}

              <div className="quiz-options">
                {ANSWER_KEYS.filter((key) => q.options[key]).map((key, i) => {
                  const isSelected = selected === key;
                  const isCorrect = key === q.correctAnswer;
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
                      onClick={() => handleSelect(q, key)}
                    >
                      <strong>{i + 1}.</strong> {q.options[key]}
                    </button>
                  );
                })}
              </div>

              {showFeedback && q.explanation && (
                <p className="quiz-explanation">{q.explanation}</p>
              )}

              {showFeedback && (
                <button
                  className="quiz-ask-ai"
                  disabled={aiSending}
                  onClick={() => askAboutQuestion(buildExplainPrompt(q, selected ?? undefined))}
                >
                  {aiSending ? "Đang hỏi AI..." : "🤖 Hỏi AI giải thích câu này"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="quiz-nav">
        <button
          className="quiz-action quiz-action-secondary"
          onClick={handlePrev}
          disabled={currentGroupIndex === 0}
        >
          ← {isCaseGroup ? "Case trước" : "Câu trước"}
        </button>
        {allAnswered && (
          <button className="quiz-action" onClick={handleNext}>
            {currentGroupIndex + 1 >= groups.length
              ? "Xem kết quả"
              : isCaseGroup
                ? "Case tiếp theo"
                : "Câu tiếp theo"}
          </button>
        )}
      </div>
    </div>
  );
}
