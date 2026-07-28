import { ICON_COMPONENTS, type IconName } from "../config/icons";

export function SubjectIcon({
  name,
  className,
  size = 26,
}: {
  name: IconName;
  className?: string;
  size?: number;
}) {
  const Cmp = ICON_COMPONENTS[name] ?? ICON_COMPONENTS.book;
  return <Cmp className={className} size={size} strokeWidth={1.75} aria-hidden />;
}
