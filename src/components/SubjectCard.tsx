import { Link } from "react-router-dom";
import { SubjectIcon } from "./SubjectIcon";
import type { Subject } from "../types";

export function SubjectCard({ subject }: { subject: Subject }) {
  return (
    <Link to={`/subjects/${subject.id}`} className="subject-card">
      <span className="subject-card-icon">
        <SubjectIcon name={subject.icon} />
      </span>
      <span className="subject-card-name">{subject.name}</span>
      <span className="subject-card-desc">{subject.description}</span>
    </Link>
  );
}
