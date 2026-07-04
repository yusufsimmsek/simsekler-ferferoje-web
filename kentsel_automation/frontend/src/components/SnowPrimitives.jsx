import { ArrowUpRight, Search } from "lucide-react";
import { statusTone } from "../lib/format.js";

const toneClasses = {
  blue: "bg-snow-blue text-[#1c1c1c]",
  ice: "bg-snow-ice text-[#1c1c1c]",
  green: "bg-snow-green text-[#1c1c1c]",
  violet: "bg-snow-violet text-[#1c1c1c]",
  dark: "bg-snow-panel text-white",
};

const badgeTones = {
  green: "text-[#7bd899] before:bg-[#a1f0b6]",
  red: "text-[#ff8888] before:bg-[#ff7a7a]",
  violet: "text-snow-violet before:bg-snow-violet",
  blue: "text-[#69c7ef] before:bg-[#95d8f4]",
  yellow: "text-[#ffd56a] before:bg-[#ffd56a]",
  muted: "text-white/40 before:bg-white/30",
};

export function Card({ children, className = "" }) {
  return (
    <section className={`rounded-card bg-snow-panel p-6 ${className}`}>
      {children}
    </section>
  );
}

export function StatCard({ label, value, delta, tone = "dark" }) {
  return (
    <section className={`rounded-card p-6 ${toneClasses[tone] || toneClasses.dark} min-h-[112px]`}>
      <div className="text-sm font-semibold">{label}</div>
      <div className="mt-3 flex items-end justify-between gap-3">
        <strong className="text-[28px] font-semibold leading-none">{value}</strong>
        {delta ? (
          <span className="flex items-center gap-1 text-xs">
            {delta}
            <ArrowUpRight size={14} strokeWidth={2} />
          </span>
        ) : null}
      </div>
    </section>
  );
}

export function StatusBadge({ status, children }) {
  const tone = statusTone(status);
  return (
    <span className={`relative inline-flex items-center gap-2 text-xs ${badgeTones[tone] || badgeTones.muted}`}>
      <span className="before:block before:h-1.5 before:w-1.5 before:rounded-full" />
      {children || status}
    </span>
  );
}

export function SectionTitle({ title, eyebrow }) {
  return (
    <div>
      {eyebrow ? <div className="mb-1 text-xs text-white/40">{eyebrow}</div> : null}
      <h2 className="text-sm font-semibold text-white">{title}</h2>
    </div>
  );
}

export function SearchInput({ placeholder = "Search" }) {
  return (
    <div className="flex h-8 items-center gap-2 rounded-lg bg-white/10 px-3 text-white/35">
      <Search size={16} strokeWidth={1.8} />
      <input
        aria-label={placeholder}
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        placeholder={placeholder}
      />
      <span className="text-xs">⌘/</span>
    </div>
  );
}

export function MiniLineChart() {
  return (
    <svg className="line-chart h-[230px] w-full" viewBox="0 0 640 230" fill="none" role="img" aria-label="Engine run trend">
      {[42, 82, 122, 162].map((y) => (
        <line key={y} x1="36" y1={y} x2="612" y2={y} stroke="rgba(255,255,255,.10)" />
      ))}
      <path d="M60 160 C120 70 210 80 280 132 C350 184 460 160 584 82" stroke="#a6d4ec" strokeWidth="3" />
      <path d="M60 126 C142 182 248 164 318 124 C392 78 472 88 584 116" stroke="#c6c7f8" strokeWidth="3" strokeDasharray="7 10" />
      <circle cx="268" cy="123" r="6" fill="#a6d4ec" stroke="#ffffff" strokeWidth="3" />
      {["Jan", "Feb", "Mar", "Apr", "May", "Jun"].map((month, index) => (
        <text key={month} x={68 + index * 103} y="212" fill="rgba(255,255,255,.38)" fontSize="12">{month}</text>
      ))}
    </svg>
  );
}

export function Donut({ value = 68 }) {
  return (
    <div
      className="relative h-32 w-32 rounded-full"
      style={{ background: `conic-gradient(#c6c7f8 0 ${value}%, #baedbd ${value}% 86%, #95d8f4 86% 100%)` }}
    >
      <div className="absolute inset-6 rounded-full bg-snow-panel" />
      <div className="absolute inset-0 grid place-items-center text-sm font-semibold">{value}%</div>
    </div>
  );
}
