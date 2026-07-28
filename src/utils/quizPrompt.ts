import type { AnswerKey, Question } from "../types";

const ANSWER_KEYS: AnswerKey[] = ["a", "b", "c", "d", "e"];

export function buildExplainPrompt(
  question: Question,
  selectedKey?: AnswerKey,
): string {
  const optionsText = ANSWER_KEYS.filter((key) => question.options[key])
    .map((key) => `${key.toUpperCase()}. ${question.options[key]}`)
    .join("\n");

  const correctText = question.correctAnswer
    ? `${question.correctAnswer.toUpperCase()}. ${question.options[question.correctAnswer]}`
    : "(chưa có đáp án)";

  const lines = [
    `Hãy giải thích chi tiết đáp án cho câu trắc nghiệm sau (môn ${question.subject}${
      question.chapter ? `, chuyên đề: ${question.chapter}` : ""
    }):`,
    "",
    `Câu hỏi: ${question.question}`,
    optionsText,
    "",
    `Đáp án đúng: ${correctText}`,
  ];

  if (selectedKey && selectedKey !== question.correctAnswer) {
    lines.push(
      `Tôi đã chọn: ${selectedKey.toUpperCase()}. ${question.options[selectedKey]}`,
    );
  }

  if (question.explanation) {
    lines.push(`Giải thích có sẵn: ${question.explanation}`);
  }

  lines.push(
    "",
    "Hãy giải thích vì sao đáp án đúng là đúng, và vì sao các đáp án còn lại sai.",
  );

  return lines.filter((line) => line !== undefined).join("\n");
}
