from __future__ import annotations

import csv
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
IN_JSON = ANALYSIS_ROOT / "proposal_v2" / "proposal_v2_analysis.json"
OUT = ANALYSIS_ROOT / "contract_rules"

OUT_JSON = OUT / "contract_rule_analysis.json"
OUT_SUMMARY_CSV = OUT / "contract_rule_summary.csv"
OUT_FINDINGS_CSV = OUT / "contract_rule_findings.csv"
OUT_MD = OUT / "CONTRACT_RULE_REPORT.md"


SEVERITY_ORDER = {
    "blocking": 4,
    "risk": 3,
    "review": 2,
    "info": 1,
}

PARSER_WARNING_RULES = {
    "proposal_title_body_mismatch": (
        "blocking",
        45,
        "Ada-parsel kimligi uyumsuz",
        "Teklif basligi ile govde ada-parsel kimligi uyusmuyor.",
        "Sozlesme taslagi hazirlanmadan once belge kimligi elle dogrulanmali.",
    ),
    "proposal_distribution_missing": (
        "risk",
        28,
        "Hak dagilimi okunamadi",
        "Tekliften kat/birim dagilimi net okunamadi.",
        "Teklif PDF'i ve mimari dagilim tablosu birlikte incelenmeli.",
    ),
    "proposal_participation_payment": (
        "risk",
        35,
        "Katilim payi / odeme sarti",
        "Teklif finansal odeme veya katilim payi sarti iceriyor.",
        "Odeme sarti tutar, vade ve taraf sorumlulugu ile hukuk kontrolune alinmali.",
    ),
    "proposal_multiple_alternatives": (
        "review",
        20,
        "Birden fazla alternatif",
        "Teklif birden fazla mimari veya ticari alternatif iceriyor.",
        "Onaylanacak alternatif secilmeden sozlesme maddesi kesinlestirilmemeli.",
    ),
    "proposal_rolove_pending": (
        "review",
        18,
        "Rolove sonrasi netlesme",
        "Teklifte alan veya dagilim bilgisinin rolove sonrasi netlesecegi belirtiliyor.",
        "Rolove sonucu sisteme eklenmeden nihai alan kabul edilmemeli.",
    ),
}

FINANCIAL_RULES = {
    "katilim_payi": (
        "risk",
        35,
        "Katilim payi",
        "Teklif katilim payi veya ek odeme sarti iceriyor.",
        "Finansal sarti tutar, odeme zamani ve taraf bazinda karar kaydina bagla.",
    ),
    "kira_destegi": (
        "review",
        16,
        "Kira destegi",
        "Teklif kira destegi ifadesi iceriyor.",
        "Kira destegi tutari ve baslangic/bitis kosullari netlestirilmeli.",
    ),
    "satis_bedeli_paylasimi": (
        "review",
        18,
        "Satis bedeli paylasimi",
        "Teklif satilacak bagimsiz bolum bedelinin paylasimini iceriyor.",
        "Paylasim orani, hak sahipleri ve mahsup kosulu ayrica dogrulanmali.",
    ),
    "muteahhite_odeme_yok": (
        "info",
        4,
        "Muteahhite odeme yok",
        "Teklif muteahhite ek odeme olmadigini belirtiyor.",
        "Bu ifade olumlu sinyal olarak saklanmali fakat nihai metinde korunmali.",
    ),
}

