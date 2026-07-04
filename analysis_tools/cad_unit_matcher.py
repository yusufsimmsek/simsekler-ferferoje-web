from __future__ import annotations

import csv
import json
import math
import re
import statistics
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
SEMANTIC_JSON = ANALYSIS_ROOT / "semantic_cad" / "semantic_cad_analysis.json"
PROPOSAL_V2_JSON = ANALYSIS_ROOT / "proposal_v2" / "proposal_v2_analysis.json"
OUT = ANALYSIS_ROOT / "cad_units"

OUT_JSON = OUT / "cad_unit_analysis.json"
OUT_PLAN_CSV = OUT / "cad_unit_plan_summary.csv"
OUT_CANDIDATE_CSV = OUT / "cad_unit_candidates.csv"
OUT_FINDINGS_CSV = OUT / "cad_unit_findings.csv"
OUT_MD = OUT / "CAD_UNIT_MATCHER_REPORT.md"


PARCEL_RE = re.compile(r"(?<!\d)(\d{3,5})\s*[- ]\s*(\d{1,3})(?!\d)")

COMMERCIAL_TYPES = {"dukkan"}
SERVICE_TYPES = {"banyo", "wc", "dus", "lavabo", "antre", "hol", "koridor", "asansor", "merdiven", "depo"}
LIVING_TYPES = {"salon", "salon_mutfak", "mutfak"}
BEDROOM_TYPES = {"oda", "yatak_odasi"}
OUTDOOR_TYPES = {"balkon", "teras"}


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def parcel_key_from_text(value: Any) -> str | None:
    match = PARCEL_RE.search(str(value or ""))
    if not match:
        return None
    return f"{int(match.group(1))}-{int(match.group(2))}"


def point(pair: dict[str, Any]) -> tuple[float, float] | None:
    raw = pair.get("room_point") or pair.get("area_point")
    if not raw or len(raw) < 2:
        return None
    return float(raw[0]), float(raw[1])


def bbox(points: list[tuple[float, float]]) -> dict[str, Any] | None:
    if not points:
        return None
    xs = [item[0] for item in points]
    ys = [item[1] for item in points]
    return {
        "min": [min(xs), min(ys)],
        "max": [max(xs), max(ys)],
        "size": [max(xs) - min(xs), max(ys) - min(ys)],
    }


def center(points: list[tuple[float, float]]) -> tuple[float | None, float | None]:
    if not points:
        return None, None
    return sum(p[0] for p in points) / len(points), sum(p[1] for p in points) / len(points)


def nearest_neighbor_distances(points: list[tuple[float, float]]) -> list[float]:
    out: list[float] = []
    for idx, a in enumerate(points):
        distances = [math.dist(a, b) for jdx, b in enumerate(points) if idx != jdx]
        if distances:
            out.append(min(distances))
    return out


def cluster_threshold(pairs: list[dict[str, Any]]) -> float:
    points = [point(pair) for pair in pairs]
    points = [item for item in points if item is not None]
    if len(points) < 2:
        return 6500.0
    distances = nearest_neighbor_distances(points)
    if not distances:
        return 6500.0
    median_distance = statistics.median(distances)
    return max(6500.0, min(12000.0, median_distance * 4.0))


def split_sequence_clusters(pairs: list[dict[str, Any]], threshold: float) -> list[list[dict[str, Any]]]:
    clusters: list[list[dict[str, Any]]] = []
    current: list[dict[str, Any]] = []
    previous_point: tuple[float, float] | None = None
    for pair in pairs:
        current_point = point(pair)
        distance = math.dist(previous_point, current_point) if previous_point and current_point else 0.0
        force_boundary = False
        if current:
            current_types = {item.get("room_type") for item in current}
            if pair.get("room_type") in COMMERCIAL_TYPES or current_types <= COMMERCIAL_TYPES:
                force_boundary = True
        if current and (distance > threshold or force_boundary):
            clusters.append(current)
            current = []
        current.append(pair)
        previous_point = current_point
    if current:
        clusters.append(current)
    return clusters


