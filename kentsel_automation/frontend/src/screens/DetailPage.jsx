import { ArrowLeft, ArrowRight, ArrowUpDown, Calendar, Check, MoreHorizontal, Plus, Search, SlidersHorizontal } from "lucide-react";
import { StatusBadge } from "../components/SnowPrimitives.jsx";

const tableStatuses = ["in_progress", "complete", "pending", "approved", "rejected"];

export function DetailPage({ parcel, warnings = [] }) {
  const rows = makeRows(parcel, warnings);

  return (
    <div className="flex min-h-[calc(100vh-124px)] flex-col">
      <h1 className="text-sm font-semibold">Parcel Detail</h1>

      <div className="mt-7 flex h-[44px] items-center justify-between rounded-card bg-snow-panel px-4">
        <div className="flex items-center gap-6">
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-white/88 hover:bg-white/8">
            <Plus size={19} strokeWidth={1.8} />
          </button>
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-white/88 hover:bg-white/8">
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </button>
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg text-white/88 hover:bg-white/8">
            <ArrowUpDown size={18} strokeWidth={1.8} />
          </button>
        </div>

        <label className="hidden h-8 w-[210px] items-center gap-2 rounded-lg border border-white/10 bg-transparent px-3 text-white/32 sm:flex">
          <Search size={16} strokeWidth={1.7} />
          <input className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/28" placeholder="Search" />
        </label>
      </div>

      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="text-white/36">
            <tr className="border-b border-snow-line">
              <th className="w-10 px-1 py-4 font-normal">
                <span className="block h-4 w-4 rounded border border-white/18" />
              </th>
              <th className="px-3 py-4 font-normal">Project ID</th>
              <th className="px-3 py-4 font-normal">Parcel</th>
              <th className="px-3 py-4 font-normal">Module</th>
              <th className="px-3 py-4 font-normal">Address</th>
              <th className="px-3 py-4 font-normal">Date</th>
              <th className="px-3 py-4 font-normal">Status</th>
              <th className="w-10 px-3 py-4 font-normal" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.id}-${index}`} className={`${index === 4 ? "bg-white/6" : ""} border-b border-snow-line last:border-0`}>
                <td className="px-1 py-3">
                  <span className={`grid h-4 w-4 place-items-center rounded border ${index === 3 ? "border-snow-violet bg-snow-violet text-snow-shell" : "border-white/18"}`}>
                    {index === 3 ? <Check size={12} strokeWidth={2.2} /> : null}
                  </span>
                </td>
                <td className="px-3 py-3 font-mono text-white/88">#{row.id}</td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs text-snow-shell ${row.avatarTone}`}>{row.initial}</span>
                    <span className="truncate text-white/88">{row.parcel}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-white/82">{row.module}</td>
                <td className="px-3 py-3 text-white/82">{row.address}</td>
                <td className="px-3 py-3 text-white/82">
                  <span className="inline-flex items-center gap-2">
                    <Calendar size={15} strokeWidth={1.8} />
                    {row.date}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <StatusBadge status={row.status}>{statusLabel(row.status)}</StatusBadge>
                </td>
                <td className="px-3 py-3 text-right text-white/82">{index === 4 ? <MoreHorizontal size={17} /> : null}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-end gap-5 text-sm">
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-white/86 hover:bg-white/8">
          <ArrowLeft size={18} />
        </button>
        {[1, 2, 3, 4, 5].map((page) => (
          <button
            key={page}
            type="button"
            className={`grid h-8 w-8 place-items-center rounded-lg ${page === 1 ? "bg-white/10 text-white" : "text-white/86 hover:bg-white/8"}`}
          >
            {page}
          </button>
        ))}
        <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-white/86 hover:bg-white/8">
          <ArrowRight size={18} />
        </button>
      </div>

      <footer className="mt-auto hidden items-center justify-between pt-16 text-xs text-white/28 md:flex">
        <span>2026 ParselIQ</span>
        <div className="flex gap-6">
          <span>About</span>
          <span>Support</span>
          <span>Contact Us</span>
        </div>
      </footer>
    </div>
  );
}

function makeRows(parcel, warnings) {
  const sourceRows = (warnings.length ? warnings : fallbackWarnings).slice(0, 10);
  return sourceRows.map((warning, index) => {
    const status = tableStatuses[index % tableStatuses.length];
    const parcelKey = warning.parcel_key || parcel?.parcel_key || "general";
    return {
      id: warning.id || `CM980${index + 1}`,
      parcel: parcelKey,
      initial: parcelKey.slice(0, 1).toUpperCase(),
      avatarTone: ["bg-snow-ice", "bg-snow-cyan", "bg-[#d50000]", "bg-[#ffd66b]", "bg-[#c8b8a5]"][index % 5],
      module: moduleFromCode(warning.code),
      address: addressFromSource(warning.source, warning.code),
      date: ["Just now", "A minute ago", "1 hour ago", "Yesterday", "Feb 2, 2026"][index % 5],
      status,
    };
  });
}

function moduleFromCode(code = "") {
  if (code.includes("contract")) return "Contract Engine";
  if (code.includes("cad")) return "CAD Parser";
  if (code.includes("proposal")) return "Offer Package";
  if (code.includes("excel")) return "Metraj Import";
  return "Review Queue";
}

function addressFromSource(source = "", code = "") {
  if (!source && !code) return "Kentsel Donusum Dataset";
  const cleaned = String(source || code)
    .split("\\")
    .filter(Boolean)
    .slice(-2)
    .join(" / ");
  return cleaned || "Automation Evidence";
}

function statusLabel(status) {
  const labels = {
    in_progress: "In Progress",
    complete: "Complete",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
  };
  return labels[status] || status;
}

const fallbackWarnings = [
  { id: "CM9801", parcel_key: "13621-7", code: "cad_excel_area_delta", source: "A7 / Teklif Dosyasi" },
  { id: "CM9802", parcel_key: "25308-7", code: "contract_distribution_missing", source: "A7 / Sozlesme Kontrol" },
  { id: "CM9803", parcel_key: "5930-23", code: "proposal_special_note", source: "A7 / Teklif Notu" },
  { id: "CM9804", parcel_key: "2469-4", code: "source_without_parcel_key", source: "Dataset / Kaynak" },
  { id: "CM9805", parcel_key: "general", code: "missing_cad_semantics", source: "CAD / Semantik" },
];