CONDITION_RULES = {
    "belediye_degisiklik_ihtimali": (
        "review",
        18,
        "Belediye degisikligi ihtimali",
        "Teklif belediye veya mimari revizyon ihtimali iceriyor.",
        "Revizyon yetkisi ve hak dagilimina etkisi sozlesmede sinirlandirilmali.",
    ),
    "rolove_bekleniyor": (
        "review",
        18,
        "Rolove bekleniyor",
        "Teklifte rolove sonrasi netlesecek alan/dagilim sarti var.",
        "Rolove onayi olmadan nihai dagilim kabul edilmemeli.",
    ),
    "multiple_alternatives": (
        "review",
        20,
        "Alternatif secimi gerekiyor",
        "Teklif birden fazla alternatif icin kosul maddesi iceriyor.",
        "Secilen alternatif karar kaydina ve sozlesme maddesine baglanmali.",
    ),
    "iskan_edilebilir_alan": (
        "review",
        12,
        "Iskan edilebilir alan notu",
        "Teklif iskan edilebilir alan veya benzeri teknik netlesme sarti iceriyor.",
        "Teknik ekibe kontrol gorevi acilmali.",
    ),
    "alan_telafi": (
        "review",
        14,
        "Alan telafi mekanizmasi",
        "Teklif alan kaybi telafisi veya mahsup mekanizmasi iceriyor.",
        "Telafi hesabi kanitli tabloyla dogrulanmali.",
    ),
    "hak_kaybi_yok": (
        "info",
        3,
        "Hak kaybi yok beyanı",
        "Teklif hak kaybi olmadigini belirten bir beyan iceriyor.",
        "Beyan sayisal dagilim ve alan verisiyle desteklenmeli.",
    ),
}


@dataclass
class Finding:
    severity: str
    code: str
    title: str
    message: str
    evidence: str | None
    recommendation: str
    weight: int
    source: str
    raw: dict[str, Any] = field(default_factory=dict)

    def as_dict(self) -> dict[str, Any]:
        return {
            "severity": self.severity,
            "code": self.code,
            "title": self.title,
            "message": self.message,
            "evidence": self.evidence,
            "recommendation": self.recommendation,
            "weight": self.weight,
            "source": self.source,
            "raw": self.raw,
        }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def safe_int(value: Any) -> int:
    if value is None:
        return 0
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def safe_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def excerpt(term: dict[str, Any]) -> str | None:
    value = term.get("excerpt")
    if not value:
        return None
    return str(value).strip()[:420]


def add_finding(findings: list[Finding], finding: Finding) -> None:
    key = (finding.severity, finding.code, finding.evidence or finding.message)
    existing = {(item.severity, item.code, item.evidence or item.message) for item in findings}
    if key not in existing:
        findings.append(finding)


def parser_warning_findings(record: dict[str, Any]) -> list[Finding]:
    out: list[Finding] = []
    for warning in record.get("parser_warnings") or []:
        code = warning.get("code") or "parser_warning"
        severity, weight, title, message, recommendation = PARSER_WARNING_RULES.get(
            code,
            (
                "review" if warning.get("level") == "review" else "risk",
                15,
                "Parser uyarisi",
                warning.get("message") or "Teklif parser uyarisi uretildi.",
                "Uyari elle kontrol edilmeli.",
            ),
        )
        out.append(
            Finding(
                severity=severity,
                code=f"parser_{code}",
                title=title,
                message=message,
                evidence=warning.get("message"),
                recommendation=recommendation,
                weight=weight,
                source="parser_warning",
                raw=warning,
            )
        )
    return out


def financial_findings(record: dict[str, Any]) -> list[Finding]:
    out: list[Finding] = []
    max_area_loss = None
    max_area_term = None
    for term in record.get("financial_terms") or []:
        label = term.get("label")
        if label == "alan_kuculme_orani":
            percent = safe_int(term.get("percent"))
            if max_area_loss is None or percent > max_area_loss:
                max_area_loss = percent
                max_area_term = term
            continue
        if label not in FINANCIAL_RULES:
            continue
        severity, weight, title, message, recommendation = FINANCIAL_RULES[label]
        out.append(
            Finding(
                severity=severity,
                code=f"financial_{label}",
                title=title,
                message=message,
                evidence=excerpt(term),
                recommendation=recommendation,
                weight=weight,
                source="financial_terms",
                raw=term,
            )
        )

    if max_area_loss is not None:
        severity = "risk" if max_area_loss >= 10 else "review"
        weight = 26 if severity == "risk" else 16
        out.append(
            Finding(
                severity=severity,
                code="financial_area_loss_ratio",
                title="Alan kuculme orani",
                message=f"Teklif alan kuculme oranini %{max_area_loss} olarak belirtiyor.",
                evidence=excerpt(max_area_term or {}),
                recommendation="Alan kaybi ve telafi hesabi hak sahipleri bazinda sayisal tabloyla dogrulanmali.",
                weight=weight,
                source="financial_terms",
                raw=max_area_term or {},
            )
        )
    return out


