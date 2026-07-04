from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
PYTHON_LIBS = ANALYSIS_ROOT / "python_libs"
CAD_ROOT = ANALYSIS_ROOT / "cad_pipeline"
DXF_ANALYSIS = CAD_ROOT / "dxf_analysis.json"
SVG_DIR = CAD_ROOT / "svg"
PDF_DIR = CAD_ROOT / "pdf"

if PYTHON_LIBS.exists():
    sys.path.insert(0, str(PYTHON_LIBS))

import ezdxf  # noqa: E402
from ezdxf.addons.drawing import Frontend, RenderContext, layout, svg  # noqa: E402


def render_svg(dxf_path: Path, svg_path: Path) -> None:
    doc = ezdxf.readfile(dxf_path)
    backend = svg.SVGBackend()
    Frontend(RenderContext(doc), backend).draw_layout(doc.modelspace())
    svg_path.write_text(
        backend.get_string(layout.Page(0, 0, layout.Units.mm, margins=layout.Margins.all(2))),
        encoding="utf-8",
    )


def render_pdf(dxf_path: Path, pdf_path: Path) -> None:
    from ezdxf.addons.drawing import pymupdf

    doc = ezdxf.readfile(dxf_path)
    backend = pymupdf.PyMuPdfBackend()
    Frontend(RenderContext(doc), backend).draw_layout(doc.modelspace())
    pdf_path.write_bytes(backend.get_pdf_bytes(layout.Page(0, 0, layout.Units.mm, margins=layout.Margins.all(2))))


def choose_samples(items: list[dict[str, Any]], max_entities: int, max_size_mb: float, max_files: int) -> list[dict[str, Any]]:
    preferred_keywords = [
        "KENTSEL ÖN ÇALIŞMA",
        "asansör1",
        "DUBLEKS MERDİVENİ",
        "çift asansör çekirdek2",
        "4306-33 plan",
        "5931 3",
        "5931-4",
        "4305-30",
    ]
    eligible = [
        item
        for item in items
        if item.get("dxf_exists")
        and int(item.get("modelspace_entity_count") or 0) <= max_entities
        and (int(item.get("dxf_size_bytes") or 0) / (1024 * 1024)) <= max_size_mb
    ]
    selected: list[dict[str, Any]] = []
    seen = set()
    for keyword in preferred_keywords:
        for item in eligible:
            if item["relative_path"] in seen:
                continue
            if keyword.lower() in item["relative_path"].lower():
                selected.append(item)
                seen.add(item["relative_path"])
                break
        if len(selected) >= max_files:
            return selected[:max_files]
    for item in sorted(eligible, key=lambda x: (x.get("stage", ""), x.get("modelspace_entity_count") or 0)):
        if item["relative_path"] in seen:
            continue
        selected.append(item)
        seen.add(item["relative_path"])
        if len(selected) >= max_files:
            break
    return selected


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--max-entities", type=int, default=12000)
    parser.add_argument("--max-size-mb", type=float, default=8.0)
    parser.add_argument("--max-files", type=int, default=10)
    parser.add_argument("--pdf", action="store_true")
    args = parser.parse_args()

    SVG_DIR.mkdir(parents=True, exist_ok=True)
    PDF_DIR.mkdir(parents=True, exist_ok=True)
    items = json.loads(DXF_ANALYSIS.read_text(encoding="utf-8"))
    samples = choose_samples(items, args.max_entities, args.max_size_mb, args.max_files)
    outputs = []
    for item in samples:
        dxf_path = Path(item["expected_dxf"])
        stem = dxf_path.stem
        svg_path = SVG_DIR / f"{stem}.svg"
        pdf_path = PDF_DIR / f"{stem}.pdf"
        record = {
            "relative_path": item["relative_path"],
            "dxf": str(dxf_path),
            "entities": item.get("modelspace_entity_count"),
            "dxf_size_bytes": item.get("dxf_size_bytes"),
            "svg": None,
            "pdf": None,
            "errors": [],
        }
        try:
            render_svg(dxf_path, svg_path)
            record["svg"] = str(svg_path)
        except Exception as exc:
            record["errors"].append(f"svg: {exc}")
        if args.pdf:
            try:
                render_pdf(dxf_path, pdf_path)
                record["pdf"] = str(pdf_path)
            except Exception as exc:
                record["errors"].append(f"pdf: {exc}")
        outputs.append(record)
        print(json.dumps(record, ensure_ascii=False), flush=True)
    (CAD_ROOT / "safe_render_outputs.json").write_text(json.dumps(outputs, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"count": len(outputs), "output": str(CAD_ROOT / "safe_render_outputs.json")}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
