import { Building2, Layers3, Ruler, ScanLine, TriangleAlert } from "lucide-react";
import { Card, SectionTitle, StatusBadge } from "../components/SnowPrimitives.jsx";
import { formatNumber } from "../lib/format.js";

export function FloorPlanPage({ parcel }) {
  const plans = parcel?.floor_plan_options?.length ? parcel.floor_plan_options : fallbackPlans;
  const plan = [...plans].sort((a, b) => Number(b.fit_score || 0) - Number(a.fit_score || 0))[0];
  const zones = zonesForPlan(parcel, plan);
  const findings = findingsForPlan(parcel, plan);

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold">Kat Plan Sistemi</h1>
          <div className="mt-1 text-xs text-white/38">{parcel?.parcel_key || "prototype"} / {plan.floor_label || "Tipik Kat"}</div>
        </div>
        <StatusBadge status={plan.review_required ? "review" : "complete"}>
          {plan.review_required ? "Review" : "Ready"}
        </StatusBadge>
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_330px]">
        <Card className="min-h-[620px]">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <SectionTitle title={plan.plan_name || "Tipik Kat Plan"} eyebrow={plan.plan_type || "floor_plan"} />
            <div className="grid grid-cols-3 gap-3 text-right text-xs text-white/45">
              <PlanMiniMetric icon={Building2} label="Kat" value={formatNumber(plan.floor_count || 0)} />
              <PlanMiniMetric icon={Layers3} label="Birim" value={formatNumber(plan.units_per_floor || 0)} />
              <PlanMiniMetric icon={ScanLine} label="Skor" value={`${Math.round(Number(plan.fit_score || 0))}`} />
            </div>
          </div>

          <div className="relative mt-6 aspect-[4/3] min-h-[420px] overflow-hidden rounded-card border border-white/10 bg-[#151515]">
            <div
              className="absolute inset-0 opacity-55"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(255,255,255,.055) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.055) 1px, transparent 1px)",
                backgroundSize: "32px 32px",
              }}
            />
            <div className="absolute inset-5 rounded-card border border-white/12" />
            {zones.map((zone) => (
              <PlanZone key={zone.zone_key || zone.id} zone={zone} />
            ))}
          </div>
        </Card>

        <div className="space-y-7">
          <Card>
            <SectionTitle title="Plan Metrikleri" />
            <div className="mt-5 space-y-4">
              <MetricLine label="Brut Kat" value={area(plan.gross_floor_area_m2)} />
              <MetricLine label="Net Kat" value={area(plan.net_floor_area_m2)} />
              <MetricLine label="Konut Alani" value={area(plan.residential_area_m2)} />
              <MetricLine label="Cekirdek" value={area(plan.core_area_m2)} />
              <MetricLine label="Dolasim" value={area(plan.circulation_area_m2)} />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Skorlar" />
            <div className="mt-5 space-y-5">
              <ScoreBar label="Fit" value={plan.fit_score} color="bg-snow-ice" />
              <ScoreBar label="Gun Isigi" value={plan.daylight_score} color="bg-snow-green" />
              <ScoreBar label="Uygulanabilirlik" value={plan.constructability_score} color="bg-snow-cyan" />
              <ScoreBar label="Islak Hacim" value={plan.wet_core_alignment_score} color="bg-snow-violet" />
            </div>
          </Card>

          <Card>
            <SectionTitle title="Plan Bulgulari" />
            <div className="mt-5 space-y-4">
              {(findings.length ? findings : fallbackFindings).slice(0, 4).map((finding, index) => (
                <div key={finding.id || finding.code || index} className="flex gap-3 border-b border-snow-line pb-3 last:border-0 last:pb-0">
                  <div className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/8 text-white/58">
                    <TriangleAlert size={15} />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm text-white/86">{finding.code || "floor_plan_review"}</div>
                    <div className="mt-1 line-clamp-2 text-xs leading-5 text-white/42">{finding.message || "Plan kontrolu bekliyor."}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <Card>
        <div className="mb-5 flex flex-wrap items-center gap-5">
          <SectionTitle title="Plan Secenekleri" />
          <span className="text-sm text-white/40">{plans.length} alternatif</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-white/40">
              <tr className="border-b border-snow-line">
                <th className="px-0 py-3 font-normal">Plan</th>
                <th className="px-4 py-3 font-normal">Tip</th>
                <th className="px-4 py-3 font-normal">Birim/Kat</th>
                <th className="px-4 py-3 font-normal">Verim</th>
                <th className="px-4 py-3 font-normal">Skor</th>
                <th className="px-4 py-3 font-normal">Durum</th>
              </tr>
            </thead>
            <tbody>
              {plans.map((item) => (
                <tr key={item.plan_key} className="border-b border-snow-line last:border-0">
                  <td className="px-0 py-3 font-mono text-white/90">{shortKey(item.plan_key)}</td>
                  <td className="px-4 py-3 text-white/72">{item.plan_type}</td>
                  <td className="px-4 py-3 text-white/72">{formatNumber(item.units_per_floor || 0)}</td>
                  <td className="px-4 py-3 text-white/72">{percent(item.efficiency_percent)}</td>
                  <td className="px-4 py-3 text-white/72">{Math.round(Number(item.fit_score || 0))}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.review_required ? "review" : "complete"}>
                      {item.review_required ? "Review" : "Ready"}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function PlanZone({ zone }) {
  const roomy = Number(zone.width || 0) >= 14 && Number(zone.height || 0) >= 14;
  return (
    <div
      className={`absolute overflow-hidden rounded-lg border p-2 shadow-[0_10px_24px_rgba(0,0,0,.22)] ${zoneClass(zone.zone_type)}`}
      style={{
        left: `${zone.x}%`,
        top: `${zone.y}%`,
        width: `${zone.width}%`,
        height: `${zone.height}%`,
      }}
      title={`${zone.label} ${area(zone.area_m2)}`}
    >
      {roomy ? (
        <div className="flex h-full flex-col justify-between">
          <div className="truncate text-xs font-semibold">{zone.label}</div>
          <div className="flex items-center gap-1 truncate text-[11px] opacity-70">
            <Ruler size={12} />
            {area(zone.area_m2)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlanMiniMetric({ icon: Icon, label, value }) {
  return (
    <div className="min-w-[70px]">
      <div className="mb-1 flex items-center justify-end gap-1">
        <Icon size={13} />
        <span>{label}</span>
      </div>
      <div className="text-base font-semibold text-white">{value}</div>
    </div>
  );
}

function MetricLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-white/52">{label}</span>
      <span className="font-mono text-white/88">{value}</span>
    </div>
  );
}

function ScoreBar({ label, value, color }) {
  const score = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="text-white/72">{label}</span>
        <span className="font-mono text-white/88">{Math.round(score)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

function zonesForPlan(parcel, plan) {
  const zones = parcel?.floor_plan_zones?.filter((zone) => zone.plan_key === plan.plan_key) || [];
  return zones.length ? zones : fallbackZones;
}

function findingsForPlan(parcel, plan) {
  return parcel?.floor_plan_findings?.filter((finding) => finding.plan_key === plan.plan_key) || [];
}

function zoneClass(type) {
  if (type === "core") return "border-[#c6c7f8]/70 bg-[#c6c7f8] text-[#151515]";
  if (type === "circulation") return "border-[#baedbd]/70 bg-[#baedbd] text-[#151515]";
  return "border-[#e3f5ff]/70 bg-[#e3f5ff] text-[#151515]";
}

function area(value) {
  const number = Number(value || 0);
  return number ? `${formatNumber(Math.round(number))} m2` : "-";
}

function percent(value) {
  const number = Number(value || 0);
  return number ? `%${Math.round(number)}` : "-";
}

function shortKey(value = "") {
  const parts = String(value).split("-");
  return parts.slice(-3).join("-");
}

const fallbackPlans = [
  {
    plan_key: "FLOOR-PROTOTYPE-1",
    plan_name: "Dengeli Aile Karmasi Kat Plan",
    plan_type: "compact_core",
    floor_label: "Tipik Kat",
    floor_count: 8,
    units_per_floor: 4,
    gross_floor_area_m2: 365,
    net_floor_area_m2: 292,
    core_area_m2: 55,
    circulation_area_m2: 24,
    residential_area_m2: 286,
    efficiency_percent: 78,
    wet_core_alignment_score: 82,
    daylight_score: 90,
    constructability_score: 88,
    fit_score: 86,
    review_required: 0,
  },
];

const fallbackZones = [
  { zone_key: "unit-1", zone_type: "unit", label: "2+1-1", area_m2: 82, x: 5, y: 7, width: 34, height: 28 },
  { zone_key: "unit-2", zone_type: "unit", label: "2+1-2", area_m2: 82, x: 61, y: 7, width: 34, height: 28 },
  { zone_key: "unit-3", zone_type: "unit", label: "3+1-3", area_m2: 110, x: 61, y: 65, width: 34, height: 28 },
  { zone_key: "unit-4", zone_type: "unit", label: "1+1-4", area_m2: 56, x: 5, y: 65, width: 34, height: 28 },
  { zone_key: "corridor-v", zone_type: "circulation", label: "Dikey Dolasim", area_m2: 12, x: 47, y: 8, width: 6, height: 84 },
  { zone_key: "corridor-h", zone_type: "circulation", label: "Yatay Dolasim", area_m2: 12, x: 8, y: 47, width: 84, height: 6 },
  { zone_key: "core", zone_type: "core", label: "Cekirdek", area_m2: 55, x: 42, y: 38, width: 16, height: 24 },
];

const fallbackFindings = [
  { code: "floor_plan_ready", message: "Kat plan prototipi review icin hazir." },
];