def condition_findings(record: dict[str, Any]) -> list[Finding]:
    out: list[Finding] = []
    for term in record.get("condition_terms") or []:
        label = term.get("label")
        if label not in CONDITION_RULES:
            continue
        severity, weight, title, message, recommendation = CONDITION_RULES[label]
        out.append(
            Finding(
                severity=severity,
                code=f"condition_{label}",
                title=title,
                message=message,
                evidence=excerpt(term),
                recommendation=recommendation,
                weight=weight,
                source="condition_terms",
                raw=term,
            )
        )
    return out


def distribution_findings(record: dict[str, Any]) -> list[Finding]:
    out: list[Finding] = []
    owner_units = safe_int(record.get("owner_units_total"))
    contractor_units = safe_int(record.get("contractor_units_total"))
    existing_units = safe_int(record.get("existing_independent_units"))
    distribution_count = safe_int(record.get("distribution_item_count"))
    alternative_count = safe_int(record.get("alternative_item_count"))
    total_units = owner_units + contractor_units

    if distribution_count == 0 and alternative_count == 0:
        out.append(
            Finding(
                severity="risk",
                code="distribution_missing",
                title="Dagitim tablosu yok",
                message="Tekliften hak dagilimi veya alternatif dagilim okunamadi.",
                evidence=None,
                recommendation="Dagitim tablosu olmadan sozlesme kararina gecilmemeli.",
                weight=28,
                source="distribution_terms",
                raw={},
            )
        )
    elif distribution_count > 0 and total_units == 0:
        out.append(
            Finding(
                severity="review",
                code="distribution_without_roles",
                title="Dagitim var fakat taraf rolleri yok",
                message="Teklifte daire/kat dagilimi var ama mal sahibi ve muteahhit toplam rolleri net degil.",
                evidence=None,
                recommendation="Parser sinyali elle incelenerek taraf bazli dagilim cikarilmali.",
                weight=18,
                source="distribution_terms",
                raw={},
            )
        )

    if alternative_count > 0:
        out.append(
            Finding(
                severity="review",
                code="distribution_alternatives_present",
                title="Alternatif dagilim var",
                message=f"Teklif {alternative_count} alternatif dagilim maddesi iceriyor.",
                evidence=None,
                recommendation="Karar verilen alternatif secilip digerleri sozlesmeden ayrilmali.",
                weight=18,
                source="alternative_terms",
                raw={"alternative_item_count": alternative_count},
            )
        )

    if total_units > 0:
        contractor_share = contractor_units / total_units
        if contractor_share >= 0.60:
            out.append(
                Finding(
                    severity="risk",
                    code="contractor_share_high",
                    title="Muteahhit payi yuksek",
                    message=f"Muteahhit birim payi yaklasik %{contractor_share * 100:.1f}.",
                    evidence=None,
                    recommendation="Pay oraninin emsal, maliyet ve arsa payi ile uyumu hukuk/finans kontrolune alinmali.",
                    weight=30,
                    source="distribution_terms",
                    raw={"owner_units_total": owner_units, "contractor_units_total": contractor_units},
                )
            )
        elif contractor_share >= 0.50:
            out.append(
                Finding(
                    severity="review",
                    code="contractor_share_review",
                    title="Muteahhit payi inceleme gerektiriyor",
                    message=f"Muteahhit birim payi yaklasik %{contractor_share * 100:.1f}.",
                    evidence=None,
                    recommendation="Pay orani karar notunda gerekcelendirilmeli.",
                    weight=18,
                    source="distribution_terms",
                    raw={"owner_units_total": owner_units, "contractor_units_total": contractor_units},
                )
            )

        if existing_units and owner_units:
            if owner_units < existing_units:
                out.append(
                    Finding(
                        severity="review",
                        code="owner_units_below_existing",
                        title="Mal sahibi birim sayisi mevcut sayidan dusuk",
                        message=f"Mevcut {existing_units} bagimsiz bolume karsilik mal sahibi dagilimi {owner_units} birim.",
                        evidence=None,
                        recommendation="Birim birlestirme, alan telafisi veya bedel mahsup gerekcesi kontrol edilmeli.",
                        weight=20,
                        source="distribution_terms",
                        raw={"existing_independent_units": existing_units, "owner_units_total": owner_units},
                    )
                )
            elif owner_units > existing_units:
                out.append(
                    Finding(
                        severity="info",
                        code="owner_units_above_existing",
                        title="Mal sahibi birim sayisi mevcut sayidan yuksek",
                        message=f"Mevcut {existing_units} bagimsiz bolume karsilik mal sahibi dagilimi {owner_units} birim.",
                        evidence=None,
                        recommendation="Artis olumlu sinyal olabilir; yine de alan ve tip dengesi dogrulanmali.",
                        weight=4,
                        source="distribution_terms",
                        raw={"existing_independent_units": existing_units, "owner_units_total": owner_units},
                    )
                )
    return out