def room_type_counts(cluster: list[dict[str, Any]]) -> Counter[str]:
    return Counter(str(pair.get("room_type") or "unknown") for pair in cluster)


def area_sum(cluster: list[dict[str, Any]]) -> float:
    return round(sum(float(pair.get("area_m2") or 0) for pair in cluster), 2)


def infer_room_mix(types: Counter[str]) -> str:
    living = sum(types.get(item, 0) for item in LIVING_TYPES)
    bedrooms = sum(types.get(item, 0) for item in BEDROOM_TYPES)
    if types.get("dukkan", 0):
        return "commercial"
    if living and bedrooms:
        return f"{bedrooms}+1"
    if types.get("salon_mutfak", 0):
        return "1+0"
    if living:
        return "living_only"
    if bedrooms:
        return f"{bedrooms}+0"
    return "unknown"


def infer_unit_type(types: Counter[str], area_m2: float) -> str:
    if types.get("dukkan", 0):
        return "dukkan"
    if types.get("depo", 0) and len(types) <= 2:
        return "depo"
    if set(types) <= SERVICE_TYPES:
        return "service_or_core"
    if area_m2 >= 140 and not any(types.get(item, 0) for item in LIVING_TYPES):
        return "large_nonresidential"
    mix = infer_room_mix(types)
    if mix in {"commercial", "unknown", "living_only"}:
        return mix
    return f"daire_{mix}"


def confidence_for_cluster(types: Counter[str], area_m2: float, room_count: int, notes: list[str]) -> float:
    score = 0.35
    if any(types.get(item, 0) for item in LIVING_TYPES):
        score += 0.2
    if any(types.get(item, 0) for item in BEDROOM_TYPES):
        score += 0.14
    if any(types.get(item, 0) for item in {"banyo", "wc"}):
        score += 0.12
    if any(types.get(item, 0) for item in {"antre", "hol"}):
        score += 0.08
    if 25 <= area_m2 <= 180:
        score += 0.08
    if 3 <= room_count <= 9:
        score += 0.05
    if types.get("dukkan", 0):
        score = max(score, 0.74 if area_m2 >= 20 else 0.55)
    if room_count <= 2 and not types.get("dukkan", 0):
        notes.append("Az odali aday; baska adayla birlesmesi gerekebilir.")
        score -= 0.15
    if set(types) <= SERVICE_TYPES:
        notes.append("Sadece servis/cekirdek mekanlari iceriyor.")
        score -= 0.25
    return round(max(0.1, min(0.95, score)), 2)


def candidate_from_cluster(
    plan_key: str,
    index: int,
    cluster: list[dict[str, Any]],
    threshold: float,
) -> dict[str, Any]:
    points = [point(pair) for pair in cluster]
    points = [item for item in points if item is not None]
    types = room_type_counts(cluster)
    area_m2 = area_sum(cluster)
    notes: list[str] = []
    unit_type = infer_unit_type(types, area_m2)
    confidence = confidence_for_cluster(types, area_m2, len(cluster), notes)
    cx, cy = center(points)
    return {
        "candidate_key": f"{plan_key}-SEQ-{index:03d}",
        "method": "sequence_cluster",
        "unit_type": unit_type,
        "room_mix": infer_room_mix(types),
        "area_m2": area_m2,
        "room_count": len(cluster),
        "living_count": sum(types.get(item, 0) for item in LIVING_TYPES),
        "bedroom_count": sum(types.get(item, 0) for item in BEDROOM_TYPES),
        "wet_count": sum(types.get(item, 0) for item in {"banyo", "wc", "dus", "lavabo"}),
        "service_count": sum(types.get(item, 0) for item in SERVICE_TYPES),
        "center": [None if cx is None else round(cx, 3), None if cy is None else round(cy, 3)],
        "bbox": bbox(points),
        "room_types": dict(types),
        "confidence_score": confidence,
        "review_notes": notes,
        "cluster_threshold": round(threshold, 3),
        "rooms": [
            {
                "room_name": pair.get("room_name"),
                "room_type": pair.get("room_type"),
                "area_m2": pair.get("area_m2"),
                "point": pair.get("room_point") or pair.get("area_point"),
                "pair_quality": pair.get("pair_quality"),
            }
            for pair in cluster
        ],
    }


