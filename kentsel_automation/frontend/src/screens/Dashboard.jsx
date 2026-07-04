import { ChevronDown } from "lucide-react";
import { Card, Donut, MiniLineChart, SectionTitle, StatCard, StatusBadge } from "../components/SnowPrimitives.jsx";
import { formatNumber } from "../lib/format.js";

const architectureLayers = [
  {
    title: "Interface / Panel",
    muted: true,
    tags: ["parcel", "zoning", "existing area"],
  },
  {
    title: "Regulation Engine",
    tags: ["versioned", "ABBIY", "parking", "shelter", "fire"],
  },
  {
    title: "Calculation Engine",
    tags: ["envelope", "core", "unit layout"],
  },
  {
    title: "Sharing Engine",
    tags: ["distribution", "participation fee"],
  },
  {
    title: "Production / Render",
    muted: true,
    tags: ["kat plan", "sharing sheet", "branded PDF"],
  },
];

export function Dashboard({ summary = {}, warnings = [] }) {
  const riskCount = summary.warnings_by_level?.find((item) => item.level === "risk")?.count || 0;
  const reviewCount = summary.warnings_by_level?.find((item) => item.level === "review")?.count || 0;
  const offerReady = Math.min(88, Math.max(38, Math.round((summary.offer_data_packages || 0) * 12 + 46)));

  const evidenceRows = [
    { label: "CAD", value: summary.cad_unit_candidates || 0, max: 400 },
    { label: "PDF", value: summary.document_qa_evidence || 0, max: 800, active: true },
    { label: "Excel", value: summary.excel_old_metraj || 0, max: 12 },
    { label: "Contract", value: summary.contract_rule_findings || 0, max: 60 },
    { label: "Review", value: summary.review_tasks || 0, max: 70 },
    { label: "Offer", value: summary.offer_data_packages || 0, max: 8 },
  ];

  const moduleRows = [
    { label: "Regulation", value: summary.contract_rule_evaluations || 0, max: 14, color: "bg-[#8ea0ff]" },
    { label: "Envelope", value: summary.building_envelope_results || 0, max: 8, color: "bg-snow-green" },
    { label: "Core", value: summary.core_placement_results || 0, max: 8, color: "bg-snow-violet" },
    { label: "Layout", value: summary.unit_layout_options || 0, max: 12, color: "bg-snow-cyan" },
    { label: "Plan", value: summary.floor_plan_options || 0, max: 12, color: "bg-snow-ice" },
    { label: "Share", value: summary.sharing_payment_options || 0, max: 12, color: "bg-[#a8c5dc]" },
    { label: "Render", value: summary.offer_data_packages || 0, max: 8, color: "bg-[#9ee0c9]" },
  ];

  return (
    <div className="space-y-7">
      <div className="flex items-center gap-2 text-sm font-semibold">
        Today
        <ChevronDown size={16} className="text-white/35" />
      </div>

      <div className="grid gap-7 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Parcels" value={formatNumber(summary.parcels)} delta="+11.01%" tone="blue" />
        <StatCard label="Engine Runs" value={formatNumber(summary.engine_runs)} delta="-0.03%" tone="ice" />
        <StatCard label="Review Tasks" value={formatNumber(summary.review_tasks)} delta="+15.03%" tone="blue" />
        <StatCard label="Offer Packages" value={formatNumber(summary.offer_data_packages)} delta="+6.08%" tone="ice" />
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_202px]">
        <Card className="min-h-[330px]">
          <div className="mb-5 flex flex-wrap items-center gap-5">
            <SectionTitle title="Total Projects" />
            <span className="text-sm text-white/40">Engine Runs</span>
            <span className="text-sm text-white/40">Operating Status</span>
            <span className="hidden h-5 w-px bg-snow-line md:block" />
            <LegendDot color="bg-snow-violet" label="Current Week" />
            <LegendDot color="bg-snow-cyan" label="Previous Week" />
          </div>
          <MiniLineChart />
        </Card>

        <Card className="min-h-[330px]">
          <SectionTitle title="Evidence by Source" />
          <div className="mt-5 space-y-5">
            {evidenceRows.map((row) => (
              <CompactSourceRow key={row.label} {...row} />
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-7 xl:grid-cols-2">
        <Card className="min-h-[280px]">
          <SectionTitle title="Automation by Module" />
          <ModuleBars rows={moduleRows} />
        </Card>

        <Card className="min-h-[280px]">
          <SectionTitle title="Offer Readiness by Status" />
          <div className="mt-8 grid gap-8 md:grid-cols-[190px_minmax(0,1fr)] md:items-center">
            <div className="grid place-items-center">
              <Donut value={offerReady} />
            </div>
            <div className="space-y-4 text-sm">
              <LegendLine color="bg-snow-violet" label="Ready" value={`${offerReady}%`} />
              <LegendLine color="bg-snow-green" label="Review" value={`${reviewCount}`} />
              <LegendLine color="bg-snow-cyan" label="Risk" value={`${riskCount}`} />
              <LegendLine color="bg-white/35" label="Open warnings" value={formatNumber(warnings.length)} />
            </div>
          </div>
        </Card>
      </div>

      <Card className="min-h-[250px]">
        <div className="mb-5 flex flex-wrap items-center gap-5">
          <SectionTitle title="Review Queue" />
          <span className="text-sm text-white/40">Source Control</span>
          <span className="text-sm text-white/40">Human Review</span>
        </div>
        <div className="overflow-hidden">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-white/40">
              <tr className="border-b border-snow-line">
                <th className="px-0 py-3 font-normal">Parcel</th>
                <th className="px-4 py-3 font-normal">Code</th>
                <th className="px-4 py-3 font-normal">Module</th>
                <th className="px-4 py-3 font-normal">Date</th>
                <th className="px-4 py-3 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {(warnings.length ? warnings : fallbackWarnings).slice(0, 5).map((warning, index) => (
                <tr key={warning.id || index} className="border-b border-snow-line last:border-0">
                  <td className="px-0 py-3 font-mono text-white/90">{warning.parcel_key || "general"}</td>
                  <td className="px-4 py-3 text-white/72">{warning.code}</td>
                  <td className="px-4 py-3 text-white/72">{moduleFromCode(warning.code)}</td>
                  <td className="px-4 py-3 text-white/72">{index ? "59 minutes ago" : "Just now"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={index === 3 ? "approved" : warning.level || warning.status}>
                      {index === 3 ? "Approved" : labelStatus(warning.level || warning.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="space-y-3">
        <SectionTitle title="System Architecture" eyebrow="Architecture" />
        <div className="space-y-3 pt-2">
          {architectureLayers.map((layer) => (
            <div
              key={layer.title}
              className={`grid gap-4 rounded-xl border px-5 py-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center ${
                layer.muted ? "border-snow-line bg-transparent" : "border-[#c6c7f8]/40 bg-[#ededff]"
              }`}
            >
              <div className={`text-lg font-semibold ${layer.muted ? "text-white" : "text-[#001ea8]"}`}>{layer.title}</div>
              <div className="flex flex-wrap gap-2">
                {layer.tags.map((tag) => (
                  <span
                    key={tag}
                    className={`rounded-lg border px-3 py-1.5 font-mono text-sm ${
                      layer.muted ? "border-white/10 bg-white/5 text-white/45" : "border-[#c6c7f8] bg-white text-[#001ea8]"
                    }`}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function CompactSourceRow({ label, value, max, active }) {
  const width = Math.max(18, Math.min(100, Math.round((Number(value || 0) / max) * 100)));
  return (
    <div className="grid grid-cols-[72px_minmax(0,1fr)] items-center gap-3 text-sm">
      <span className="truncate text-white/78">{label}</span>
      <div className="h-1.5 rounded-full bg-white/10">
        <div className={`h-full rounded-full ${active ? "bg-snow-violet" : "bg-white/16"}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function ModuleBars({ rows }) {
  return (
    <div className="mt-7 grid h-[200px] items-end gap-4 border-b border-white/18 px-3" style={{ gridTemplateColumns: `repeat(${rows.length}, minmax(0, 1fr))` }}>
      {rows.map((row) => {
        const height = Math.max(32, Math.min(170, Math.round((Number(row.value || 0) / row.max) * 170)));
        return (
          <div key={row.label} className="flex h-full flex-col items-center justify-end gap-3">
            <div className={`w-6 rounded-t-md ${row.color}`} style={{ height }} />
            <span className="w-full truncate text-center text-xs text-white/38">{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-2 text-sm text-white/72">
      <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
      {label}
    </span>
  );
}

function LegendLine({ color, label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-white/78">
        <span className={`h-1.5 w-1.5 rounded-full ${color}`} />
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function moduleFromCode(code = "") {
  if (code.includes("contract")) return "Contract";
  if (code.includes("cad")) return "CAD";
  if (code.includes("proposal")) return "Proposal";
  if (code.includes("source")) return "Source";
  return "General";
}

function labelStatus(status = "") {
  if (status === "risk") return "In Progress";
  if (status === "review") return "Pending";
  if (status === "info") return "Complete";
  if (status === "open") return "In Progress";
  return status || "Pending";
}

const fallbackWarnings = [
  { id: "CM9801", parcel_key: "13621-7", code: "cad_excel_area_delta", level: "review" },
  { id: "CM9802", parcel_key: "25308-7", code: "contract_distribution_missing", level: "risk" },
  { id: "CM9803", parcel_key: "5930-23", code: "proposal_special_note", level: "review" },
  { id: "CM9804", parcel_key: "2469-4", code: "source_without_parcel_key", level: "info" },
  { id: "CM9805", parcel_key: "general", code: "missing_cad_semantics", level: "risk" },
];
