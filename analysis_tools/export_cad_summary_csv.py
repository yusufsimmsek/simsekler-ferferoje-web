from __future__ import annotations

import csv
import json
from pathlib import Path


CAD_ROOT = Path(r"C:\Users\user\OneDrive\Belgeler\New project\project_analysis\cad_pipeline")
analysis = json.loads((CAD_ROOT / "dxf_analysis.json").read_text(encoding="utf-8"))
out = CAD_ROOT / "cad_summary.csv"

with out.open("w", newline="", encoding="utf-8-sig") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "stage",
            "relative_path",
            "dxf_path",
            "dxf_size_mb",
            "modelspace_entity_count",
            "layer_count",
            "block_count",
            "top_entity_types",
            "top_layers",
            "has_text_samples",
            "error_count",
        ],
    )
    writer.writeheader()
    for item in analysis:
        writer.writerow(
            {
                "stage": item.get("stage"),
                "relative_path": item.get("relative_path"),
                "dxf_path": item.get("expected_dxf"),
                "dxf_size_mb": round(int(item.get("dxf_size_bytes") or 0) / (1024 * 1024), 3),
                "modelspace_entity_count": item.get("modelspace_entity_count"),
                "layer_count": item.get("layer_count"),
                "block_count": item.get("block_count"),
                "top_entity_types": "; ".join(
                    f"{k}={v}" for k, v in list((item.get("entity_counts") or {}).items())[:8]
                ),
                "top_layers": "; ".join(
                    f"{layer['name']}={layer['entity_count']}" for layer in (item.get("layers") or [])[:8]
                ),
                "has_text_samples": bool(item.get("text_samples")),
                "error_count": len(item.get("errors") or []),
            }
        )

print(out)
