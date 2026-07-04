from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import time
import unicodedata
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


ROOT = Path(r"D:\İlkbahar İnşaat\KENTSEL DÖNÜŞÜM PROJELENDİRME")
ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
PYTHON_LIBS = ANALYSIS_ROOT / "python_libs"
ODA_EXE = ANALYSIS_ROOT / "cad_tools" / "ODAFileConverter_portable" / "ODAFileConverter.exe"
OUT = ANALYSIS_ROOT / "cad_pipeline"

STAGING = OUT / "staging_input"
DXF_DIR = OUT / "dxf"
SVG_DIR = OUT / "svg"
PDF_DIR = OUT / "pdf"
LOG_DIR = OUT / "logs"

if PYTHON_LIBS.exists():
    sys.path.insert(0, str(PYTHON_LIBS))

import ezdxf  # noqa: E402


try:
    from ezdxf import bbox
except Exception:  # pragma: no cover
    bbox = None


def ensure_dirs() -> None:
    for directory in [OUT, STAGING, DXF_DIR, SVG_DIR, PDF_DIR, LOG_DIR]:
        directory.mkdir(parents=True, exist_ok=True)


def rel(path: Path) -> str:
    return str(path.relative_to(ROOT))


def slug(text: str, max_len: int = 96) -> str:
    normalized = unicodedata.normalize("NFKD", text)
    ascii_text = normalized.encode("ascii", "ignore").decode("ascii")
    ascii_text = re.sub(r"[^A-Za-z0-9._-]+", "_", ascii_text).strip("._-")
    return (ascii_text or "file")[:max_len]


def stable_stem(path: Path) -> str:
    digest = hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:10]
    return f"{digest}_{slug(path.stem)}"


def json_safe(value: Any) -> Any:
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, Path):
        return str(value)
    if isinstance(value, (list, tuple, set)):
        return [json_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): json_safe(v) for k, v in value.items()}
    return str(value)


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(json_safe(data), ensure_ascii=False, indent=2), encoding="utf-8")


def discover_dwgs(limit: int = 0) -> list[Path]:
    files = sorted(ROOT.rglob("*.dwg"))
    if limit > 0:
        return files[:limit]
    return files


