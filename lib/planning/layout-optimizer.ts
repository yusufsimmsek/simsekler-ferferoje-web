import type {
  FloorPlan,
  ValidationIssue
} from "@/lib/floor-plan/types";
import {
  validateFloorPlan,
  zodErrorToValidationIssues
} from "@/lib/floor-plan/validation";
import {
  analyzeLayoutQuality
} from "./layout-quality";
import {
  layoutOptimizationReportSchema,
  evaluatedLayoutCandidateSchema,
  rejectedLayoutCandidateSchema
} from "./candidate-schema";
import {
  generateLayoutCandidates,
  type GenerateLayoutCandidatesInput
} from "./layout-candidate-generator";
import type {
  EvaluatedLayoutCandidate,
  LayoutCandidate,
  LayoutCandidateScoreRow,
  LayoutOptimizationReport,
  RejectedLayoutCandidate
} from "./candidate-types";
import type { LayoutQualityReport } from "./quality-types";
import type { ResolvedPlanningSpecification } from "./resolved-planning-types";

export type OptimizeFloorPlanLayoutInput = GenerateLayoutCandidatesInput & {
  planning: ResolvedPlanningSpecification;
  candidateOverrides?: LayoutCandidate[];
};

export type LayoutCandidateEvaluationResult = {
  evaluatedCandidates: EvaluatedLayoutCandidate[];
  rejectedCandidates: RejectedLayoutCandidate[];
};

export type OptimizeFloorPlanLayoutResult =
  | {
      ok: true;
      plan: FloorPlan;
      quality: LayoutQualityReport;
      metadata: LayoutOptimizationReport;
      candidates: EvaluatedLayoutCandidate[];
      rejectedCandidates: RejectedLayoutCandidate[];
      warnings: string[];
    }
  | {
      ok: false;
      plan: null;
      quality: null;
      metadata: null;
      candidates: EvaluatedLayoutCandidate[];
      rejectedCandidates: RejectedLayoutCandidate[];
      issues: ValidationIssue[];
      warnings: string[];
    };

export function optimizeFloorPlanLayout(
  input: OptimizeFloorPlanLayoutInput
): OptimizeFloorPlanLayoutResult {
  const {
    planning,
    candidateOverrides,
    ...layoutInput
  } = input;
  const generation = candidateOverrides
    ? {
        candidates: candidateOverrides,
        rejectedCandidates: [] as RejectedLayoutCandidate[],
        warnings: [] as string[]
      }
    : generateLayoutCandidates(layoutInput);
  const evaluation = evaluateLayoutCandidates({
    planning,
    candidates: generation.candidates
  });
  const rejectedCandidates = [
    ...generation.rejectedCandidates,
    ...evaluation.rejectedCandidates
  ];

  if (evaluation.evaluatedCandidates.length === 0) {
    return {
      ok: false,
      plan: null,
      quality: null,
      metadata: null,
      candidates: [],
      rejectedCandidates,
      issues: [
        createValidationIssue({
          code: "layout_optimization_no_valid_candidates",
          message: "No generated layout candidates passed validation and quality analysis."
        })
      ],
      warnings: uniqueStrings([
        ...generation.warnings,
        ...rejectedCandidates.map(
          (candidate) => `${candidate.label} rejected: ${candidate.reason}`
        )
      ])
    };
  }

  const selected = selectBestLayoutCandidate(evaluation.evaluatedCandidates);
  const rankedCandidates = rankLayoutCandidates(evaluation.evaluatedCandidates);
  const metadataPayload = buildOptimizationReport({
    rankedCandidates,
    selected,
    rejectedCandidates
  });
  const metadataParse = layoutOptimizationReportSchema.safeParse(metadataPayload);

  if (!metadataParse.success) {
    return {
      ok: false,
      plan: null,
      quality: null,
      metadata: null,
      candidates: evaluation.evaluatedCandidates,
      rejectedCandidates,
      issues: zodErrorToValidationIssues(
        metadataParse.error,
        "layout-optimization-report"
      ),
      warnings: generation.warnings
    };
  }

  return {
    ok: true,
    plan: withOptimizationWarning(
      selected.plan,
      selected.label,
      metadataParse.data.candidateCount,
      selected.quality.overallScore
    ),
    quality: selected.quality,
    metadata: metadataParse.data,
    candidates: rankedCandidates,
    rejectedCandidates,
    warnings: uniqueStrings([
      ...generation.warnings,
      ...selected.warnings,
      ...selected.quality.warnings.map((warning) => warning.message),
      ...rejectedCandidates.map(
        (candidate) => `${candidate.label} rejected: ${candidate.reason}`
      )
    ])
  };
}

export function evaluateLayoutCandidates(input: {
  planning: ResolvedPlanningSpecification;
  candidates: LayoutCandidate[];
}): LayoutCandidateEvaluationResult {
  const evaluatedCandidates: EvaluatedLayoutCandidate[] = [];
  const rejectedCandidates: RejectedLayoutCandidate[] = [];

  input.candidates.forEach((candidate) => {
    const validation = validateFloorPlan(candidate.plan);

    if (!validation.ok) {
      rejectedCandidates.push(
        rejectCandidate(candidate, "Candidate FloorPlan failed validation.", validation.issues)
      );
      return;
    }

    const quality = analyzeLayoutQuality({
      planning: input.planning,
      plan: validation.data
    });

    if (!quality.ok) {
      rejectedCandidates.push(
        rejectCandidate(
          candidate,
          "Candidate quality analysis failed.",
          quality.issues.map((message, index) =>
            createValidationIssue({
              code: "layout_quality_analysis_failed",
              message,
              id: `issue_quality_${candidate.id}_${index + 1}`
            })
          )
        )
      );
      return;
    }

    const evaluatedParse = evaluatedLayoutCandidateSchema.safeParse({
      ...candidate,
      plan: validation.data,
      quality: quality.report
    });

    if (!evaluatedParse.success) {
      rejectedCandidates.push(
        rejectCandidate(
          candidate,
          "Evaluated candidate failed strict schema validation.",
          zodErrorToValidationIssues(
            evaluatedParse.error,
            `evaluated-layout-candidate-${candidate.id}`
          )
        )
      );
      return;
    }

    evaluatedCandidates.push(evaluatedParse.data);
  });

  return {
    evaluatedCandidates,
    rejectedCandidates
  };
}

