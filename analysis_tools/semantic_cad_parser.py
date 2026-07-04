from __future__ import annotations

import argparse
import csv
import json
import math
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path
from typing import Any


ANALYSIS_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis")
PYTHON_LIBS = ANALYSIS_ROOT / "python_libs"
CAD_ROOT = ANALYSIS_ROOT / "cad_pipeline"
DXF_ANALYSIS = CAD_ROOT / "dxf_analysis.json"
OUT = ANALYSIS_ROOT / "semantic_cad"

if PYTHON_LIBS.exists():
    sys.path.insert(0, str(PYTHON_LIBS))

import ezdxf  # noqa: E402


ROOM_KEYWORDS = {
    "SALON MUTFAK": "salon_mutfak",
    "SALON-MUTFAK": "salon_mutfak",
    "YATAK ODASI": "yatak_odasi",
    "MISAFIR ODASI": "oda",
    "MİSAFİR ODASI": "oda",
    "COCUK ODASI": "oda",
    "ÇOCUK ODASI": "oda",
    "SANDIK ODASI": "oda",
    "BAĞLI YATAK ODASI": "yatak_odasi",
    "BAGLI YATAK ODASI": "yatak_odasi",
    "SALON": "salon",
    "MUTFAK": "mutfak",
    "BANYO": "banyo",
    "DUŞ": "dus",
    "DUS": "dus",
    "WC": "wc",
    "HELA": "wc",
    "ANTRE": "antre",
    "HOL": "hol",
    "KORIDOR": "koridor",
    "KORİDOR": "koridor",
    "ODA": "oda",
    "DÜKKAN": "dukkan",
    "DUKKAN": "dukkan",
    "DEPO": "depo",
    "BALKON": "balkon",
    "TERAS": "teras",
    "LAVABO": "lavabo",
    "ASANSÖR": "asansor",
    "ASANSOR": "asansor",
    "MERDİVEN": "merdiven",
    "MERDIVEN": "merdiven",
    "SIĞINAK": "siginak",
    "SIGINAK": "siginak",
}

NON_ROOM_WORDS = {
    "ROOM NAME",
    "NET",
    "KAT",
    "PLAN",
    "ZEMIN",
    "ZEMİN",
    "BODRUM",
    "NORMAL",
    "DUBLEKS",
    "VAZIYET",
    "VAZİYET",
    "SOKAK",
    "CADDE",
    "CADDESI",
    "CADDESİ",
}


def ensure_dirs() -> None:
    OUT.mkdir(parents=True, exist_ok=True)