def prepare_staging(dwgs: list[Path]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for src in dwgs:
        stem = stable_stem(src)
        staged = STAGING / f"{stem}.dwg"
        shutil.copy2(src, staged)
        records.append(
            {
                "source": str(src),
                "relative_path": rel(src),
                "stage": rel(src).split("\\", 1)[0],
                "staged_dwg": str(staged),
                "stem": stem,
                "expected_dxf": str(DXF_DIR / f"{stem}.dxf"),
                "expected_svg": str(SVG_DIR / f"{stem}.svg"),
                "expected_pdf": str(PDF_DIR / f"{stem}.pdf"),
            }
        )
    write_json(OUT / "cad_mapping.json", records)
    return records


def run_oda(version: str = "ACAD2018", output_type: str = "DXF", audit: bool = True) -> dict[str, Any]:
    if not ODA_EXE.exists():
        raise FileNotFoundError(f"ODAFileConverter.exe not found: {ODA_EXE}")
    stdout_path = LOG_DIR / "oda_stdout.txt"
    stderr_path = LOG_DIR / "oda_stderr.txt"
    args = [
        str(STAGING),
        str(DXF_DIR),
        version,
        output_type,
        "0",  # recursive
        "1" if audit else "0",
        "*.dwg",
    ]
    start = time.time()
    proc = subprocess.run(
        [str(ODA_EXE), *args],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        timeout=1800,
    )
    elapsed = round(time.time() - start, 3)
    stdout_path.write_text(proc.stdout or "", encoding="utf-8")
    stderr_path.write_text(proc.stderr or "", encoding="utf-8")
    result = {
        "exe": str(ODA_EXE),
        "args": args,
        "returncode": proc.returncode,
        "elapsed_seconds": elapsed,
        "stdout_file": str(stdout_path),
        "stderr_file": str(stderr_path),
        "stdout": proc.stdout,
        "stderr": proc.stderr,
    }
    write_json(OUT / "oda_conversion_log.json", result)
    if proc.returncode != 0:
        raise RuntimeError(f"ODA conversion failed: {proc.returncode}")
    return result


def entity_layer(entity: Any) -> str:
    try:
        return str(entity.dxf.layer)
    except Exception:
        return ""


def point_to_list(point: Any) -> list[float] | None:
    try:
        return [float(point[0]), float(point[1]), float(point[2] if len(point) > 2 else 0.0)]
    except Exception:
        return None


def plain_text(entity: Any) -> str:
    try:
        if entity.dxftype() == "MTEXT":
            return entity.plain_text()
        return str(entity.dxf.text)
    except Exception:
        return ""


def analyze_dxf(record: dict[str, Any]) -> dict[str, Any]:
    dxf_path = Path(record["expected_dxf"])
    result: dict[str, Any] = {
        **record,
        "dxf_exists": dxf_path.exists(),
        "dxf_size_bytes": dxf_path.stat().st_size if dxf_path.exists() else 0,
        "errors": [],
    }
    if not dxf_path.exists():
        result["errors"].append("DXF was not created")
        return result
    try:
        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()
        entities = list(msp)
        entity_counts = Counter(e.dxftype() for e in entities)
        layer_entity_counts = Counter(entity_layer(e) for e in entities)
        insert_counts = Counter()
        text_samples = []
        for entity in entities:
            dtype = entity.dxftype()
            if dtype == "INSERT":
                try:
                    insert_counts[str(entity.dxf.name)] += 1
                except Exception:
                    insert_counts[""] += 1
            if dtype in {"TEXT", "MTEXT", "ATTRIB"} and len(text_samples) < 250:
                text = plain_text(entity)
                if text.strip():
                    text_samples.append(
                        {
                            "type": dtype,
                            "layer": entity_layer(entity),
                            "text": re.sub(r"\s+", " ", text).strip()[:500],
                        }
                    )

        layers = []
        for layer in doc.layers:
            name = layer.dxf.name
            layers.append(
                {
                    "name": name,
                    "color": int(layer.color),
                    "linetype": str(layer.dxf.linetype),
                    "is_off": bool(layer.is_off()),
                    "is_frozen": bool(layer.is_frozen()),
                    "entity_count": int(layer_entity_counts.get(name, 0)),
                }
            )

        blocks = []
        for block in doc.blocks:
            try:
                block_entities = list(block)
            except Exception:
                block_entities = []
            blocks.append(
                {
                    "name": block.name,
                    "entity_count": len(block_entities),
                    "entity_types": dict(Counter(e.dxftype() for e in block_entities).most_common(20)),
                }
            )

        extents = None
        if bbox is not None and entities:
            try:
                box = bbox.extents(entities, fast=True)
                if box.has_data:
                    extents = {
                        "min": [float(v) for v in box.extmin],
                        "max": [float(v) for v in box.extmax],
                        "size": [float(v) for v in box.size],
                    }
            except Exception as exc:
                result["errors"].append(f"bbox failed: {exc}")

        result.update(
            {
                "dxf_version": doc.dxfversion,
                "insunits": doc.header.get("$INSUNITS", None),
                "modelspace_entity_count": len(entities),
                "entity_counts": dict(entity_counts.most_common()),
                "layer_count": len(layers),
                "layers": sorted(layers, key=lambda x: (-x["entity_count"], x["name"].lower())),
                "block_count": len(blocks),
                "blocks": sorted(blocks, key=lambda x: (-x["entity_count"], x["name"].lower()))[:300],
                "insert_counts": dict(insert_counts.most_common(100)),
                "text_samples": text_samples,
                "bbox": extents,
            }
        )
    except Exception as exc:
        result["errors"].append(f"ezdxf read/analyze failed: {exc}")
    return result


def render_outputs(record: dict[str, Any]) -> dict[str, Any]:
    dxf_path = Path(record["expected_dxf"])
    svg_path = Path(record["expected_svg"])
    pdf_path = Path(record["expected_pdf"])
    status: dict[str, Any] = {"relative_path": record["relative_path"], "svg": None, "pdf": None, "errors": []}
    if not dxf_path.exists():
        status["errors"].append("DXF missing")
        return status
    try:
        from ezdxf.addons.drawing import Frontend, RenderContext, layout, svg

        doc = ezdxf.readfile(dxf_path)
        backend = svg.SVGBackend()
        Frontend(RenderContext(doc), backend).draw_layout(doc.modelspace())
        svg_path.write_text(
            backend.get_string(layout.Page(0, 0, layout.Units.mm, margins=layout.Margins.all(2))),
            encoding="utf-8",
        )
        status["svg"] = str(svg_path)
    except Exception as exc:
        status["errors"].append(f"SVG render failed: {exc}")

    try:
        from ezdxf.addons.drawing import Frontend, RenderContext, layout, pymupdf

        doc = ezdxf.readfile(dxf_path)
        backend = pymupdf.PyMuPdfBackend()
        Frontend(RenderContext(doc), backend).draw_layout(doc.modelspace())
        pdf_path.write_bytes(backend.get_pdf_bytes(layout.Page(0, 0, layout.Units.mm, margins=layout.Margins.all(2))))
        status["pdf"] = str(pdf_path)
    except Exception as exc:
        status["errors"].append(f"PDF render failed: {exc}")
    return status


def pick_render_records(records: list[dict[str, Any]], render_limit: int, render_all: bool) -> list[dict[str, Any]]:
    if render_all:
        return records
    if render_limit <= 0:
        return []
    preferred = []
    seen = set()
    keywords = [
        "AŞAMA 2",
        "asansör1",
        "2647-6 plan",
        "4300-2",
        "4306-33",
        "4309-21",
        "5931-4",
        "BAHÇELİEMEK",
    ]
    for keyword in keywords:
        for record in records:
            if record["relative_path"] in seen:
                continue
            if keyword.lower() in record["relative_path"].lower():
                preferred.append(record)
                seen.add(record["relative_path"])
                break
            if keyword == record["stage"]:
                preferred.append(record)
                seen.add(record["relative_path"])
                break
        if len(preferred) >= render_limit:
            return preferred[:render_limit]
    for record in records:
        if record["relative_path"] not in seen:
            preferred.append(record)
            seen.add(record["relative_path"])
        if len(preferred) >= render_limit:
            break
    return preferred


def write_markdown_report(mapping: list[dict[str, Any]], conversion: dict[str, Any], analyses: list[dict[str, Any]], renders: list[dict[str, Any]]) -> None:
    lines = [
        "# CAD Pipeline Report",
        "",
        f"Run time: {datetime.now().isoformat(timespec='seconds')}",
        f"Source root: `{ROOT}`",
        f"ODA executable: `{ODA_EXE}`",
        "",
        "## Tooling",
        "",
        "- ODA File Converter portable extraction is available under `project_analysis/cad_tools/ODAFileConverter_portable`.",
        "- `ezdxf` and `PyMuPDF` are installed locally under `project_analysis/python_libs` for DXF analysis and SVG/PDF rendering.",
        "- ODA was invoked as a batch converter: source directory, target directory, output version `ACAD2018`, output type `DXF`, no recursion, audit enabled, filter `*.dwg`.",
        "",
        "## Conversion Summary",
        "",
        f"- DWG files staged: {len(mapping)}",
        f"- ODA return code: {conversion.get('returncode')}",
        f"- ODA elapsed seconds: {conversion.get('elapsed_seconds')}",
        f"- DXF files created: {sum(1 for a in analyses if a.get('dxf_exists'))}",
        f"- DXF analysis errors: {sum(1 for a in analyses if a.get('errors'))}",
        f"- Render attempts: {len(renders)}",
        f"- SVG created: {sum(1 for r in renders if r.get('svg'))}",
        f"- PDF created: {sum(1 for r in renders if r.get('pdf'))}",
        "",
        "## Per-Drawing Analysis",
        "",
    ]
    for item in analyses:
        lines.append(f"### {item['relative_path']}")
        lines.append(f"- DXF: `{item.get('expected_dxf')}`")
        lines.append(f"- Exists/size: {item.get('dxf_exists')} / {item.get('dxf_size_bytes')} bytes")
        if item.get("errors"):
            lines.append(f"- Errors: {item.get('errors')}")
        lines.append(f"- DXF version: {item.get('dxf_version')} | INSUNITS: {item.get('insunits')}")
        lines.append(f"- Modelspace entities: {item.get('modelspace_entity_count')}")
        lines.append(f"- Entity counts: {item.get('entity_counts')}")
        top_layers = item.get("layers", [])[:12]
        lines.append("- Top layers:")
        for layer in top_layers:
            lines.append(f"  - `{layer['name']}`: {layer['entity_count']} entities, color {layer['color']}, linetype `{layer['linetype']}`")
        if item.get("insert_counts"):
            lines.append(f"- Top block inserts: {item.get('insert_counts')}")
        if item.get("bbox"):
            lines.append(f"- Bounding box: {item.get('bbox')}")
        if item.get("text_samples"):
            sample = item["text_samples"][:8]
            lines.append("- Text samples:")
            for text in sample:
                lines.append(f"  - [{text['type']} / {text['layer']}] {text['text']}")
        lines.append("")
    if renders:
        lines.append("## Rendered Samples")
        lines.append("")
        for render in renders:
            lines.append(f"- {render['relative_path']}")
            if render.get("svg"):
                lines.append(f"  - SVG: `{render['svg']}`")
            if render.get("pdf"):
                lines.append(f"  - PDF: `{render['pdf']}`")
            if render.get("errors"):
                lines.append(f"  - Errors: {render['errors']}")
    lines.append("")
    lines.append("## Notes")
    lines.append("")
    lines.append("- The DXF files are now the machine-readable CAD layer for downstream automation.")
    lines.append("- SVG/PDF renders are diagnostic outputs. Use DXF analysis for entities, layers, blocks and text extraction.")
    lines.append("- Full architectural semantics still require domain parsing rules: e.g. layer naming, block naming, area polylines, room labels and scale conventions.")
    (OUT / "CAD_PIPELINE_REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Convert DWG files to DXF and analyze/render outputs.")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of DWG files; 0 means all.")
    parser.add_argument("--skip-convert", action="store_true", help="Skip ODA conversion and analyze existing DXF files.")
    parser.add_argument("--render-limit", type=int, default=8, help="Number of representative drawings to render as SVG/PDF.")
    parser.add_argument("--render-all", action="store_true", help="Render all converted DXF files as SVG/PDF.")
    args = parser.parse_args()

    ensure_dirs()
    dwgs = discover_dwgs(args.limit)
    mapping = prepare_staging(dwgs)
    conversion = {"skipped": True}
    if not args.skip_convert:
        conversion = run_oda()

    analyses = [analyze_dxf(record) for record in mapping]
    write_json(OUT / "dxf_analysis.json", analyses)

    render_records = pick_render_records(mapping, args.render_limit, args.render_all)
    renders = [render_outputs(record) for record in render_records]
    write_json(OUT / "render_outputs.json", renders)
    write_markdown_report(mapping, conversion, analyses, renders)

    summary = {
        "mapping": str(OUT / "cad_mapping.json"),
        "oda_log": str(OUT / "oda_conversion_log.json"),
        "dxf_analysis": str(OUT / "dxf_analysis.json"),
        "render_outputs": str(OUT / "render_outputs.json"),
        "report": str(OUT / "CAD_PIPELINE_REPORT.md"),
        "converted": sum(1 for item in analyses if item.get("dxf_exists")),
        "rendered_svg": sum(1 for item in renders if item.get("svg")),
        "rendered_pdf": sum(1 for item in renders if item.get("pdf")),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
