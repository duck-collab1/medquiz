import {
  Activity,
  Baby,
  Bone,
  Book,
  BookOpen,
  Droplet,
  Droplets,
  Flame,
  HeartPulse,
  Scissors,
  Siren,
  Stethoscope,
  Target,
  Utensils,
  Venus,
  Wind,
  type LucideIcon,
} from "lucide-react";

export type IconName =
  | "stethoscope"
  | "scissors"
  | "venus"
  | "baby"
  | "activity"
  | "heart-pulse"
  | "wind"
  | "utensils"
  | "flame"
  | "droplets"
  | "bone"
  | "siren"
  | "droplet"
  | "target"
  | "book-open"
  | "book";

export const ICON_COMPONENTS: Record<IconName, LucideIcon> = {
  stethoscope: Stethoscope,
  scissors: Scissors,
  venus: Venus,
  baby: Baby,
  activity: Activity,
  "heart-pulse": HeartPulse,
  wind: Wind,
  utensils: Utensils,
  flame: Flame,
  droplets: Droplets,
  bone: Bone,
  siren: Siren,
  droplet: Droplet,
  target: Target,
  "book-open": BookOpen,
  book: Book,
};
