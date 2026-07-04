import type { FloorPlan, ValidationIssue } from "@/lib/floor-plan/types";

export type EditorMode = "empty" | "ready" | "generating" | "editing" | "exporting" | "error";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
};

export type EditorState = {
  mode: EditorMode;
  projectId: string;
  projectName: string | null;
  plan: FloorPlan | null;
  messages: ChatMessage[];
  selectedRoomId: string | null;
  validationIssues: ValidationIssue[];
  warnings: string[];
  projectPrompt: string | null;
  aiSummary: string | null;
  fallbackReason: string | null;
  mockMode: boolean;
};