def candidate_from_net_label(plan_key: str, index: int, area: float) -> dict[str, Any]:
    if area >= 120:
        unit_type = "large_unit_or_commercial"
    elif area < 45:
        unit_type = "small_unit"
    else:
        unit_type = "net_area_unit"
    return {
        "candidate_key": f"{plan_key}-NET-{index:03d}",
        "method": "net_area_label",
        "unit_type": unit_type,
        "room_mix": "net_label_only",
        "area_m2": round(float(area), 2),
        "room_count": 0,
        "living_count": 0,
        "bedroom_count": 0,
        "wet_count": 0,
        "service_count": 0,
        "center": [None, None],
        "bbox": None,
        "room_types": {},
        "confidence_score": 0.78,
        "review_notes": ["NET etiketi oda listesine baglanamadi; alan adayi olarak tutuldu."],
        "cluster_threshold": None,
        "rooms": [],
    }


def plausible_cluster_candidate(candidate: dict[str, Any]) -> bool:
    if candidate["unit_type"] in {"dukkan", "depo"}:
        return candidate["area_m2"] >= 15
    if candidate["unit_type"] in {"service_or_core", "unknown"}:
        return candidate["area_m2"] >= 25 and candidate["room_count"] >= 4
    return candidate["area_m2"] >= 20


def proposal_totals_by_parcel(proposal_data: dict[str, Any]) -> dict[str, dict[str, Any]]:
    by_key: dict[str, dict[str, Any]] = {}
    for record in proposal_data.get("records", []):
        key = record.get("parcel_key")
        if not key:
            continue
        owner = int(record.get("owner_units_total") or 0)
        contractor = int(record.get("contractor_units_total") or 0)
        total = owner + contractor
        current = by_key.get(key)
        if current is None or total > current["offer_total_units"]:
            by_key[key] = {
                "offer_owner_units": owner,
                "offer_contractor_units": contractor,
                "offer_total_units": total,
                "offer_relative_path": record.get("relative_path"),
                "offer_confidence_score": record.get("confidence_score"),
            }
    return by_key


def match_status(primary_count: int, offer_total: int | None) -> tuple[str, int | None]:
    if offer_total is None or offer_total == 0:
        return "no_offer_unit_total", None
    delta = primary_count - offer_total
    if delta == 0:
        return "unit_count_exact", delta
    if abs(delta) <= 2:
        return "unit_count_close", delta
    if delta > 2:
        return "cad_more_units_than_offer", delta
    return "cad_fewer_units_than_offer", delta