def load_json(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: Any) -> None:
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def decode_acad_unicode(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        try:
            return chr(int(match.group(1), 16))
        except Exception:
            return match.group(0)

    return re.sub(r"\\U\+([0-9A-Fa-f]{4})", repl, text)


def clean_text(text: str) -> str:
    text = decode_acad_unicode(text or "")
    text = text.replace("\\P", " ").replace("\n", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def fold(text: str) -> str:
    text = clean_text(text).upper()
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    text = text.replace("İ", "I").replace("ı", "I")
    return text


def classify_layer(name: str) -> set[str]:
    f = fold(name)
    categories: set[str] = set()
    if "WALL" in f or "DUVAR" in f:
        categories.add("wall")
    if "DOOR" in f or "KAPI" in f:
        categories.add("door")
    if "GLAZ" in f or "PENCERE" in f or "WINDOW" in f:
        categories.add("window_glass")
    if "MERDIVEN" in f or "STAIR" in f:
        categories.add("stair")
    if "ASANSOR" in f or "ELEV" in f:
        categories.add("elevator")
    if "CEKIRDEK" in f or "CORE" in f:
        categories.add("core")
    if "AREA" in f or "ALAN" in f:
        categories.add("area")
    if "TEXT" in f or "YAZI" in f or "ANNO" in f:
        categories.add("annotation")
    if "DIM" in f or "OLCU" in f or "ÖLÇ" in name.upper():
        categories.add("dimension")
    if "FURN" in f or "TEFRIS" in f or "TEFRİŞ" in name.upper():
        categories.add("furniture")
    if "DETL" in f or "DETAIL" in f:
        categories.add("detail")
    if "HATCH" in f or "PATT" in f:
        categories.add("hatch_pattern")
    if "PARSEL" in f or "ADA" in f or "SINIR" in f or "KADASTRO" in f:
        categories.add("parcel_boundary")
    if not categories:
        categories.add("other")
    return categories


def entity_text(entity: Any) -> str:
    try:
        if entity.dxftype() == "MTEXT":
            return clean_text(entity.plain_text())
        return clean_text(str(entity.dxf.text))
    except Exception:
        return ""


def entity_insert(entity: Any) -> list[float] | None:
    point = None
    for attr in ("insert", "align_point"):
        try:
            point = getattr(entity.dxf, attr)
            if point is not None:
                break
        except Exception:
            continue
    if point is None:
        return None
    try:
        return [float(point[0]), float(point[1]), float(point[2] if len(point) > 2 else 0.0)]
    except Exception:
        return None


def parse_area(text: str) -> float | None:
    match = re.search(r"(\d+(?:[.,]\d+)?)\s*(?:m²|m2|M²|M2)", text)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", "."))
    except Exception:
        return None


def parse_net_area(text: str) -> float | None:
    f = fold(text)
    if "NET" not in f:
        return None
    match = re.search(r"NET\s*([0-9]+(?:[.,][0-9]+)?)", text, flags=re.I)
    if not match:
        return None
    try:
        return float(match.group(1).replace(",", "."))
    except Exception:
        return None


def classify_room_text(text: str) -> tuple[str | None, str | None]:
    f = fold(text)
    if not f or parse_area(text) is not None:
        return None, None
    if f in NON_ROOM_WORDS or any(f.startswith(word + " ") for word in NON_ROOM_WORDS):
        return None, None
    for keyword, room_type in ROOM_KEYWORDS.items():
        if fold(keyword) in f:
            return text, room_type
    return None, None


def is_floor_title(text: str) -> bool:
    f = fold(text)
    return bool(
        ("KAT" in f and ("PLAN" in f or "BODRUM" in f or "ZEMIN" in f or "NORMAL" in f or "TERAS" in f))
        or ("PLAN" in f and ("ZEMIN" in f or "BODRUM" in f or "NORMAL" in f or "DUBLEKS" in f))
    )


def distance(a: list[float] | None, b: list[float] | None) -> float:
    if a is None or b is None:
        return float("inf")
    return math.dist(a[:2], b[:2])


def point_bbox(points: list[list[float]]) -> dict[str, Any] | None:
    if not points:
        return None
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    return {
        "min": [min(xs), min(ys)],
        "max": [max(xs), max(ys)],
        "size": [max(xs) - min(xs), max(ys) - min(ys)],
    }


def polygon_area(points: list[tuple[float, float]]) -> float | None:
    if len(points) < 3:
        return None
    acc = 0.0
    for idx, (x1, y1) in enumerate(points):
        x2, y2 = points[(idx + 1) % len(points)]
        acc += x1 * y2 - x2 * y1
    return abs(acc) / 2.0


def closed_polyline_area(entity: Any) -> float | None:
    try:
        if entity.dxftype() == "LWPOLYLINE" and entity.closed:
            points = [(float(p[0]), float(p[1])) for p in entity.get_points("xy")]
            return polygon_area(points)
        if entity.dxftype() == "POLYLINE" and entity.is_closed:
            points = [(float(v.dxf.location.x), float(v.dxf.location.y)) for v in entity.vertices]
            return polygon_area(points)
    except Exception:
        return None
    return None


def pair_rooms_and_areas(texts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    area_items = [t for t in texts if t.get("area_m2") is not None]
    room_items = [t for t in texts if t.get("room_type")]
    pairs = []
    used_room_ids: set[int] = set()
    for area in area_items:
        neighbor_texts = [
            t
            for t in texts
            if 0 < abs(int(area["index"]) - int(t["index"])) <= 2
        ]
        if any(fold(t.get("text", "")) == "ROOM NAME" for t in neighbor_texts):
            continue
        candidates = []
        for room in room_items:
            index_gap = abs(int(area["index"]) - int(room["index"]))
            dist = distance(area.get("point"), room.get("point"))
            layer_bonus = 0 if area.get("layer") == room.get("layer") else 2
            if index_gap <= 3:
                score = index_gap * 10 + layer_bonus + min(dist, 10000) / 10000
                candidates.append((score, room))
        if not candidates:
            continue
        candidates.sort(key=lambda item: item[0])
        room = candidates[0][1]
        pair_quality = "sequence"
        used_room_ids.add(int(room["index"]))
        pairs.append(
            {
                "room_name": room["text"],
                "room_type": room["room_type"],
                "area_m2": area["area_m2"],
                "room_layer": room["layer"],
                "area_layer": area["layer"],
                "room_point": room.get("point"),
                "area_point": area.get("point"),
                "distance": None if distance(area.get("point"), room.get("point")) == float("inf") else round(distance(area.get("point"), room.get("point")), 3),
                "pair_quality": pair_quality,
                "room_index": room["index"],
                "area_index": area["index"],
            }
        )
    return pairs


def analyze_file(item: dict[str, Any], max_entities_for_polylines: int) -> dict[str, Any]:
    dxf_path = Path(item["expected_dxf"])
    result = {
        "relative_path": item["relative_path"],
        "stage": item.get("stage"),
        "dxf_path": str(dxf_path),
        "errors": [],
    }
    try:
        doc = ezdxf.readfile(dxf_path)
        msp = doc.modelspace()
        texts: list[dict[str, Any]] = []
        layer_category_counts: dict[str, int] = defaultdict(int)
        semantic_layer_counts: dict[str, int] = defaultdict(int)
        closed_polylines = []
        points = []

        for index, entity in enumerate(msp):
            layer = str(getattr(entity.dxf, "layer", ""))
            categories = classify_layer(layer)
            for category in categories:
                semantic_layer_counts[category] += 1
            layer_category_counts[layer] += 1

            if entity.dxftype() in {"TEXT", "MTEXT", "ATTRIB"}:
                text = entity_text(entity)
                if not text:
                    continue
                point = entity_insert(entity)
                if point:
                    points.append(point)
                room_name, room_type = classify_room_text(text)
                texts.append(
                    {
                        "index": index,
                        "type": entity.dxftype(),
                        "layer": layer,
                        "text": text,
                        "folded": fold(text),
                        "point": point,
                        "area_m2": parse_area(text),
                        "net_area_m2": parse_net_area(text),
                        "room_name": room_name,
                        "room_type": room_type,
                        "is_floor_title": is_floor_title(text),
                    }
                )
            if int(item.get("modelspace_entity_count") or 0) <= max_entities_for_polylines and entity.dxftype() in {"LWPOLYLINE", "POLYLINE"}:
                area = closed_polyline_area(entity)
                if area is not None and area > 0:
                    closed_polylines.append(
                        {
                            "type": entity.dxftype(),
                            "layer": layer,
                            "area_raw_units": round(area, 3),
                        }
                    )

        room_area_pairs = pair_rooms_and_areas(texts)
        rooms_by_type = Counter(pair["room_type"] for pair in room_area_pairs)
        area_by_type: dict[str, float] = defaultdict(float)
        for pair in room_area_pairs:
            area_by_type[pair["room_type"]] += float(pair["area_m2"])
        net_areas = [t["net_area_m2"] for t in texts if t.get("net_area_m2") is not None]
        floor_titles = [t for t in texts if t.get("is_floor_title")]

        result.update(
            {
                "modelspace_entity_count": item.get("modelspace_entity_count"),
                "layer_count": item.get("layer_count"),
                "block_count": item.get("block_count"),
                "semantic_layer_counts": dict(sorted(semantic_layer_counts.items())),
                "top_layers": [
                    {"name": name, "count": count, "categories": sorted(classify_layer(name))}
                    for name, count in Counter(layer_category_counts).most_common(20)
                ],
                "text_count": len(texts),
                "area_text_count": sum(1 for t in texts if t.get("area_m2") is not None),
                "room_label_count": sum(1 for t in texts if t.get("room_type")),
                "room_area_pair_count": len(room_area_pairs),
                "rooms_by_type": dict(rooms_by_type.most_common()),
                "area_by_type_m2": {k: round(v, 2) for k, v in sorted(area_by_type.items())},
                "total_detected_room_area_m2": round(sum(float(pair["area_m2"]) for pair in room_area_pairs), 2),
                "net_area_labels_m2": net_areas,
                "floor_titles": [
                    {"text": t["text"], "layer": t["layer"], "point": t.get("point")}
                    for t in floor_titles[:100]
                ],
                "floor_title_count": len(floor_titles),
                "drawing_text_bbox": point_bbox(points),
                "room_area_pairs": room_area_pairs[:1000],
                "closed_polyline_count": len(closed_polylines),
                "closed_polyline_area_candidates": sorted(
                    closed_polylines, key=lambda p: p["area_raw_units"], reverse=True
                )[:200],
            }
        )
    except Exception as exc:
        result["errors"].append(str(exc))
    return result


def write_csvs(analysis: list[dict[str, Any]]) -> None:
    summary_path = OUT / "semantic_summary.csv"
    rooms_path = OUT / "semantic_rooms.csv"
    with summary_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "stage",
                "relative_path",
                "entities",
                "layers",
                "blocks",
                "text_count",
                "room_label_count",
                "area_text_count",
                "room_area_pair_count",
                "total_detected_room_area_m2",
                "net_area_labels_m2",
                "rooms_by_type",
                "semantic_layer_counts",
                "errors",
            ],
        )
        writer.writeheader()
        for item in analysis:
            writer.writerow(
                {
                    "stage": item.get("stage"),
                    "relative_path": item.get("relative_path"),
                    "entities": item.get("modelspace_entity_count"),
                    "layers": item.get("layer_count"),
                    "blocks": item.get("block_count"),
                    "text_count": item.get("text_count"),
                    "room_label_count": item.get("room_label_count"),
                    "area_text_count": item.get("area_text_count"),
                    "room_area_pair_count": item.get("room_area_pair_count"),
                    "total_detected_room_area_m2": item.get("total_detected_room_area_m2"),
                    "net_area_labels_m2": "; ".join(str(v) for v in item.get("net_area_labels_m2", [])),
                    "rooms_by_type": json.dumps(item.get("rooms_by_type", {}), ensure_ascii=False),
                    "semantic_layer_counts": json.dumps(item.get("semantic_layer_counts", {}), ensure_ascii=False),
                    "errors": json.dumps(item.get("errors", []), ensure_ascii=False),
                }
            )
    with rooms_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f,
            fieldnames=[
                "stage",
                "relative_path",
                "room_name",
                "room_type",
                "area_m2",
                "room_layer",
                "area_layer",
                "pair_quality",
                "distance",
                "room_x",
                "room_y",
                "area_x",
                "area_y",
            ],
        )
        writer.writeheader()
        for item in analysis:
            for pair in item.get("room_area_pairs", []):
                rp = pair.get("room_point") or [None, None]
                ap = pair.get("area_point") or [None, None]
                writer.writerow(
                    {
                        "stage": item.get("stage"),
                        "relative_path": item.get("relative_path"),
                        "room_name": pair.get("room_name"),
                        "room_type": pair.get("room_type"),
                        "area_m2": pair.get("area_m2"),
                        "room_layer": pair.get("room_layer"),
                        "area_layer": pair.get("area_layer"),
                        "pair_quality": pair.get("pair_quality"),
                        "distance": pair.get("distance"),
                        "room_x": rp[0],
                        "room_y": rp[1],
                        "area_x": ap[0],
                        "area_y": ap[1],
                    }
                )


