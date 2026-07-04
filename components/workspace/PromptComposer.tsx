"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, LoaderCircle, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { createProjectFromPrompt } from "@/lib/projects/create-project-client";

const examplePrompts = [
  {
    label: "3+1 family apartment",
    prompt: "Create a 3+1 apartment with an open kitchen, one bathroom, one WC, and a balcony off the living room."
  },
  {
    label: "Compact 2+1 home",
    prompt: "Design a compact 2+1 home with a large living room, separate kitchen, bathroom, and WC."
  },
  {
    label: "Simple 1+1 apartment",
    prompt: "Create a 1+1 apartment with living room, kitchen, bathroom, and one bedroom."
  }
];

const generationStages = ["Interpret room brief", "Build rectangular layout", "Validate geometry"];

type PromptComposerProps = {
  compact?: boolean;
};

export function PromptComposer({ compact = false }: PromptComposerProps) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [projectName, setProjectName] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting">("idle");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formErrorTitle, setFormErrorTitle] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (compact) return;

    setFieldError(null);
    setFormError(null);
    setFormErrorTitle(null);

    if (!prompt.trim()) {
      setFieldError("Describe the residential layout you want to generate.");
      return;
    }

    setStatus("submitting");

    const result = await createProjectFromPrompt({
      request: {
        prompt,
        projectName
      },
      storage: window.localStorage
    });

    if (!result.ok) {
      setStatus("idle");
      setFormErrorTitle(result.retryable ? "Refine your prompt" : "Outside the demo scope");
      setFormError(result.message);
      return;
    }

    router.push(`/projects/${result.project.projectId}`);
  }

  if (compact) {
    return (
      <div className="grid gap-4">
        <Textarea
          helperText="Use one supported room-level edit."
          label="Edit request"
          placeholder="Make the living room larger..."
          rows={4}
        />
        <Button disabled leftIcon={<Sparkles className="h-4 w-4" />} variant="primary">
          Send edit request
        </Button>
      </div>
    );
  }

  return (
    <form className="grid gap-5" onSubmit={handleSubmit}>
      <Input
        className="h-11 bg-neutral-50"
        disabled={status === "submitting"}
        helperText="Optional. Saved with the project in this browser."
        label="Project name"
        name="projectName"
        onChange={(event) => setProjectName(event.target.value)}
        placeholder="3+1 apartment concept"
        value={projectName}
      />

      <div className="border-l-2 border-blueprint-500 bg-neutral-50 p-4 sm:p-5">
        <Textarea
          className="min-h-48 bg-white text-base leading-7 shadow-sm"
          disabled={status === "submitting"}
          error={fieldError ?? undefined}
          helperText="Mention room count, key spaces, and relationships such as balcony near living room."
          label="Floor plan prompt"
          name="prompt"
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Create a 3+1 apartment with an open kitchen, bathroom, WC, and balcony..."
          rows={8}
          value={prompt}
        />
      </div>

      {status === "submitting" ? (
        <div aria-live="polite" className="border border-blue-200 bg-blue-50 p-4 text-sm text-blue-950">
          <div className="flex items-center gap-2 font-medium">
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Generating your conceptual floor plan
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {generationStages.map((stage) => (
              <div className="flex items-center gap-2 text-xs text-blue-800" key={stage}>
                <CheckCircle2 className="h-3.5 w-3.5" />
                {stage}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {formError ? (
        <div aria-live="assertive" className="border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">{formErrorTitle}</p>
              <p className="mt-1 leading-6">{formError}</p>
              <p className="mt-2 text-xs text-red-700">
                Supported format: one-floor residential plan with simple rectangular rooms.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <Button
        className="w-full sm:w-auto"
        disabled={status === "submitting"}
        leftIcon={status === "submitting" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        size="lg"
        type="submit"
        variant="primary"
      >
        {status === "submitting" ? "Generating floor plan..." : "Generate floor plan"}
      </Button>

      <div className="grid gap-3 border-t border-neutral-200 pt-5">
        <div>
          <p className="text-sm font-semibold text-neutral-950">Reliable demo prompts</p>
          <p className="mt-1 text-xs text-neutral-500">Choose an example, then adjust the wording if needed.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {examplePrompts.map((example) => (
            <button
              className="min-h-28 rounded-md border border-neutral-200 bg-white p-3 text-left transition hover:border-blueprint-500 hover:bg-blueprint-50 focus:outline-none focus:ring-2 focus:ring-blueprint-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={status === "submitting"}
              key={example.label}
              onClick={() => {
                setPrompt(example.prompt);
                setFieldError(null);
                setFormError(null);
                setFormErrorTitle(null);
              }}
              type="button"
            >
              <span className="block text-xs font-semibold text-neutral-950">{example.label}</span>
              <span className="mt-2 block text-xs leading-5 text-neutral-500">{example.prompt}</span>
            </button>
          ))}
        </div>
      </div>

      <p className="border-l-2 border-amber-500 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900">
        Conceptual draft only. Not suitable for construction, permits, structural, legal, or code-compliance use.
      </p>
    </form>
  );
}
