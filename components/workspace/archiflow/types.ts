import type { LucideIcon } from "lucide-react";

export type ModuleView =
  | "plans"
  | "models"
  | "comparisons"
  | "site-analysis"
  | "regulation-analysis"
  | "zoning-rules"
  | "ai-floor-plan"
  | "building-mass"
  | "apartment-mix"
  | "calculations"
  | "files"
  | "reports"
  | "team"
  | "archive";

export type ArchitectPlatformView =
  | "auth"
  | "dashboard"
  | "projects"
  | "new-project"
  | "project"
  | ModuleView;

export type ModuleDefinition = {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  metrics: Array<{ label: string; value: string; tone: "blue" | "ice" | "green" | "violet" | "dark" }>;
};
