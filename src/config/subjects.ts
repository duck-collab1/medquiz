import type { Subject } from "../types";

export const subjects: Subject[] = [
  {
    id: "noi",
    name: "Nội",
    description: "Nội khoa",
    icon: "🩺",
  },
  {
    id: "ngoai",
    name: "Ngoại",
    description: "Ngoại khoa",
    icon: "🔪",
  },
  {
    id: "san",
    name: "Sản",
    description: "Sản phụ khoa",
    icon: "🤰",
  },
  {
    id: "nhi",
    name: "Nhi",
    description: "Nhi khoa",
    icon: "🧒",
  },
];

export function getSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
