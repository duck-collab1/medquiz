export type SubjectId = "noi" | "ngoai" | "san" | "nhi";

export interface Subject {
  id: SubjectId;
  name: string;
  description: string;
  icon: string;
}

export type AnswerKey = "a" | "b" | "c" | "d" | "e";

export interface Question {
  id: string;
  subject: SubjectId;
  chapter: string;
  group: string;
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