MONTHS = {
    "ocak": 1,
    "subat": 2,
    "mart": 3,
    "nisan": 4,
    "mayis": 5,
    "haziran": 6,
    "temmuz": 7,
    "agustos": 8,
    "eylul": 9,
    "ekim": 10,
    "kasim": 11,
    "aralik": 12,
}


def normalize_ascii(value: str) -> str:
    return (
        value.casefold()
        .replace("ı", "i")
        .replace("İ", "i")
        .replace("ş", "s")
        .replace("Ş", "s")
        .replace("ğ", "g")
        .replace("Ğ", "g")
        .replace("ü", "u")
        .replace("Ü", "u")
        .replace("ö", "o")
        .replace("Ö", "o")
        .replace("ç", "c")
        .replace("Ç", "c")
    )


def proposal_month(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    text = normalize_ascii(value)
    year_match = re.search(r"(20\d{2})", text)
    if not year_match:
        return None
    year = int(year_match.group(1))
    for name, month in MONTHS.items():
        if name in text:
            return year, month
    return None


def meta_findings(record: dict[str, Any], today: date, duplicate_count: int) -> list[Finding]:
    out: list[Finding] = []
    confidence = safe_float(record.get("confidence_score"))
    if confidence is not None:
        if confidence < 0.55:
            severity, weight = "risk", 24
        elif confidence < 0.70:
            severity, weight = "review", 14
        else:
            severity, weight = None, 0
        if severity:
            out.append(
                Finding(
                    severity=severity,
                    code="low_parser_confidence",
                    title="Parser guveni dusuk",
                    message=f"Teklif parser guven skoru {confidence:.2f}.",
                    evidence=None,
                    recommendation="Bu teklif manuel okuma ile onaylanmali.",
                    weight=weight,
                    source="proposal_record",
                    raw={"confidence_score": confidence},
                )
            )

    if not record.get("otopark"):
        out.append(
            Finding(
                severity="review",
                code="parking_missing",
                title="Otopark kosulu okunamadi",
                message="Tekliften kapali otopark kat/etiket bilgisi okunamadi.",
                evidence=None,
                recommendation="Otopark yeri, adet ve tahsis kosulu elle kontrol edilmeli.",
                weight=10,
                source="proposal_record",
                raw={},
            )
        )

    if duplicate_count > 1:
        out.append(
            Finding(
                severity="review",
                code="duplicate_proposal_for_parcel",
                title="Ayni parsel icin birden fazla teklif kaydi",
                message=f"Bu parsel icin {duplicate_count} v2 teklif kaydi bulundu.",
                evidence=record.get("relative_path"),
                recommendation="Teklif surumu/tekrari ayrilmali ve gecerli PDF isaretlenmeli.",
                weight=14,
                source="proposal_record",
                raw={"duplicate_count": duplicate_count},
            )
        )

    month = proposal_month(record.get("proposal_date"))
    if month and month > (today.year, today.month):
        out.append(
            Finding(
                severity="review",
                code="proposal_date_future",
                title="Teklif tarihi gelecek ayda",
                message=f"Teklif tarihi {record.get('proposal_date')} olarak okunmus; bugun {today.isoformat()}.",
                evidence=record.get("proposal_date"),
                recommendation="Tarih OCR/parser hatasi veya ileri tarihli teklif olup olmadigi kontrol edilmeli.",
                weight=12,
                source="proposal_record",
                raw={"proposal_date": record.get("proposal_date"), "current_date": today.isoformat()},
            )
        )
    return out


def risk_level(score: int, findings: list[Finding]) -> str:
    if any(item.severity == "blocking" for item in findings):
        return "blocking"
    if score >= 70 or sum(1 for item in findings if item.severity == "risk") >= 2:
        return "high"
    if score >= 35 or any(item.severity == "risk" for item in findings):
        return "medium"
    if score > 0:
        return "low"
    return "clear"


def decision_recommendation(level: str, findings: list[Finding]) -> str:
    codes = {item.code for item in findings}
    if level == "blocking":
        return "hold_identity_review"
    if "distribution_missing" in codes or "parser_proposal_distribution_missing" in codes:
        return "complete_distribution_before_contract"
    if level == "high":
        return "legal_financial_review_required"
    if level == "medium":
        return "manual_review_required"
    if level == "low":
        return "review_then_draft"
    return "draft_ready"


def evaluate_record(record: dict[str, Any], today: date, duplicate_count: int) -> dict[str, Any]:
    findings: list[Finding] = []
    for group in [
        parser_warning_findings(record),
        distribution_findings(record),
        financial_findings(record),
        condition_findings(record),
        meta_findings(record, today, duplicate_count),
    ]:
        for item in group:
            add_finding(findings, item)

    findings.sort(key=lambda item: (-SEVERITY_ORDER[item.severity], -item.weight, item.code))
    score = min(100, sum(item.weight for item in findings))
    counts = Counter(item.severity for item in findings)
    owner_units = safe_int(record.get("owner_units_total"))
    contractor_units = safe_int(record.get("contractor_units_total"))
    total_units = owner_units + contractor_units
    contractor_share = round((contractor_units / total_units) * 100, 2) if total_units else None
    level = risk_level(score, findings)
    return {
        "parcel_key": record.get("parcel_key"),
        "relative_path": record.get("relative_path"),
        "proposal_date": record.get("proposal_date"),
        "risk_score": score,
        "risk_level": level,
        "decision_recommendation": decision_recommendation(level, findings),
        "finding_count": len(findings),
        "blocking_count": counts.get("blocking", 0),
        "risk_count": counts.get("risk", 0),
        "review_count": counts.get("review", 0),
        "info_count": counts.get("info", 0),
        "owner_units_total": owner_units,
        "contractor_units_total": contractor_units,
        "total_units": total_units,
        "contractor_share_percent": contractor_share,
        "confidence_score": record.get("confidence_score"),
        "findings": [item.as_dict() for item in findings],
        "source_record": record,
    }


def build_analysis(data: dict[str, Any], today: date | None = None) -> dict[str, Any]:
    today = today or date.today()
    duplicate_counts = Counter(record.get("parcel_key") for record in data.get("records", []) if record.get("parcel_key"))
    evaluations = [
        evaluate_record(record, today, duplicate_counts.get(record.get("parcel_key"), 0))
        for record in data.get("records", [])
    ]
    level_counts = Counter(item["risk_level"] for item in evaluations)
    severity_counts = Counter()
    code_counts = Counter()
    for evaluation in evaluations:
        for finding in evaluation["findings"]:
            severity_counts[finding["severity"]] += 1
            code_counts[finding["code"]] += 1
    return {
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": str(IN_JSON),
        "current_date": today.isoformat(),
        "evaluation_count": len(evaluations),
        "finding_count": sum(item["finding_count"] for item in evaluations),
        "risk_level_counts": dict(sorted(level_counts.items())),
        "severity_counts": dict(sorted(severity_counts.items())),
        "top_finding_codes": dict(code_counts.most_common(20)),
        "evaluations": evaluations,
    }


def write_summary_csv(analysis: dict[str, Any]) -> None:
    fields = [
        "parcel_key",
        "relative_path",
        "proposal_date",
        "risk_level",
        "risk_score",
        "decision_recommendation",
        "finding_count",
        "blocking_count",
        "risk_count",
        "review_count",
        "info_count",
        "owner_units_total",
        "contractor_units_total",
        "total_units",
        "contractor_share_percent",
        "confidence_score",
    ]
    with OUT_SUMMARY_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for item in analysis["evaluations"]:
            writer.writerow({field: item.get(field) for field in fields})


def write_findings_csv(analysis: dict[str, Any]) -> None:
    fields = [
        "parcel_key",
        "relative_path",
        "risk_level",
        "risk_score",
        "severity",
        "code",
        "title",
        "message",
        "recommendation",
        "weight",
        "source",
        "evidence",
    ]
    with OUT_FINDINGS_CSV.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        for evaluation in analysis["evaluations"]:
            for finding in evaluation["findings"]:
                writer.writerow(
                    {
                        "parcel_key": evaluation.get("parcel_key"),
                        "relative_path": evaluation.get("relative_path"),
                        "risk_level": evaluation.get("risk_level"),
                        "risk_score": evaluation.get("risk_score"),
                        **{field: finding.get(field) for field in fields if field in finding},
                    }
                )


def write_markdown(analysis: dict[str, Any]) -> None:
    lines = [
        "# ContractRuleEngine Report",
        "",
        f"Generated at: {analysis['generated_at']}",
        f"Current date used for date checks: {analysis['current_date']}",
        "",
        "This report converts ProposalPDFExtractor v2 signals into contract review findings, risk scores, and decision recommendations.",
        "",
        "## Summary",
        "",
        f"- Proposal evaluations: {analysis['evaluation_count']}",
        f"- Contract findings: {analysis['finding_count']}",
        "",
        "## Risk Level Counts",
        "",
    ]
    for level, count in analysis["risk_level_counts"].items():
        lines.append(f"- {level}: {count}")

    lines.extend(["", "## Severity Counts", ""])
    for severity, count in analysis["severity_counts"].items():
        lines.append(f"- {severity}: {count}")

    lines.extend(
        [
            "",
            "## Evaluation Table",
            "",
            "| Parcel | Date | Risk | Score | Decision | Findings | Blocking | Risk | Review | Owner | Contractor | Contractor share |",
            "|---|---|---|---:|---|---:|---:|---:|---:|---:|---:|---:|",
        ]
    )
    for item in analysis["evaluations"]:
        share = item["contractor_share_percent"]
        share_text = "-" if share is None else f"{share:.2f}%"
        lines.append(
            "| "
            + " | ".join(
                [
                    str(item.get("parcel_key") or "-"),
                    str(item.get("proposal_date") or "-"),
                    item["risk_level"],
                    str(item["risk_score"]),
                    item["decision_recommendation"],
                    str(item["finding_count"]),
                    str(item["blocking_count"]),
                    str(item["risk_count"]),
                    str(item["review_count"]),
                    str(item["owner_units_total"]),
                    str(item["contractor_units_total"]),
                    share_text,
                ]
            )
            + " |"
        )

    lines.extend(["", "## Highest Priority Findings", ""])
    high_findings: list[tuple[dict[str, Any], dict[str, Any]]] = []
    for evaluation in analysis["evaluations"]:
        for finding in evaluation["findings"]:
            if finding["severity"] in {"blocking", "risk"}:
                high_findings.append((evaluation, finding))
    high_findings.sort(key=lambda pair: (-SEVERITY_ORDER[pair[1]["severity"]], -pair[1]["weight"]))
    if not high_findings:
        lines.append("- No blocking/risk findings.")
    else:
        for evaluation, finding in high_findings[:20]:
            lines.append(
                f"- {evaluation.get('parcel_key')}: {finding['severity']} / {finding['code']} - {finding['message']}"
            )

    lines.extend(
        [
            "",
            "## Output Files",
            "",
            "- `contract_rule_analysis.json`",
            "- `contract_rule_summary.csv`",
            "- `contract_rule_findings.csv`",
            "- `CONTRACT_RULE_REPORT.md`",
        ]
    )
    OUT_MD.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    data = load_json(IN_JSON)
    analysis = build_analysis(data)
    write_json(OUT_JSON, analysis)
    write_summary_csv(analysis)
    write_findings_csv(analysis)
    write_markdown(analysis)
    print(f"Wrote {OUT_JSON}")
    print(f"Wrote {OUT_SUMMARY_CSV}")
    print(f"Wrote {OUT_FINDINGS_CSV}")
    print(f"Wrote {OUT_MD}")
    print(json.dumps({k: analysis[k] for k in ["evaluation_count", "finding_count", "risk_level_counts", "severity_counts"]}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
