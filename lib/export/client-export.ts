import type { FloorPlan } from "@/lib/floor-plan/types";

type PngExportApiSuccess = {
  ok: true;
  code: "PNG_EXPORT_READY";
  format: "png";
  delivery: "client_png_from_svg";
  filename: string;
  mimeType: "image/svg+xml";
  svg: string;
  width: number;
  height: number;
};

type ExportApiError = {
  ok: false;
  message: string;
  developerMessage?: string;
  requestId?: string;
};

export type ClientExportResult =
  | {
      ok: true;
      filename: string;
    }
  | {
      ok: false;
      message: string;
      developerMessage: string;
    };

export async function exportPlanAsPng(plan: FloorPlan): Promise<ClientExportResult> {
  const response = await fetch("/api/export/png", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      schemaVersion: "export-request-v1",
      format: "png",
      plan,
      settings: {
        includeRoomLabels: true,
        includeDimensions: true,
        includeDisclaimer: true,
        resolution: "high"
      }
    })
  });
  const payload = (await response.json().catch(() => null)) as
    | PngExportApiSuccess
    | ExportApiError
    | null;

  if (!response.ok || !payload || payload.ok !== true) {
    const error = payload && payload.ok === false ? payload : null;

    return {
      ok: false,
      message: error?.message ?? "PNG export failed.",
      developerMessage:
        error?.developerMessage ??
        `PNG export returned HTTP ${response.status}${error?.requestId ? ` (${error.requestId})` : ""}.`
    };
  }

  await downloadPngFromSvg(payload);

  return {
    ok: true,
    filename: payload.filename
  };
}

export async function exportPlanAsPdf(plan: FloorPlan): Promise<ClientExportResult> {
  const response = await fetch("/api/export/pdf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      schemaVersion: "export-request-v1",
      format: "pdf",
      plan,
      settings: {
        includeRoomLabels: true,
        includeDimensions: true,
        includeDisclaimer: true,
        pageSize: "a4",
        orientation: "landscape",
        includeRoomSchedule: true,
        includeWarnings: true
      }
    })
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as ExportApiError | null;

    return {
      ok: false,
      message: error?.message ?? "PDF export failed.",
      developerMessage:
        error?.developerMessage ??
        `PDF export returned HTTP ${response.status}${error?.requestId ? ` (${error.requestId})` : ""}.`
    };
  }

  const blob = await response.blob();
  const filename = response.headers.get("X-Export-Filename") ?? `${plan.id}.pdf`;

  downloadBlob(blob, filename);

  return {
    ok: true,
    filename
  };
}

async function downloadPngFromSvg(payload: PngExportApiSuccess) {
  const svgBlob = new Blob([payload.svg], {
    type: "image/svg+xml;charset=utf-8"
  });
  const url = URL.createObjectURL(svgBlob);

  try {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = payload.width;
    canvas.height = payload.height;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Canvas 2D context is unavailable.");
    }

    context.fillStyle = "#FFFFFF";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, payload.width, payload.height);

    const pngBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Canvas did not produce a PNG blob."));
          return;
        }

        resolve(blob);
      }, "image/png");
    });

    downloadBlob(pngBlob, payload.filename);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("SVG export image failed to load."));
    image.src = url;
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  try {
    link.href = url;
    link.download = filename;
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    URL.revokeObjectURL(url);
  }
}