def plan_findings(plan: dict[str, Any]) -> list[dict[str, Any]]:
    findings: list[dict[str, Any]] = []
    def add(severity: str, code: str, message: str, recommendation: str) -> None:
        findings.append(
            {
                "severity": severity,
                "code": code,
                "message": message,
                "recommendation": recommendation,
            }
        )

    if plan["primary_candidate_count"] == 0:
        add("risk", "cad_unit_candidates_missing", "CAD planindan bagimsiz bolum adayi uretilemedi.", "Plan semantik katmani elle kontrol edilmeli.")
    if plan["offer_match_status"] in {"cad_more_units_than_offer", "cad_fewer_units_than_offer"}:
        add(
            "review",
            "cad_offer_unit_count_delta",
            f"CAD birincil aday sayisi {plan['primary_candidate_count']}, teklif toplam birim sayisi {plan.get('offer_total_units')}; fark {plan.get('unit_count_delta')}.",
            "Teklif dagilimi ile CAD adaylari birlikte incelenmeli.",
        )
    elif plan["offer_match_status"] == "unit_count_close":
        add(
            "info",
            "cad_offer_unit_count_close",
            f"CAD/teklif birim sayisi yakin; fark {plan.get('unit_count_delta')}.",
            "Yakın fark oda gruplariyla dogrulanmali.",
        )
    if plan["net_label_candidate_count"] and plan["sequence_candidate_count"]:
        delta = plan["sequence_candidate_count"] - plan["net_label_candidate_count"]
        if abs(delta) > max(3, plan["net_label_candidate_count"] * 0.35):
            add(
                "review",
                "cad_net_sequence_count_delta",
                f"NET etiketi sayisi {plan['net_label_candidate_count']}, oda kumesi sayisi {plan['sequence_candidate_count']}; fark {delta}.",
                "NET etiketlerinin hangi oda kumelerine baglandigi manuel eslestirilmeli.",
            )
    low_conf = sum(1 for item in plan["candidates"] if item["confidence_score"] < 0.45)
    if low_conf:
        add(
            "info",
            "cad_low_confidence_candidates",
            f"{low_conf} CAD adayinin guven skoru dusuk.",
            "Dusuk guvenli adaylar son karar icin kullanilmamali.",
        )
    return findings


def confidence_for_plan(plan: dict[str, Any]) -> float:
    score = 0.45
    if plan["net_label_candidate_count"]:
        score += 0.22
    if plan["sequence_candidate_count"]:
        score += 0.12
    if plan["offer_match_status"] == "unit_count_exact":
        score += 0.14
    elif plan["offer_match_status"] == "unit_count_close":
        score += 0.08
    elif plan["offer_match_status"] in {"cad_more_units_than_offer", "cad_fewer_units_than_offer"}:
        score -= 0.1
    if plan["primary_candidate_count"] == 0:
        score -= 0.25
    return round(max(0.1, min(0.95, score)), 2)


def analyze_plan(item: dict[str, Any], offer_totals: dict[str, dict[str, Any]]) -> dict[str, Any]:
    parcel_key = parcel_key_from_text(item.get("relative_path"))
    plan_key = (parcel_key or "UNKNOWN").replace("-", "_")
    pairs = item.get("room_area_pairs") or []
    threshold = cluster_threshold(pairs)
    clusters = split_sequence_clusters(pairs, threshold)
    sequence_candidates = [
        candidate_from_cluster(plan_key, idx + 1, cluster, threshold)
        for idx, cluster in enumerate(clusters)
    ]
    sequence_candidates = [item for item in sequence_candidates if plausible_cluster_candidate(item)]
    net_areas = [float(value) for value in item.get("net_area_labels_m2") or []]
    net_candidates = [candidate_from_net_label(plan_key, idx + 1, area) for idx, area in enumerate(net_areas)]

    primary_method = "net_area_label" if len(net_candidates) >= 2 else "sequence_cluster"
    primary_candidate_count = len(net_candidates) if primary_method == "net_area_label" else len(sequence_candidates)
    offer = offer_totals.get(parcel_key or "", {})
    offer_total = offer.get("offer_total_units")
    status, delta = match_status(primary_candidate_count, offer_total)
    candidates = net_candidates + sequence_candidates
    plan = {
        "parcel_key": parcel_key,
        "relative_path": item.get("relative_path"),
        "primary_method": primary_method,
        "primary_candidate_count": primary_candidate_count,
        "net_label_candidate_count": len(net_candidates),
        "sequence_candidate_count": len(sequence_candidates),
        "candidate_count": len(candidates),
        "room_area_pair_count": item.get("room_area_pair_count"),
        "total_detected_room_area_m2": item.get("total_detected_room_area_m2"),
        "net_label_sum_m2": round(sum(net_areas), 2) if net_areas else None,
        "cluster_threshold": round(threshold, 3),
        "floor_titles": item.get("floor_titles") or [],
        "offer_owner_units": offer.get("offer_owner_units"),
        "offer_contractor_units": offer.get("offer_contractor_units"),
        "offer_total_units": offer_total,
        "offer_relative_path": offer.get("offer_relative_path"),
        "offer_match_status": status,
        "unit_count_delta": delta,
        "candidates": candidates,
    }
    plan["findings"] = plan_findings(plan)
    plan["confidence_score"] = confidence_for_plan(plan)
    return plan


