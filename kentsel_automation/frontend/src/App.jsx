import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { ArchiFlowLoader } from "./components/ArchiFlowLoader.jsx";
import { SnowShell, RightRail } from "./components/SnowShell.jsx";
import { Dashboard } from "./screens/Dashboard.jsx";
import { DetailPage } from "./screens/DetailPage.jsx";
import { FloorPlanPage } from "./screens/FloorPlanPage.jsx";
import { Login } from "./screens/Login.jsx";
import { loadAppData } from "./lib/api.js";

export function App() {
  const [screen, setScreen] = useState("dashboard");
  const [data, setData] = useState({ summary: {}, warnings: [], warningTotal: 0, parcel: null });
  const [loading, setLoading] = useState(true);
  const [introReady, setIntroReady] = useState(false);
  const [error, setError] = useState("");

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const nextData = await loadAppData();
      setData(nextData);
    } catch (err) {
      setError(err.message || "Frontend data error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => setIntroReady(true), 1150);
    return () => window.clearTimeout(timer);
  }, []);

  const rightRail = useMemo(() => <RightRail warnings={data.warnings} />, [data.warnings]);
  const showEntryLoader = !introReady || (loading && !error);

  if (showEntryLoader) {
    return <ArchiFlowLoader />;
  }

  if (screen === "login") {
    return <Login onLogin={() => setScreen("dashboard")} />;
  }

  return (
    <SnowShell screen={screen} onScreenChange={setScreen} rightRail={screen === "dashboard" ? rightRail : null}>
      {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
      {loading ? <LoadingState /> : null}
      {!loading && screen === "dashboard" ? (
        <Dashboard summary={data.summary} warnings={data.warnings} parcel={data.parcel} />
      ) : null}
      {!loading && screen === "detail" ? (
        <DetailPage parcel={data.parcel} warnings={data.warnings} />
      ) : null}
      {!loading && screen === "floor-plan" ? (
        <FloorPlanPage parcel={data.parcel} />
      ) : null}
    </SnowShell>
  );
}

function LoadingState() {
  return (
    <div className="grid min-h-[520px] place-items-center rounded-card bg-snow-panel">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-snow-violet" />
        <div className="text-sm text-white/45">Loading automation cockpit</div>
      </div>
    </div>
  );
}

function ErrorBanner({ message, onRetry }) {
  return (
    <div className="mb-5 flex items-center justify-between gap-4 rounded-card border border-[#ff7a7a]/25 bg-[#ff7a7a]/10 p-4 text-sm">
      <div className="flex items-center gap-3">
        <AlertTriangle size={18} className="text-[#ff8c8c]" />
        <span>{message}</span>
      </div>
      <button type="button" onClick={onRetry} className="flex h-8 items-center gap-2 rounded-lg bg-white/10 px-3 text-xs">
        <RefreshCw size={14} />
        Retry
      </button>
    </div>
  );
}
