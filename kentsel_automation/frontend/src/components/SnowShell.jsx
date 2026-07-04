import {
  Bell,
  BookOpen,
  Bot,
  Building2,
  ChevronRight,
  CircleDot,
  FileText,
  LayoutDashboard,
  Map,
  PanelLeft,
  Search,
  Settings,
  Star,
  Sun,
  UserRound,
} from "lucide-react";
import { SearchInput } from "./SnowPrimitives.jsx";

const nav = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "detail", label: "Detail Page", icon: Building2 },
  { id: "floor-plan", label: "Kat Plan", icon: Map },
  { id: "login", label: "Login", icon: UserRound },
];

const pages = [
  "Mevzuat Motoru",
  "Hesap Motoru",
  "Kat Plan",
  "Paylasim",
  "Offer Render",
  "Dataset Memory",
];

export function SnowShell({ screen, onScreenChange, children, rightRail }) {
  return (
    <div className="min-h-screen bg-[#111] p-0 text-white md:p-4">
      <div className="mx-auto flex min-h-screen w-full max-w-[1440px] overflow-hidden rounded-none bg-snow-shell shadow-snow md:min-h-[calc(100vh-32px)] md:rounded-snow">
        <aside className="hidden w-[212px] shrink-0 border-r border-snow-line px-4 py-5 lg:block">
          <div className="mb-7 flex items-center gap-2 px-1">
            <div className="grid h-6 w-6 place-items-center rounded-full bg-snow-ice text-xs text-snow-shell">P</div>
            <span className="text-sm font-medium">ParselIQ</span>
          </div>

          <div className="mb-6 flex gap-7 px-2 text-sm">
            <span className="text-white/40">Favorites</span>
            <span className="text-white/20">Recently</span>
          </div>

          <div className="mb-7 space-y-3 px-2 text-sm">
            <SidebarDot label="Overview" />
            <SidebarDot label="Projects" />
          </div>

          <div className="mb-6">
            <div className="mb-2 px-2 text-sm text-white/40">Dashboards</div>
            <div className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = screen === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onScreenChange(item.id)}
                    className={`flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm transition ${
                      active ? "bg-white/12 text-white before:-ml-3 before:h-5 before:w-1 before:rounded-full before:bg-snow-violet" : "text-white/82 hover:bg-white/8"
                    }`}
                  >
                    <Icon size={17} strokeWidth={1.8} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div className="mb-2 px-2 text-sm text-white/40">Pages</div>
            <div className="space-y-1">
              {pages.map((label) => (
                <button key={label} type="button" className="flex h-8 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-white/82 hover:bg-white/8">
                  <ChevronRight size={14} className="text-white/45" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-auto flex items-center gap-2 px-3 pt-12 text-sm text-white/88">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-snow-violet text-snow-shell">*</span>
            snowUI
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-[68px] shrink-0 items-center justify-between border-b border-snow-line px-5 lg:px-8">
            <div className="flex min-w-0 items-center gap-5 text-sm">
              <PanelLeft size={18} />
              <Star size={18} />
              <span className="hidden text-white/40 sm:inline">Dashboards</span>
              <span className="hidden text-white/20 sm:inline">/</span>
              <span className="truncate">{screen === "detail" ? "Parcel Detail" : screen === "floor-plan" ? "Kat Plan" : screen === "login" ? "Auth" : "Urban Transform"}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden w-40 lg:block">
                <SearchInput />
              </div>
              <Search size={18} className="lg:hidden" />
              <Sun size={18} />
              <Settings size={18} />
              <Bell size={18} />
              <BookOpen size={18} />
            </div>
          </header>

          <nav className="flex shrink-0 gap-2 overflow-x-auto border-b border-snow-line px-5 py-2 lg:hidden">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = screen === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onScreenChange(item.id)}
                  className={`flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm ${
                    active ? "bg-white/10 text-white" : "text-white/60"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.8} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="snow-scroll min-h-0 flex-1 overflow-auto px-5 py-7 lg:px-7">
            {children}
          </div>
        </main>

        {rightRail}
      </div>
    </div>
  );
}

function SidebarDot({ label }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <CircleDot size={8} className="text-white/25" fill="currentColor" />
      <span>{label}</span>
    </div>
  );
}

export function RightRail({ warnings = [] }) {
  const notifications = warnings.slice(0, 4);
  return (
    <aside className="hidden w-[280px] shrink-0 border-l border-snow-line px-6 py-7 xl:block">
      <RailSection title="Notifications">
        {notifications.map((warning, index) => (
          <RailItem
            key={warning.id || index}
            icon={index % 2 ? UserRound : Bot}
            title={warning.message || "Review needed"}
            subtitle={warning.parcel_key || "system"}
          />
        ))}
      </RailSection>

      <RailSection title="Activities" className="mt-9">
        {["Engine run completed", "CAD evidence parsed", "Offer package ready", "Sharing option updated"].map((title, index) => (
          <RailItem key={title} icon={index % 2 ? FileText : Building2} title={title} subtitle={index ? "59 minutes ago" : "Just now"} />
        ))}
      </RailSection>

      <RailSection title="Contacts" className="mt-9">
        {["Mimari Ofis", "Hukuk Kontrol", "Finans", "Proje Muduru"].map((title, index) => (
          <RailItem key={title} icon={UserRound} title={title} subtitle={["review", "legal", "finance", "owner"][index]} compact />
        ))}
      </RailSection>
    </aside>
  );
}

function RailSection({ title, children, className = "" }) {
  return (
    <section className={className}>
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function RailItem({ icon: Icon, title, subtitle, compact }) {
  return (
    <div className="flex gap-3">
      <div className={`grid shrink-0 place-items-center rounded-full ${compact ? "h-6 w-6 bg-white/12" : "h-7 w-7 bg-snow-ice text-snow-shell"}`}>
        <Icon size={15} />
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm text-white/90">{title}</div>
        <div className="text-xs text-white/38">{subtitle}</div>
      </div>
    </div>
  );
}