def write_report(analysis: list[dict[str, Any]]) -> None:
    lines = [
        "# Semantic CAD Analysis Report",
        "",
        f"Run time: {datetime.now().isoformat(timespec='seconds')}",
        "",
        "## Scope",
        "",
        "This pass reads the DXF files produced by the CAD pipeline and extracts early architectural semantics:",
        "",
        "- Layer categories such as wall, door, window/glass, stair, elevator/core, area annotation and furniture.",
        "- Room labels and nearby area labels.",
        "- Net area labels.",
        "- Floor/plan title text.",
        "- Closed polyline candidates where available.",
        "",
        "This is a first semantic layer; it does not yet infer exact apartment boundaries or validated net/gross areas.",
        "",
        "## Summary",
        "",
        f"- Files analyzed: {len(analysis)}",
        f"- Files with room/area pairs: {sum(1 for item in analysis if item.get('room_area_pair_count', 0) > 0)}",
        f"- Total room-area pairs: {sum(int(item.get('room_area_pair_count') or 0) for item in analysis)}",
        f"- Total detected room area text sum: {round(sum(float(item.get('total_detected_room_area_m2') or 0) for item in analysis), 2)} m2",
        "",
        "## Per Drawing",
        "",
    ]
    for item in analysis:
        lines.append(f"### {item.get('relative_path')}")
        if item.get("errors"):
            lines.append(f"- Errors: {item.get('errors')}")
        lines.append(
            f"- Entities/layers/blocks: {item.get('modelspace_entity_count')} / {item.get('layer_count')} / {item.get('block_count')}"
        )
        lines.append(
            f"- Texts: {item.get('text_count')} | room labels: {item.get('room_label_count')} | area labels: {item.get('area_text_count')} | pairs: {item.get('room_area_pair_count')}"
        )
        lines.append(f"- Total detected room area: {item.get('total_detected_room_area_m2')} m2")
        if item.get("net_area_labels_m2"):
            lines.append(f"- Net area labels: {item.get('net_area_labels_m2')[:20]}")
        if item.get("rooms_by_type"):
            lines.append(f"- Rooms by type: {item.get('rooms_by_type')}")
        if item.get("semantic_layer_counts"):
            interesting = {k: v for k, v in item["semantic_layer_counts"].items() if k != "other"}
            lines.append(f"- Semantic layer entity counts: {interesting}")
        if item.get("floor_titles"):
            lines.append("- Floor/plan titles:")
            for title in item["floor_titles"][:10]:
                lines.append(f"  - {title['text']} [{title['layer']}]")
        if item.get("room_area_pairs"):
            lines.append("- Sample room-area pairs:")
            for pair in item["room_area_pairs"][:20]:
                lines.append(
                    f"  - {pair['room_name']} = {pair['area_m2']} m2 "
                    f"({pair['room_type']}, {pair['pair_quality']}, layers {pair['room_layer']} / {pair['area_layer']})"
                )
        if item.get("closed_polyline_count"):
            lines.append(f"- Closed polyline candidates: {item.get('closed_polyline_count')}")
        lines.append("")
    lines.extend(
        [
            "## Automation Implications",
            "",
            "- `A-AREA-IDEN` is the strongest room/area extraction layer in most Revit/AutoCAD-exported plan files.",
            "- `A-WALL`, `A-DOOR`, `A-GLAZ`, `MERDİVEN`, `ÇEKİRDEK`, `ZNP-DUVAR`, `DUVAR`, `PENCERE`, `KAPIKANAT` can be normalized into architectural categories.",
            "- The next parser should group room-area pairs by apartment/plan cluster using coordinates, then reconcile those groups against Excel metraj rows and proposal PDF unit counts.",
            "- Many drawings are LINE-heavy; exact enclosed room geometry will require line-network polygonization, not only closed polyline detection.",
        ]
    )
    (OUT / "SEMANTIC_CAD_REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stage", default="AŞAMA 6", help="Stage prefix to analyze; use ALL for all DXF files.")
    parser.add_argument("--max-entities-for-polylines", type=int, default=15000)
    args = parser.parse_args()
    ensure_dirs()
    dxf_items = load_json(DXF_ANALYSIS, [])
    if args.stage.upper() != "ALL":
        dxf_items = [item for item in dxf_items if str(item.get("relative_path", "")).startswith(args.stage)]
    analysis = [analyze_file(item, args.max_entities_for_polylines) for item in dxf_items]
    write_json(OUT / "semantic_cad_analysis.json", analysis)
    write_csvs(analysis)
    write_report(analysis)
    summary = {
        "files": len(analysis),
        "semantic_analysis": str(OUT / "semantic_cad_analysis.json"),
        "summary_csv": str(OUT / "semantic_summary.csv"),
        "rooms_csv": str(OUT / "semantic_rooms.csv"),
        "report": str(OUT / "SEMANTIC_CAD_REPORT.md"),
        "room_area_pairs": sum(int(item.get("room_area_pair_count") or 0) for item in analysis),
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
