import type { Subject } from "../types";

export const subjects: Subject[] = [
  {
    id: "noi",
    name: "Nội",
    description: "Nội khoa",
    icon: "stethoscope",
  },
  {
    id: "ngoai",
    name: "Ngoại",
    description: "Ngoại khoa",
    icon: "scissors",
  },
  {
    id: "san",
    name: "Sản",
    description: "Sản phụ khoa",
    icon: "venus",
  },
  {
    id: "nhi",
    name: "Nhi",
    description: "Nhi khoa",
    icon: "baby",
  },
  {
    id: "sinh-ly",
    name: "Sinh lý",
    description: "Sinh lý học",
    icon: "activity",
  },
  {
    id: "test-moi",
    name: "Test mới",
    description: "Nội - Ngoại - Sản - Nhi, theo đề án ôn thi nội trú 2026 ĐHYHN",
    icon: "graduation-cap",
  },
];

export function getSubject(id: string): Subject | undefined {
  return subjects.find((s) => s.id === id);
}
