import type { IconName } from "../config/icons";

export type SubjectId = "noi" | "ngoai" | "san" | "nhi" | "sinh-ly";

export interface Subject {
  id: SubjectId;
  name: string;
  description: string;
  icon: IconName;
}

export type AnswerKey = "a" | "b" | "c" | "d" | "e" | "f";

export interface Question {
  id: string;
  subject: SubjectId;
  chapter: string;
  group: string;
  /** Đề bài lâm sàng dùng chung cho một cụm câu hỏi ca bệnh (nếu có). */
  caseStem?: string;
  /** URL ảnh minh hoạ (đồ thị, sơ đồ) cần xem để trả lời câu hỏi, nếu có. */
  image?: string;
  question: string;
  options: Record<AnswerKey, string>;
  correctAnswer: AnswerKey | "";
  explanation: string;
  needsReview: boolean;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
}