def build_analysis(semantic_data: list[dict[str, Any]], proposal_data: dict[str, Any]) -> dict[str, Any]:
    offer_totals = proposal_totals_by_parcel(proposal_data)
    plans = [analyze_plan(item, offer_totals) for item in semantic_data]
    finding_counts = Counter()
    severity_counts = Counter()
    match_counts = Counter(plan["offer_match_status"] for plan in plans)
    for plan in plans:
        for finding in plan["findings"]:
            finding_counts[finding["code"]] += 1
            severity_counts[finding["severity"]] += 1
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": str(SEMANTIC_JSON),
        "proposal_source": str(PROPOSAL_V2_JSON),
        "plan_count": len(plans),
        "candidate_count": sum(plan["candidate_count"] for plan in plans),
        "primary_candidate_count": sum(plan["primary_candidate_count"] for plan in plans),
        "finding_count": sum(len(plan["findings"]) for plan in plans),
        "match_counts": dict(match_counts),
        "finding_code_counts": dict(finding_counts.most_common()),
        "finding_severity_counts": dict(sorted(severity_counts.items())),
        "plans": plans,
    }


def write_plan_csv(analysis: dict[str, Any]) -> None:
    fields = [
        "parcel_key",
        "relative_path",
        "primary_method",
        "primary_candidate_count",
        "net_label_candidate_count",
        "sequence_candidate_count",
        "candidate_count",
        "room_area_pair_count",
        "total_detected_room_area_m2",
        "net_label_sum_m2",
        "offer_total_units",
        "offer_match_status",
        "unit_count_delta",
        "confidence_score",
        "finding_count",
    ]
    with OUT_PLAN_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for plan in analysis["plans"]:
            writer.writerow({field: plan.get(field) for field in fields} | {"finding_count": len(plan["findings"])})


def write_candidate_csv(analysis: dict[str, Any]) -> None:
    fields = [
        "parcel_key",
        "relative_path",
        "candidate_key",
        "method",
        "unit_type",
        "room_mix",
        "area_m2",
        "room_count",
        "living_count",
        "bedroom_count",
        "wet_count",
        "confidence_score",
        "center_x",
        "center_y",
        "room_types",
        "review_notes",
    ]
    with OUT_CANDIDATE_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for plan in analysis["plans"]:
            for candidate in plan["candidates"]:
                center_point = candidate.get("center") or [None, None]
                writer.writerow(
                    {
                        "parcel_key": plan.get("parcel_key"),
                        "relative_path": plan.get("relative_path"),
                        "candidate_key": candidate.get("candidate_key"),
                        "method": candidate.get("method"),
                        "unit_type": candidate.get("unit_type"),
                        "room_mix": candidate.get("room_mix"),
                        "area_m2": candidate.get("area_m2"),
                        "room_count": candidate.get("room_count"),
                        "living_count": candidate.get("living_count"),
                        "bedroom_count": candidate.get("bedroom_count"),
                        "wet_count": candidate.get("wet_count"),
                        "confidence_score": candidate.get("confidence_score"),
                        "center_x": center_point[0],
                        "center_y": center_point[1],
                        "room_types": json.dumps(candidate.get("room_types") or {}, ensure_ascii=False),
                        "review_notes": " | ".join(candidate.get("review_notes") or []),
                    }
                )


