import type { AnswerKey, Question } from "../types";
import { useChatContext } from "../contexts/ChatContext";
import { buildExplainPrompt } from "../utils/quizPrompt";

interface QuizResultProps {
  questions: Question[];
  answers: Record<string, AnswerKey>;
  onRestart: () => void;
}

export function QuizResult({ questions, answers, onRestart }: QuizResultProps) {
  const { askAboutQuestion } = useChatContext();
  const total = questions.length;
  const correct = questions.filter(
    (q) => answers[q.id] === q.correctAnswer,
  ).length;
  const wrong = questions.filter(
    (q) => answers[q.id] && answers[q.id] !== q.correctAnswer,
  );

  return (
    <div className="quiz-result">
      <h2>
        Kết quả: {correct}/{total} câu đúng
      </h2>
      <button onClick={onRestart}>Làm lại</button>

      {wrong.length > 0 && (
        <div className="quiz-review">
          <h3>Xem lại các câu sai</h3>
          {wrong.map((q) => (
            <div key={q.id} className="quiz-review-item">
              <p className="quiz-review-question">{q.question}</p>
              <p className="quiz-review-answer wrong">
                Bạn chọn: {answers[q.id].toUpperCase()} —{" "}
                {q.options[answers[q.id]]}
              </p>
              <p className="quiz-review-answer correct">
                Đáp án đúng: {q.correctAnswer.toUpperCase()} —{" "}
                {q.correctAnswer ? q.options[q.correctAnswer] : ""}
              </p>
              {q.explanation && (
                <p className="quiz-review-explanation">{q.explanation}</p>
              )}
              <button
                className="quiz-ask-ai"
                onClick={() => askAboutQuestion(buildExplainPrompt(q, answers[q.id]))}
              >
                🤖 Hỏi AI giải thích câu này
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