export function selectBestLayoutCandidate(
  candidates: EvaluatedLayoutCandidate[]
): EvaluatedLayoutCandidate {
  if (candidates.length === 0) {
    throw new Error("Cannot select a layout candidate from an empty list.");
  }

  return rankLayoutCandidates(candidates)[0];
}

export function rankLayoutCandidates(
  candidates: EvaluatedLayoutCandidate[]
) {
  return candidates.slice().sort(compareEvaluatedCandidates);
}

function compareEvaluatedCandidates(
  candidateA: EvaluatedLayoutCandidate,
  candidateB: EvaluatedLayoutCandidate
) {
  const scoreDiffs = [
    candidateB.quality.overallScore - candidateA.quality.overallScore,
    candidateB.quality.relationshipSatisfactionScore -
      candidateA.quality.relationshipSatisfactionScore,
    candidateB.quality.circulationScore - candidateA.quality.circulationScore,
    candidateB.quality.roomBalanceScore - candidateA.quality.roomBalanceScore
  ];

  for (const diff of scoreDiffs) {
    if (Math.abs(diff) > 0.01) return diff;
  }

  return candidateA.metadata.order - candidateB.metadata.order;
}

function buildOptimizationReport(input: {
  rankedCandidates: EvaluatedLayoutCandidate[];
  selected: EvaluatedLayoutCandidate;
  rejectedCandidates: RejectedLayoutCandidate[];
}): LayoutOptimizationReport {
  const scoreComparisonTable = input.rankedCandidates.map((candidate, index) =>
    scoreRowForCandidate(candidate, index + 1, candidate.id === input.selected.id)
  );
  const payload = {
    schemaVersion: "layout-optimization-report-v1",
    candidateCount:
      input.rankedCandidates.length + input.rejectedCandidates.length,
    validCandidateCount: input.rankedCandidates.length,
    rejectedCandidateCount: input.rejectedCandidates.length,
    bestScore: input.selected.quality.overallScore,
    selectedCandidate: {
      id: input.selected.id,
      label: input.selected.label,
      strategy: input.selected.strategy,
      overallScore: input.selected.quality.overallScore,
      relationshipSatisfactionScore:
        input.selected.quality.relationshipSatisfactionScore,
      circulationScore: input.selected.quality.circulationScore,
      roomBalanceScore: input.selected.quality.roomBalanceScore,
      selectionReason:
        "Selected by deterministic score ranking: overall quality, relationship satisfaction, circulation, then room balance."
    },
    rejectedCandidates: input.rejectedCandidates,
    scoreComparisonTable,
    metadata: {
      optimizer: "deterministic-layout-optimizer-v1",
      candidateGenerator: "deterministic-layout-candidate-generator-v1",
      qualityAnalyzer: "deterministic-layout-quality-analyzer-v1",
      deterministic: true,
      tieBreakers: [
        "overall quality score",
        "relationship satisfaction score",
        "circulation score",
        "room balance score"
      ]
    }
  };

  return layoutOptimizationReportSchema.parse(payload);
}

function scoreRowForCandidate(
  candidate: EvaluatedLayoutCandidate,
  rank: number,
  selected: boolean
): LayoutCandidateScoreRow {
  return {
    rank,
    candidateId: candidate.id,
    label: candidate.label,
    strategy: candidate.strategy,
    overallScore: candidate.quality.overallScore,
    relationshipSatisfactionScore:
      candidate.quality.relationshipSatisfactionScore,
    circulationScore: candidate.quality.circulationScore,
    roomBalanceScore: candidate.quality.roomBalanceScore,
    geometryScore: candidate.quality.geometryScore,
    warningCount: candidate.quality.warnings.length,
    selected
  };
}

function rejectCandidate(
  candidate: LayoutCandidate,
  reason: string,
  issues: ValidationIssue[]
) {
  return rejectedLayoutCandidateSchema.parse({
    id: candidate.id,
    label: candidate.label,
    strategy: candidate.strategy,
    reason,
    issues: issues.length > 0
      ? issues
      : [
          createValidationIssue({
            code: "layout_candidate_rejected",
            message: reason
          })
        ]
  });
}

function withOptimizationWarning(
  plan: FloorPlan,
  label: string,
  candidateCount: number,
  score: number
): FloorPlan {
  return {
    ...plan,
    layout: {
      ...plan.layout,
      warnings: uniqueStrings([
        ...(plan.layout.warnings ?? []),
        `${label} selected by deterministic optimizer from ${candidateCount} valid and rejected candidates with score ${score}.`
      ])
    }
  };
}

function createValidationIssue(input: {
  code: string;
  message: string;
  id?: string;
}): ValidationIssue {
  return {
    id: input.id ?? `issue_${input.code}`,
    severity: "critical",
    code: input.code.toUpperCase(),
    message: input.message
  };
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values.filter((value) => value.trim().length > 0)));
}