def write_findings_csv(analysis: dict[str, Any]) -> None:
    fields = ["parcel_key", "relative_path", "severity", "code", "message", "recommendation"]
    with OUT_FINDINGS_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for plan in analysis["plans"]:
            for finding in plan["findings"]:
                writer.writerow(
                    {
                        "parcel_key": plan.get("parcel_key"),
                        "relative_path": plan.get("relative_path"),
                        **finding,
                    }
                )


def write_markdown(analysis: dict[str, Any]) -> None:
    lines = [
        "# CadUnitMatcher Report",
        "",
        f"Generated at: {analysis['generated_at']}",
        "",
        "This report groups semantic CAD room/area pairs into independent-unit candidates and compares primary candidate counts with ProposalPDFExtractor v2 unit totals when available.",
        "",
        "## Summary",
        "",
        f"- CAD plans analyzed: {analysis['plan_count']}",
        f"- Unit candidates produced: {analysis['candidate_count']}",
        f"- Primary candidate count: {analysis['primary_candidate_count']}",
        f"- Findings: {analysis['finding_count']}",
        "",
        "## Offer Match Counts",
        "",
    ]
    for key, count in analysis["match_counts"].items():
        lines.append(f"- {key}: {count}")
    lines.extend(["", "## Finding Severity Counts", ""])
    for key, count in analysis["finding_severity_counts"].items():
        lines.append(f"- {key}: {count}")
    lines.extend(
        [
            "",
            "## Plan Table",
            "",
            "| Parcel | Method | Primary | NET | Cluster | Offer | Status | Delta | Confidence | Findings |",
            "|---|---|---:|---:|---:|---:|---|---:|---:|---:|",
        ]
    )
    for plan in analysis["plans"]:
        lines.append(
            "| "
            + " | ".join(
                [
                    str(plan.get("parcel_key") or "-"),
                    plan["primary_method"],
                    str(plan["primary_candidate_count"]),
                    str(plan["net_label_candidate_count"]),
                    str(plan["sequence_candidate_count"]),
                    str(plan.get("offer_total_units") or "-"),
                    plan["offer_match_status"],
                    str(plan.get("unit_count_delta") if plan.get("unit_count_delta") is not None else "-"),
                    str(plan["confidence_score"]),
                    str(len(plan["findings"])),
                ]
            )
            + " |"
        )
    lines.extend(["", "## Review Findings", ""])
    for plan in analysis["plans"]:
        for finding in plan["findings"]:
            if finding["severity"] in {"risk", "review"}:
                lines.append(f"- {plan.get('parcel_key')}: {finding['severity']} / {finding['code']} - {finding['message']}")
    lines.extend(
        [
            "",
            "## Method Notes",
            "",
            "- `net_area_label` is used as the primary count when a drawing contains multiple NET labels.",
            "- `sequence_cluster` groups ordered room/area pairs by CAD coordinate jumps and commercial-unit boundaries.",
            "- Candidates are not final legal independent units. They are machine suggestions for review and reconciliation.",
            "- The next refinement should connect NET labels back to room clusters and detect repeated typical floors.",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    semantic_data = load_json(SEMANTIC_JSON, [])
    proposal_data = load_json(PROPOSAL_V2_JSON, {})
    analysis = build_analysis(semantic_data, proposal_data)
    write_json(OUT_JSON, analysis)
    write_plan_csv(analysis)
    write_candidate_csv(analysis)
    write_findings_csv(analysis)
    write_markdown(analysis)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_PLAN_CSV}")
    print(f"Wrote {OUT_CANDIDATE_CSV}")
    print(f"Wrote {OUT_FINDINGS_CSV}")
    print(f"Wrote {OUT_MD}")
    print(
        json.dumps(
            {
                "plan_count": analysis["plan_count"],
                "candidate_count": analysis["candidate_count"],
                "primary_candidate_count": analysis["primary_candidate_count"],
                "finding_count": analysis["finding_count"],
                "match_counts": analysis["match_counts"],
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
