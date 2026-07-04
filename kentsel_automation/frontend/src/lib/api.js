export async function api(path, options = {}) {
  const response = await fetch(path, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || data.error || "API error");
  }
  return data;
}

export async function loadAppData() {
  const [summary, warnings, floorPlans] = await Promise.all([
    api("/api/summary"),
    api("/api/warnings?status=open&limit=100"),
    api("/api/floor-plan-options?limit=1"),
  ]);

  const firstWarning = warnings.data?.[0];
  const focusParcelKey = floorPlans.data?.[0]?.parcel_key || firstWarning?.parcel_key;
  const parcel = focusParcelKey
    ? await api(`/api/parcels/${encodeURIComponent(focusParcelKey)}`)
    : null;

  return { summary, warnings: warnings.data || [], warningTotal: warnings.total || 0, parcel };
}
