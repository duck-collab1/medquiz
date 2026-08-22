import { Link } from "react-router-dom";
import { getUpcomingPlan, getDaysUntilExam, EXAM_DATE, COMPLETED_TOPICS, type DayPlan, type ScheduleItem } from "../config/studySchedule";

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
const KIND_ICON: Record<DayPlan["kind"], string> = { weekday: "📖", review: "📝", recall: "🎤" };

function formatDate(date: Date): string {
  return `${WEEKDAY_LABELS[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
}

function Chip({ item }: { item: ScheduleItem }) {
  return item.subjectId ? (
    <Link to={`/subjects/${item.subjectId}`} className="study-chip study-chip-link">
      {item.label}
    </Link>
  ) : (
    <span className="study-chip" title="Chưa có nội dung môn này trong app">
      {item.label}
    </span>
  );
}

function planTitle(plan: DayPlan): string {
  if (plan.kind === "recall") return plan.block ? plan.block.title : "Ôn lại: " + COMPLETED_TOPICS.join(", ");
  return plan.block.title;
}

function PlanChips({ plan }: { plan: DayPlan }) {
  if (plan.kind === "recall") {
    return (
      <p className="study-schedule-desc">
        Trình bày lại & tự chất vấn (Feynman) toàn bộ nội dung tuần trước.
      </p>
    );
  }
  if (plan.kind === "review") {
    return <p className="study-schedule-desc">Ôn tập lại cả tuần + luyện đề trắc nghiệm tổng hợp.</p>;
  }
  return (
    <div className="study-chip-row">
      {plan.base.map((item) => (
        <Chip key={item.label} item={item} />
      ))}
      {plan.clinical.map((item) => (
        <Chip key={item.label} item={item} />
      ))}
    </div>
  );
}

export function StudySchedule() {
  const upcoming = getUpcomingPlan(7);
  const daysLeft = getDaysUntilExam();
  if (upcoming.length === 0) return null;
  const [today, ...rest] = upcoming;

  return (
    <div className="study-schedule">
      <div className="study-schedule-countdown">
        <span className="study-countdown-number">{Math.max(daysLeft, 0)}</span>
        <span className="study-countdown-label">
          ngày nữa đến kỳ thi
          <br />
          {EXAM_DATE.getDate()}/{EXAM_DATE.getMonth() + 1}/{EXAM_DATE.getFullYear()}
        </span>
      </div>

      <div className="study-schedule-today">
        <span className="study-schedule-eyebrow">
          {KIND_ICON[today.plan.kind]} Hôm nay
        </span>
        <h3>{planTitle(today.plan)}</h3>
        <PlanChips plan={today.plan} />
      </div>

      <ul className="study-schedule-timeline">
        {rest.map(({ date, plan }) => (
          <li key={date.toISOString()}>
            <div className="study-timeline-date">
              <span>{KIND_ICON[plan.kind]}</span>
              {formatDate(date)}
            </div>
            <div className="study-timeline-body">
              <span className="study-timeline-title">{planTitle(plan)}</span>
              <PlanChips plan={plan} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
