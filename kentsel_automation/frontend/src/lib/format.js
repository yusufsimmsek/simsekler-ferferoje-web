export function formatNumber(value, fallback = "0") {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toLocaleString("tr-TR");
}

export function formatM2(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  });
}

export function percent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "-";
  return `%${Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
}

export function statusTone(status) {
  if (["ready", "completed", "draft_ready", "sharing_ready", "resolved", "complete"].includes(status)) return "green";
  if (["risk", "failed", "blocking", "review_required", "open"].includes(status)) return "red";
  if (["running", "reviewing", "in_progress", "waiting_for_input"].includes(status)) return "violet";
  if (["pending", "queued"].includes(status)) return "blue";
  if (["approved"].includes(status)) return "yellow";
  return "muted";
}
