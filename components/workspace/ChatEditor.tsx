"use client";

import { FormEvent, useMemo, useState } from "react";
import { AlertTriangle, Bot, Send, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { Toast } from "@/components/ui/Toast";
import type { ChatMessage } from "@/lib/editor/types";
import type { StoredGeneratedProject } from "@/lib/projects/generated-plan-storage";
import { editGeneratedProjectWithMessage } from "@/lib/projects/edit-project-client";
import type { EditQualityDeltaReport } from "@/lib/planning";
import { formatSignedScoreDelta } from "@/lib/planning";

type ChatEditorProps = {
  projectPrompt?: string | null;
  aiSummary?: string | null;
  fallbackReason?: string | null;
  project?: StoredGeneratedProject | null;
};

const quickEdits = [
  "Make the living room larger.",
  "Shrink the living room.",
  "Enlarge the kitchen.",
  "Add a balcony.",
  "Remove the balcony.",
  "Rename Bedroom 3 to Office."
];

export function ChatEditor({
  projectPrompt,
  aiSummary,
  fallbackReason,
  project
}: ChatEditorProps) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "msg_assistant_ready",
      role: "assistant",
      content:
        aiSummary ??
        "This plan is ready for validated chat edits. Try making the living room larger or renaming a bedroom."
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [latestQualitySnapshot, setLatestQualitySnapshot] = useState<{
    projectId: string;
    delta: EditQualityDeltaReport | null;
    candidateCount: number | null;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const canEdit = Boolean(project) && !fallbackReason;
  const activeQualitySnapshot =
    latestQualitySnapshot?.projectId === project?.projectId
      ? latestQualitySnapshot
      : null;
  const displayedQualityDelta = isSubmitting
    ? null
    : activeQualitySnapshot
      ? activeQualitySnapshot.delta
      : project?.metadata?.lastEditQualityDelta ?? null;
  const displayedCandidateCount =
    activeQualitySnapshot
      ? activeQualitySnapshot.candidateCount
      : project?.metadata?.optimization?.candidateCount ?? null;
  const helperText = useMemo(() => {
    if (fallbackReason) {
      return "Chat editing needs a generated project in temporary storage. Create a plan first to apply edits.";
    }

    return "Supported demo edits: resize living room, enlarge kitchen, add/remove balcony, add bathroom, and rename room.";
  }, [fallbackReason]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError("Enter an edit request first.");
      return;
    }

    if (!project) {
      setError("Generate a project first before applying chat edits.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setWarnings([]);
    setLatestQualitySnapshot({
      projectId: project.projectId,
      delta: null,
      candidateCount: null
    });
    setMessage("");
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `msg_user_${Date.now()}`,
        role: "user",
        content: trimmedMessage
      }
    ]);

    const result = await editGeneratedProjectWithMessage({
      request: {
        message: trimmedMessage,
        project
      },
      storage: window.localStorage
    });

    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      setWarnings(result.warnings);
      setMessages((currentMessages) => [
        ...currentMessages,
        {
          id: `msg_assistant_error_${Date.now()}`,
          role: "assistant",
          content: result.message
        }
      ]);
      return;
    }

    setWarnings(result.warnings);
    setLatestQualitySnapshot({
      projectId: result.project.projectId,
      delta: result.qualityDelta ?? result.project.metadata?.lastEditQualityDelta ?? null,
      candidateCount: result.project.metadata?.optimization?.candidateCount ?? null
    });
    setMessages((currentMessages) => [
      ...currentMessages,
      {
        id: `msg_assistant_${Date.now()}`,
        role: "assistant",
        content: result.userFacingSummary
      }
    ]);
  }

  return (
    <div className="grid h-full grid-rows-[auto_1fr_auto] gap-4">
      <Toast
        title={fallbackReason ? "Demo fallback active" : "Validated chat edits"}
        tone={fallbackReason ? "warning" : "info"}
      >
        {fallbackReason ?? "Edits are deterministic and validated before the plan updates."}
      </Toast>
      <div className="grid content-start gap-3 overflow-auto">
        {projectPrompt ? (
          <div className="rounded-md border border-neutral-200 bg-white p-3 text-sm text-neutral-700">
            <p className="mb-2 text-xs font-medium text-neutral-500">Original prompt</p>
            <p>{projectPrompt}</p>
          </div>
        ) : null}
        <div className="grid gap-2">
          {messages.map((chatMessage) => (
            <div
              className={
                chatMessage.role === "user"
                  ? "rounded-md border border-blueprint-200 bg-blueprint-50 p-3 text-sm text-blueprint-900"
                  : "rounded-md border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-700"
              }
              key={chatMessage.id}
            >
              <div className="mb-2 flex items-center gap-2 text-xs font-medium text-neutral-500">
                {chatMessage.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
                {chatMessage.role === "user" ? "You" : "Assistant"}
              </div>
              <p>{chatMessage.content}</p>
            </div>
          ))}
        </div>
        {error ? (
          <div aria-live="assertive" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <div className="mb-1 flex items-center gap-2 text-xs font-medium">
              <AlertTriangle className="h-4 w-4" />
              Edit not applied
            </div>
            <p>{error}</p>
          </div>
        ) : null}
        {warnings.length > 0 ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            {warnings.slice(0, 3).map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}
        {displayedQualityDelta ? (
          <QualityDeltaCard
            candidateCount={displayedCandidateCount}
            delta={displayedQualityDelta}
          />
        ) : null}
      </div>
      <form className="grid gap-3" onSubmit={handleSubmit}>
        <Textarea
          disabled={!canEdit || isSubmitting}
          label="Edit with chat"
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Make the living room larger..."
          rows={4}
          value={message}
        />
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            {quickEdits.map((quickEdit) => (
              <button
                className="min-h-12 rounded-md border border-neutral-200 bg-white px-3 py-2 text-left text-xs leading-5 text-neutral-700 transition hover:border-blueprint-500 hover:bg-blueprint-50 focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={!canEdit || isSubmitting}
                key={quickEdit}
                onClick={() => setMessage(quickEdit)}
                type="button"
              >
                {quickEdit}
              </button>
            ))}
          </div>
          <Button
            disabled={!canEdit || isSubmitting}
            rightIcon={<Send className="h-4 w-4" />}
            type="submit"
            variant="primary"
          >
            {isSubmitting ? "Applying edit..." : "Apply edit"}
          </Button>
        </div>
        <p className="text-xs text-neutral-500">{helperText}</p>
      </form>
    </div>
  );
}

function QualityDeltaCard({
  candidateCount,
  delta
}: {
  candidateCount: number | null;
  delta: EditQualityDeltaReport;
}) {
  const reasons = [
    ...delta.improvedMetrics
      .slice()
      .sort((left, right) => right.delta - left.delta)
      .slice(0, 2)
      .map((metric) => `${metric.label} ${formatSignedScoreDelta(metric.delta)}`),
    ...delta.worsenedMetrics
      .slice()
      .sort((left, right) => left.delta - right.delta)
      .slice(0, 1)
      .map((metric) => `${metric.label} ${formatSignedScoreDelta(metric.delta)}`)
  ];
  const tone =
    delta.scoreDelta > 0.01
      ? "border-teal-200 bg-teal-50 text-teal-950"
      : delta.scoreDelta < -0.01
        ? "border-amber-200 bg-amber-50 text-amber-950"
        : "border-neutral-200 bg-neutral-50 text-neutral-800";

  return (
    <div className={`rounded-md border p-3 text-xs ${tone}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-semibold">Quality after edit</p>
        <span className="font-mono text-sm font-semibold">
          {formatSignedScoreDelta(delta.scoreDelta)}
        </span>
      </div>
      <p className="font-mono">
        {delta.beforeOverallScore} {"->"} {delta.afterOverallScore}
      </p>
      {candidateCount ? (
        <p className="mt-1 text-[11px] opacity-80">
          Optimized across {candidateCount} layout candidates.
        </p>
      ) : null}
      {reasons.length > 0 ? (
        <div className="mt-2 grid gap-1">
          {reasons.map((reason) => (
            <p key={reason}>{reason}</p>
          ))}
        </div>
      ) : (
        <p className="mt-2">Quality metrics stayed broadly stable.</p>
      )}
    </div>
  );
}
