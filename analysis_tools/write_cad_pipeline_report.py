from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
CAD_ROOT = ANALYSIS_ROOT / "cad_pipeline"
REPORT = CAD_ROOT / "CAD_PIPELINE_REPORT.md"


def load_json(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def prop_counts(obj: dict) -> str:
    if not obj:
        return ""
    return ", ".join(f"{k}={v}" for k, v in list(obj.items())[:8])


def main() -> None:
    mapping = load_json(CAD_ROOT / "cad_mapping.json", [])
    analyses = load_json(CAD_ROOT / "dxf_analysis.json", [])
    oda_log = load_json(CAD_ROOT / "oda_conversion_log.json", {})
    renders = load_json(CAD_ROOT / "safe_render_outputs.json", [])

    converted = [a for a in analyses if a.get("dxf_exists")]
    errors = [a for a in analyses if a.get("errors")]
    total_entities = sum(int(a.get("modelspace_entity_count") or 0) for a in analyses)
    largest = sorted(analyses, key=lambda a: int(a.get("modelspace_entity_count") or 0), reverse=True)[:12]
    stage_counts = {}
    for a in analyses:
        stage_counts.setdefault(a.get("stage"), {"files": 0, "entities": 0})
        stage_counts[a.get("stage")]["files"] += 1
        stage_counts[a.get("stage")]["entities"] += int(a.get("modelspace_entity_count") or 0)

    lines = [
        "# CAD Pipeline Report",
        "",
        f"Run time: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Tooling",
        "",
        "- ODA File Converter 27.1 was downloaded from Open Design Alliance, signature-verified, and extracted as a portable tool.",
        "- Portable executable: `project_analysis/cad_tools/ODAFileConverter_portable/ODAFileConverter.exe`",
        "- `ezdxf 1.4.4` is installed locally under `project_analysis/python_libs` and used for DXF parsing.",
        "- `PyMuPDF` is installed locally, but PDF render currently hangs on this dataset/backend; PDF export remains disabled for now.",
        "",
        "## Conversion",
        "",
        f"- DWG files staged: {len(mapping)}",
        f"- ODA return code: {oda_log.get('returncode')}",
        f"- ODA elapsed seconds: {oda_log.get('elapsed_seconds')}",
        f"- DXF files created/analyzed: {len(converted)} / {len(analyses)}",
        f"- Total DXF size: {round(sum(int(a.get('dxf_size_bytes') or 0) for a in converted) / (1024 * 1024), 2)} MB",
        f"- Analysis errors: {len(errors)}",
        f"- Total modelspace entities: {total_entities:,}",
        "",
        "## Stage Totals",
        "",
    ]
    for stage, data in sorted(stage_counts.items()):
        lines.append(f"- {stage}: {data['files']} DXF, {data['entities']:,} modelspace entities")
    lines.extend(["", "## Largest Drawings By Entity Count", ""])
    for a in largest:
        lines.append(
            f"- `{a.get('relative_path')}`: {int(a.get('modelspace_entity_count') or 0):,} entities, "
            f"{round(int(a.get('dxf_size_bytes') or 0)/(1024*1024), 2)} MB, "
            f"{a.get('layer_count')} layers, {a.get('block_count')} blocks"
        )

    lines.extend(["", "## Rendered SVG Samples", ""])
    if renders:
        for r in renders:
            lines.append(f"- `{r.get('relative_path')}`")
            lines.append(f"  - Entities: {r.get('entities')}")
            if r.get("svg"):
                lines.append(f"  - SVG: `{r.get('svg')}`")
            if r.get("pdf"):
                lines.append(f"  - PDF: `{r.get('pdf')}`")
            if r.get("errors"):
                lines.append(f"  - Errors: {r.get('errors')}")
    else:
        lines.append("- No SVG samples recorded.")

    lines.extend(["", "## Representative AŞAMA 6 Analysis", ""])
    for a in [x for x in analyses if str(x.get("relative_path", "")).startswith("AŞAMA 6")]:
        lines.append(f"### {a.get('relative_path')}")
        lines.append(f"- DXF: `{a.get('expected_dxf')}`")
        lines.append(f"- Entities: {int(a.get('modelspace_entity_count') or 0):,}")
        lines.append(f"- Entity types: {prop_counts(a.get('entity_counts') or {})}")
        top_layers = a.get("layers", [])[:8]
        if top_layers:
            lines.append("- Top layers:")
            for layer in top_layers:
                lines.append(f"  - `{layer['name']}`: {layer['entity_count']}")
        if a.get("text_samples"):
            lines.append("- Text samples:")
            for t in a["text_samples"][:8]:
                lines.append(f"  - [{t['type']} / {t['layer']}] {t['text']}")
        lines.append("")

    lines.extend(
        [
            "## Current Status",
            "",
            "- The technical threshold has been crossed: DWG files are now converted into machine-readable DXF files.",
            "- Layers, blocks, entity counts, modelspace text samples and bounding boxes are available in `dxf_analysis.json`.",
            "- SVG rendering works for small/medium samples and is suitable for visual diagnostics.",
            "- PDF rendering through the current `ezdxf`/PyMuPDF backend hangs on this dataset and should be replaced by a safer backend or an ODA/AutoCAD plot workflow.",
            "",
            "## Next Engineering Step",
            "",
            "Build semantic CAD parsers on top of DXF:",
            "",
            "1. Detect room labels and nearby enclosed polylines.",
            "2. Normalize architectural layers such as wall, stair, elevator, hatch, text and dimension layers.",
            "3. Extract per-floor plan groups from modelspace.",
            "4. Match Excel metraj records to CAD text/room geometry.",
            "5. Produce automated checks for area totals, unit counts, parking/core presence and proposal consistency.",
        ]
    )
    REPORT.write_text("\n".join(lines), encoding="utf-8")
    print(REPORT)


if __name__ == "__main__":
    main()
