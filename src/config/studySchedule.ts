import type { SubjectId } from "../types";

export interface ScheduleItem {
  label: string;
  subjectId?: SubjectId;
}

// Lịch xoay vòng liên tục, không có ngày nghỉ, để ôn lại được nhiều lần nhất
// có thể trước kỳ thi. Ghép cặp theo yêu cầu: Nội-Sinh lý, Ngoại-Giải phẫu,
// Sản+Nhi-Sinh lý. "Giải phẫu" chưa có nội dung trong app nên không gắn subjectId
// (hiển thị dạng nhắc nhở, không có link).
const CYCLE: ScheduleItem[][] = [
  [{ label: "Nội", subjectId: "noi" }, { label: "Sinh lý", subjectId: "sinh-ly" }],
  [{ label: "Ngoại", subjectId: "ngoai" }, { label: "Giải phẫu" }],
  [
    { label: "Sản", subjectId: "san" },
    { label: "Nhi", subjectId: "nhi" },
    { label: "Sinh lý", subjectId: "sinh-ly" },
  ],
];

const EPOCH = new Date(2026, 0, 1);
const END_DATE = new Date(2027, 7, 31);

function dayIndex(date: Date): number {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  return Math.floor((d.getTime() - EPOCH.getTime()) / 86400000);
}

/** Lịch học của 1 ngày cụ thể, hoặc null nếu đã qua mốc ôn thi (31/8/2027). */
export function getStudyPlanForDate(date: Date): ScheduleItem[] | null {
  if (date > END_DATE) return null;
  const idx = dayIndex(date);
  return CYCLE[((idx % CYCLE.length) + CYCLE.length) % CYCLE.length];
}

/** Lịch học của N ngày sắp tới, bắt đầu từ hôm nay. */
export function getUpcomingStudyPlan(days: number, from = new Date()): { date: Date; items: ScheduleItem[] }[] {
  const result: { date: Date; items: ScheduleItem[] }[] = [];
  for (let i = 0; i < days; i++) {
    const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i);
    const items = getStudyPlanForDate(date);
    if (!items) break;
    result.push({ date, items });
  }
  return result;
}
