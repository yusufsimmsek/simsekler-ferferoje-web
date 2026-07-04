"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  Bell,
  Bot,
  Box,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  ClipboardCheck,
  FileText,
  Folder,
  FolderKanban,
  Grid3X3,
  HardDrive,
  HelpCircle,
  Home,
  Layers3,
  MapPinned,
  MoreHorizontal,
  Plus,
  Ruler,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Sparkles,
  Star,
  UploadCloud,
  Users,
  Wand2
} from "lucide-react";
import rawData from "@/lib/kentsel/kentsel-snapshot.json";

export type KentselPage =
  | "dashboard"
  | "projects"
  | "plans"
  | "models"
  | "comparisons"
  | "site-analysis"
  | "regulation-analysis"
  | "zoning-rules"
  | "ai-floor-plan"
  | "building-mass"
  | "apartment-mix"
  | "calculations"
  | "files"
  | "reports"
  | "team"
  | "archive";

type AnyRecord = Record<string, unknown>;

type KentselData = {
  counts: Record<string, number>;
  projects: AnyRecord[];
  parcels: AnyRecord[];
  companyExamples: AnyRecord[];
  envelopes: AnyRecord[];
  cores: AnyRecord[];
  layouts: AnyRecord[];
  mixes: AnyRecord[];
  cadPlans: AnyRecord[];
  cadCandidates4300: AnyRecord[];
  warnings: AnyRecord[];
  reviewTasks: AnyRecord[];
  contractRules: AnyRecord[];
  documentEvidence: AnyRecord[];
  sourceFiles: AnyRecord[];
  layoutPatterns: AnyRecord[];
  sharingPatterns: AnyRecord[];
  modules: AnyRecord[];
  payments: AnyRecord[];
  offers: AnyRecord[];
  allocations: AnyRecord[];
};

const data = rawData as KentselData;

const ui = {
  appShell: "min-h-screen bg-[#F8FAFC] text-[#111827] lg:grid lg:grid-cols-[256px_minmax(0,1fr)]",
  mainShell:
    "grid min-h-[calc(100vh-76px)] bg-[radial-gradient(circle_at_top_left,#EEF6FF_0%,#F8FAFC_34%,#FFFFFF_100%)] xl:grid-cols-[minmax(0,1fr)_344px]",
  sidebar: "hidden min-h-screen border-r border-[#E2E8F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] lg:flex lg:flex-col",
  topbar:
    "sticky top-0 z-30 flex min-h-[76px] flex-wrap items-center gap-3 border-b border-[#E2E8F0] bg-white/88 px-4 shadow-[0_10px_32px_rgba(61,82,104,0.06)] backdrop-blur-xl sm:px-6 lg:px-7",
  panel:
    "rounded-lg border border-[#E2E8F0] bg-[linear-gradient(180deg,#FFFFFF_0%,#FBFDFF_100%)] shadow-[0_18px_55px_rgba(61,82,104,0.08)] ring-1 ring-white/70",
  control:
    "border-[#D8E2ED] bg-white text-[#344054] shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition hover:border-[#8FA9C7] hover:bg-[#F8FAFC]",
  primary:
    "bg-[linear-gradient(135deg,#315BFF_0%,#38BDF8_100%)] text-white shadow-[0_12px_26px_rgba(49,91,255,0.24)] transition hover:shadow-[0_16px_32px_rgba(56,189,248,0.28)]",
  aiGradient: "bg-[linear-gradient(135deg,#8B5CF6_0%,#38BDF8_100%)]",
  softBlue: "bg-[linear-gradient(135deg,#EEF4FF_0%,#EAFBFF_100%)] text-[#315BFF]",
  softMint: "bg-[linear-gradient(135deg,#EAFBF4_0%,#D9FBEA_100%)] text-[#168653]",
  softAmber: "bg-[linear-gradient(135deg,#FFF7E6_0%,#FEF3C7_100%)] text-[#B76E00]",
  softCoral: "bg-[linear-gradient(135deg,#FFF1F2_0%,#FFE4E6_100%)] text-[#D93F4C]",
  softViolet: "bg-[linear-gradient(135deg,#F4EFFF_0%,#EEF4FF_100%)] text-[#7456D9]",
  softSlate: "bg-[linear-gradient(135deg,#E8EEF4_0%,#F8FAFC_100%)] text-[#3D5268]"
};

const pages: Record<KentselPage, { title: string; subtitle: string; action: string }> = {
  dashboard: {
    title: "Günaydın Mert",
    subtitle: "Kentsel dönüşüm akışına devam edelim.",
    action: "Yeni Proje"
  },
  projects: {
    title: "Projeler",
    subtitle: "Tüm kentsel dönüşüm dosyalarını tek yerde yönet.",
    action: "Yeni Proje"
  },
  plans: {
    title: "Tüm Planlar",
    subtitle: "CAD, AI plan ve daire seçeneklerini karşılaştır.",
    action: "Yeni Plan"
  },
  models: {
    title: "3D Modeller",
    subtitle: "Yapılaşma zarfı, çekirdek ve kütle çalışmalarını izle.",
    action: "Model Yükle"
  },
  comparisons: {
    title: "Karşılaştırmalar",
    subtitle: "Plan, kütle, paylaşım ve risk seçeneklerini yan yana değerlendir.",
    action: "Yeni Karşılaştırma"
  },
  "site-analysis": {
    title: "Parsel Analizi",
    subtitle: "Ada-parsel, kaynak dosya, CAD ve eski metraj eşleşmelerini kontrol et.",
    action: "Analiz Başlat"
  },
  "regulation-analysis": {
    title: "İmar Analizi",
    subtitle: "Emsal, TAKS, çekme, yükseklik ve sözleşme riskini birlikte oku.",
    action: "Rapor Al"
  },
  "zoning-rules": {
    title: "Plan Notları",
    subtitle: "Mevzuat motoru, uyarılar ve insan onayı kuyruğu.",
    action: "Kural Seti"
  },
  "ai-floor-plan": {
    title: "AI Kat Planı",
    subtitle: "Bağımsız bölüm adayları ve daire yerleşim seçenekleri.",
    action: "Plan Üret"
  },
  "building-mass": {
    title: "Kütle Çalışması",
    subtitle: "Yapılaşma zarfı, çekirdek ve kat alanı senaryoları.",
    action: "Kütle Üret"
  },
  "apartment-mix": {
    title: "Daire Karması",
    subtitle: "Daire tipleri, adetleri, alanları ve paylaşım dengesi.",
    action: "Karma Optimize Et"
  },
  calculations: {
    title: "Hesaplamalar",
    subtitle: "Emsal, oturum, verimlilik, teklif hazırlığı ve paylaşım metrikleri.",
    action: "Tümünü Hesapla"
  },
  files: {
    title: "Dosyalar",
    subtitle: "CAD, PDF, Excel, kanıt ve analiz kaynak dosyaları.",
    action: "Dosya Yükle"
  },
  reports: {
    title: "Raporlar",
    subtitle: "Teklif paketleri, sözleşme kontrolleri ve yönetici özetleri.",
    action: "Rapor Üret"
  },
  team: {
    title: "Ekip",
    subtitle: "Review görevleri, karar bekleyen işler ve ekip dağılımı.",
    action: "Üye Ekle"
  },
  archive: {
    title: "Arşiv",
    subtitle: "Tüm veri seti, motor modülleri ve geçmiş analiz çıktıları.",
    action: "Arşivle"
  }
};

const sidebarSections: Array<{
  title: string;
  items: Array<{ page: KentselPage; label: string; href: string; icon: LucideIcon }>;
}> = [
  {
    title: "Çalışma Alanı",
    items: [{ page: "dashboard", label: "Dashboard", href: "/dashboard", icon: Home }]
  },
  {
    title: "Projeler",
    items: [
      { page: "projects", label: "Projeler", href: "/projects", icon: FolderKanban },
      { page: "plans", label: "Tüm Planlar", href: "/plans", icon: Grid3X3 },
      { page: "models", label: "3D Modeller", href: "/models", icon: Box },
      { page: "comparisons", label: "Karşılaştırmalar", href: "/comparisons", icon: Layers3 }
    ]
  },
  {
    title: "Analiz",
    items: [
      { page: "site-analysis", label: "Parsel Analizi", href: "/site-analysis", icon: MapPinned },
      {
        page: "regulation-analysis",
        label: "İmar Analizi",
        href: "/regulation-analysis",
        icon: ShieldCheck
      },
      { page: "zoning-rules", label: "Plan Notları", href: "/zoning-rules", icon: Ruler }
    ]
  },
  {
    title: "Tasarım",
    items: [
      { page: "ai-floor-plan", label: "AI Kat Planı", href: "/ai-floor-plan", icon: Wand2 },
      { page: "building-mass", label: "Kütle Çalışması", href: "/building-mass", icon: Building2 },
      { page: "apartment-mix", label: "Daire Karması", href: "/apartment-mix", icon: Users },
      { page: "calculations", label: "Hesaplamalar", href: "/calculations", icon: Calculator }
    ]
  },
  {
    title: "Dokümanlar",
    items: [
      { page: "files", label: "Dosyalar", href: "/files", icon: Folder },
      { page: "reports", label: "Raporlar", href: "/reports", icon: FileText }
    ]
  },
  {
    title: "İş Birliği",
    items: [
      { page: "team", label: "Ekip", href: "/team", icon: Users },
      { page: "archive", label: "Arşiv", href: "/archive", icon: Archive }
    ]
  }
];

const quickActions: Array<{ label: string; detail: string; href?: string; icon: LucideIcon; action?: ActionKey }> = [
  { label: "AI Kat Planı", detail: "Plan üret", href: "/ai-floor-plan", icon: Wand2 },
  { label: "İmar Analizi", detail: "Kuralları kontrol et", href: "/regulation-analysis", icon: ShieldCheck },
  { label: "KAKS Hesapla", detail: "Metrikleri yenile", href: "/calculations", icon: Calculator },
  { label: "Rapor Üret", detail: "PDF hazırla", action: "report", icon: FileText },
  { label: "Seçenek Karşılaştır", detail: "Planları kıyasla", href: "/comparisons", icon: Layers3 },
  { label: "Evrak Yükle", detail: "Belge ekle", action: "import", icon: UploadCloud }
];

type ActionKey =
  | "help"
  | "notifications"
  | "report"
  | "share"
  | "ai"
  | "import"
  | "new-project"
  | "project-selector"
  | "generic";

type ActionState = {
  key: ActionKey;
  title: string;
  detail?: string;
};

const teamMembers = [
  { initials: "MY", name: "Mert Y.", role: "Mimar", load: 8 },
  { initials: "EK", name: "Ece K.", role: "Proje Koordinatörü", load: 6 },
  { initials: "AD", name: "Ahmet D.", role: "İmar Uzmanı", load: 5 },
  { initials: "ZY", name: "Zeynep Y.", role: "Hukuk Kontrol", load: 7 },
  { initials: "BK", name: "Berk K.", role: "Modelleme", load: 4 }
];

export function KentselWorkspace({ page }: { page: KentselPage }) {
  const [search, setSearch] = useState("");
  const [action, setAction] = useState<ActionState | null>(null);
  const [toast, setToast] = useState("Hazır");
  const pageConfig = pages[page];

  const triggerAction = (nextAction: ActionState) => {
    setAction(nextAction);
    setToast(`${nextAction.title} açıldı`);
  };

  useEffect(() => {
    const handlePanelAction = (event: Event) => {
      const detail = (event as CustomEvent<ActionState>).detail;
      if (!detail?.title) return;

      setAction(detail);
      setToast(`${detail.title} açıldı`);
    };

    window.addEventListener("kentsel-action", handlePanelAction);

    return () => {
      window.removeEventListener("kentsel-action", handlePanelAction);
    };
  }, []);

  const filtered = useMemo(() => createFilteredData(search), [search]);

  return (
    <div className={ui.appShell}>
      <Sidebar activePage={page} onOpenAction={triggerAction} />

      <div className="min-w-0">
        <TopBar
          actionLabel={pageConfig.action}
          onAction={() => triggerAction({ key: "new-project", title: pageConfig.action })}
          onOpenAction={triggerAction}
          search={search}
          setSearch={setSearch}
          subtitle={pageConfig.subtitle}
          title={pageConfig.title}
        />

        <main className={ui.mainShell}>
          <section className="min-w-0 space-y-5 p-4 sm:p-6 lg:p-7">
            {search ? <SearchResults filtered={filtered} query={search} /> : null}
            <WorkspaceContent
              data={filtered}
              onOpenAction={triggerAction}
              page={page}
            />
          </section>

          <RightRail onOpenAction={triggerAction} />
        </main>
      </div>

      <ActionModal action={action} onClose={() => setAction(null)} />
      <div className="fixed bottom-4 right-4 z-40 hidden rounded-lg border border-[#D8E2ED] bg-white/95 px-3 py-2 text-sm text-[#344054] shadow-[0_14px_40px_rgba(61,82,104,0.16)] backdrop-blur md:block">
        {toast}
      </div>
    </div>
  );
}

function createFilteredData(search: string): KentselData {
  if (!search.trim()) return data;

  const query = normalize(search);
  const filterRows = (rows: AnyRecord[]) =>
    rows.filter((row) => normalize(Object.values(row).join(" ")).includes(query));

  return {
    ...data,
    projects: filterRows(data.projects),
    parcels: filterRows(data.parcels),
    companyExamples: filterRows(data.companyExamples),
    layouts: filterRows(data.layouts),
    cadPlans: filterRows(data.cadPlans),
    warnings: filterRows(data.warnings),
    reviewTasks: filterRows(data.reviewTasks),
    contractRules: filterRows(data.contractRules),
    documentEvidence: filterRows(data.documentEvidence),
    sourceFiles: filterRows(data.sourceFiles)
  };
}

function Sidebar({
  activePage,
  onOpenAction
}: {
  activePage: KentselPage;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <aside className={ui.sidebar}>
      <div className="flex h-[76px] items-center justify-between border-b border-[#E2E8F0] px-5">
        <Link className="flex items-center gap-3" href="/">
          <span className="h-9 w-9 bg-[url('/brand/archiflow-gradient-mark.svg')] bg-contain bg-center bg-no-repeat" />
          <span className="text-xl font-semibold tracking-tight text-[#111827]">ArchiFlow</span>
        </Link>
        <button
          aria-label="Menüyü daralt"
          className="grid h-8 w-8 place-items-center rounded-lg text-[#64748B] transition hover:bg-[#EEF4FF] hover:text-[#315BFF]"
          onClick={() =>
            onOpenAction({
              key: "generic",
              title: "Menü ayarı",
              detail: "Yan menü daraltma kontrolü hazır; responsive görünümde çalışma alanı genişletilir."
            })
          }
          type="button"
        >
          <ChevronDown className="h-4 w-4 rotate-90" />
        </button>
      </div>

      <div className="border-b border-[#E2E8F0] p-4">
        <button
          className={`flex w-full items-center justify-between rounded-lg px-3 py-3 text-left ${ui.control}`}
          onClick={() =>
            onOpenAction({
              key: "project-selector",
              title: "Workspace seçici",
              detail: "Kentsel dönüşüm çalışma alanı ve dataset bağlantısı aktif."
            })
          }
          type="button"
        >
          <span>
            <span className="block text-[11px] font-semibold uppercase text-[#667085]">
              Workspace
            </span>
            <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#111827]">
              <ClipboardCheck className="h-4 w-4 text-[#315BFF]" />
              Kentsel Dönüşüm
            </span>
          </span>
          <ChevronDown className="h-4 w-4 text-[#667085]" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-4 py-4">
        {sidebarSections.map((section) => (
          <div className="mb-5" key={section.title}>
            <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wide text-[#667085]">
              {section.title}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.page === activePage;

                return (
                  <Link
                    className={`flex h-10 w-full items-center gap-3 rounded-lg px-3 text-sm transition ${
                      active
                        ? "bg-[linear-gradient(135deg,#EEF4FF_0%,#EAFBFF_100%)] font-semibold text-[#315BFF] shadow-[inset_3px_0_0_#38BDF8]"
                        : "text-[#344054] hover:bg-[#F8FAFC] hover:text-[#315BFF]"
                    }`}
                    href={item.href}
                    key={item.page}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[#E2E8F0] p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-2.5 shadow-[0_8px_20px_rgba(61,82,104,0.05)]">
          <HardDrive className="h-4 w-4 text-[#315BFF]" />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#111827]">Kentsel dataset</p>
            <p className="truncate text-[11px] text-[#667085]">
              {formatNumber(data.counts.document_qa_evidence)} kanıt / {formatNumber(data.counts.review_tasks)} görev
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-3 shadow-[0_8px_20px_rgba(61,82,104,0.05)]">
          <Avatar label="MY" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[#111827]">Mert Y.</p>
            <p className="text-xs text-[#667085]">Mimar</p>
          </div>
          <MoreHorizontal className="h-4 w-4 text-[#667085]" />
        </div>
      </div>
    </aside>
  );
}

function TopBar({
  actionLabel,
  onAction,
  onOpenAction,
  search,
  setSearch,
  subtitle,
  title
}: {
  actionLabel: string;
  onAction: () => void;
  onOpenAction: (action: ActionState) => void;
  search: string;
  setSearch: (value: string) => void;
  subtitle: string;
  title: string;
}) {
  return (
    <header className={ui.topbar}>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-lg font-semibold tracking-tight text-[#111827] sm:text-xl">
          {title}
        </h1>
        <p className="hidden text-sm text-[#667085] sm:block">{subtitle}</p>
      </div>

      <button
        className={`hidden h-11 items-center gap-3 rounded-lg px-3 lg:flex ${ui.control}`}
        onClick={() => onOpenAction({ key: "project-selector", title: "Proje Seçici" })}
        type="button"
      >
        <MiniBuilding />
        <span className="max-w-[220px] truncate text-sm font-semibold text-[#111827]">
          Kadıköy 4300/2 Projesi
        </span>
        <ChevronDown className="h-4 w-4 text-[#667085]" />
      </button>

      <label className={`order-last flex h-11 w-full items-center gap-2 rounded-lg px-3 text-sm text-[#64748B] xl:order-none xl:w-[360px] ${ui.control}`}>
        <Search className="h-4 w-4" />
        <input
          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#98a2b3]"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Proje, plan, rapor veya malik ara..."
          type="search"
          value={search}
        />
      </label>

      <div className="flex items-center gap-2">
        <IconButton
          label="Yardım"
          icon={HelpCircle}
          onClick={() => onOpenAction({ key: "help", title: "Yardım ve Destek" })}
        />
        <button
          className={`relative grid h-11 w-11 place-items-center rounded-lg ${ui.control}`}
          onClick={() => onOpenAction({ key: "notifications", title: "Bildirimler" })}
          type="button"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 grid h-4 min-w-4 place-items-center rounded-full bg-[linear-gradient(135deg,#315BFF,#38BDF8)] px-1 text-[10px] font-bold text-white">
            3
          </span>
        </button>
        <SecondaryButton
          className="hidden xl:inline-flex"
          icon={FileText}
          onClick={() => onOpenAction({ key: "report", title: "Rapor Al" })}
        >
          Rapor Al
        </SecondaryButton>
        <IconButton
          label="Paylaş"
          icon={Share2}
          onClick={() => onOpenAction({ key: "share", title: "Paylaşım Bağlantısı" })}
        />
        <PrimaryButton icon={Bot} onClick={() => onOpenAction({ key: "ai", title: "AI Asistan" })}>
          AI Asistan
        </PrimaryButton>
        <SecondaryButton
          className="hidden md:inline-flex"
          icon={UploadCloud}
          onClick={() => onOpenAction({ key: "import", title: "İçe Aktar" })}
        >
          İçe Aktar
        </SecondaryButton>
        <PrimaryButton icon={Plus} onClick={onAction}>
          {actionLabel}
        </PrimaryButton>
      </div>
    </header>
  );
}

function WorkspaceContent({
  data: viewData,
  onOpenAction,
  page
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
  page: KentselPage;
}) {
  switch (page) {
    case "projects":
      return <ProjectsPage data={viewData} onOpenAction={onOpenAction} />;
    case "plans":
      return <PlansPage data={viewData} onOpenAction={onOpenAction} />;
    case "models":
      return <ModelsPage data={viewData} onOpenAction={onOpenAction} />;
    case "comparisons":
      return <ComparisonsPage data={viewData} />;
    case "site-analysis":
      return <SiteAnalysisPage data={viewData} />;
    case "regulation-analysis":
      return <RegulationAnalysisPage data={viewData} />;
    case "zoning-rules":
      return <ZoningRulesPage data={viewData} />;
    case "ai-floor-plan":
      return <AiFloorPlanPage data={viewData} onOpenAction={onOpenAction} />;
    case "building-mass":
      return <BuildingMassPage data={viewData} />;
    case "apartment-mix":
      return <ApartmentMixPage data={viewData} />;
    case "calculations":
      return <CalculationsPage data={viewData} />;
    case "files":
      return <FilesPage data={viewData} onOpenAction={onOpenAction} />;
    case "reports":
      return <ReportsPage data={viewData} onOpenAction={onOpenAction} />;
    case "team":
      return <TeamPage data={viewData} />;
    case "archive":
      return <ArchivePage data={viewData} />;
    case "dashboard":
    default:
      return <DashboardPage data={viewData} onOpenAction={onOpenAction} />;
  }
}

function DashboardPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <ProjectOverview onOpenAction={onOpenAction} />
      <MetricGrid />

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <RecentPlans data={viewData} onOpenAction={onOpenAction} />
        <div className="grid gap-5">
          <ZoningCompliance data={viewData} />
          <AiSuggestions onOpenAction={onOpenAction} />
        </div>
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <WorkflowTracker data={viewData} />
        <QuickActions onOpenAction={onOpenAction} />
      </section>

      <section className="grid gap-5 2xl:grid-cols-[minmax(0,1fr)_360px]">
        <ProjectsTable data={viewData} title="Aktif dönüşüm dosyaları" />
        <ModuleOverview data={viewData} />
      </section>
    </>
  );
}

function ProjectOverview({ onOpenAction }: { onOpenAction: (action: ActionState) => void }) {
  const project = data.projects[0] ?? {};
  const contract4300 = data.contractRules.find((rule) => text(rule.parcel_key) === "4300-2") ?? {};

  return (
    <Panel className="overflow-hidden p-5">
      <div className="-mx-5 -mt-5 mb-5 h-1.5 bg-[linear-gradient(90deg,#315BFF_0%,#38BDF8_34%,#2BC48A_68%,#8B5CF6_100%)]" />
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Proje Özeti</p>
          <p className="mt-1 text-sm text-[#667085]">
            Kadıköy 4300/2 parseli için imar, kütle, daire karması ve teklif akışı.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill tone="green">Devam Ediyor</StatusPill>
          <div className="hidden h-9 w-px bg-[#E2E8F0] sm:block" />
          <div>
            <p className="text-[11px] font-semibold uppercase text-[#667085]">Son kayıt</p>
            <p className="text-sm font-semibold text-[#111827]">2 dk önce</p>
          </div>
          <PrimaryButton icon={Plus} onClick={() => onOpenAction({ key: "new-project", title: "Yeni Proje" })}>
            Yeni Proje
          </PrimaryButton>
          <IconButton
            label="Diğer seçenekler"
            icon={MoreHorizontal}
            onClick={() => onOpenAction({ key: "generic", title: "Proje Aksiyonları" })}
          />
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(260px,0.85fr)]">
        <div className="rounded-lg border border-[#D8E2ED] bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <MiniBuilding />
              <div>
                <p className="font-semibold text-[#111827]">Kadıköy 4300/2 Kentsel Dönüşüm</p>
                <p className="text-sm text-[#667085]">
                  {formatNumber(number(project.parcel_area_m2 ?? 844))} m² parsel / {text(project.status, "sharing_ready")}
                </p>
              </div>
            </div>
            <StatusPill tone="blue">Ruhsat Öncesi</StatusPill>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            <InfoBlock label="Proje ilerlemesi" value="65%" progress={65} />
            <InfoBlock
              label="Teklif hazırlığı"
              value={`${formatNumber(number(data.counts.offer_data_packages))} paket`}
              progress={68}
            />
            <InfoBlock
              label="Sözleşme riski"
              value={`${formatNumber(number(contract4300.risk_score ?? 4))} / 100`}
              progress={96}
            />
          </div>
        </div>

        <div className="rounded-lg border border-[#D8E2ED] bg-white/90 p-4 shadow-[0_10px_24px_rgba(61,82,104,0.06)]">
          <p className="text-sm font-semibold text-[#111827]">Kritik kararlar</p>
          <div className="mt-4 grid gap-3">
            <DecisionRow label="KAKS boşluğu" status="AI senaryo üretti" />
            <DecisionRow label="CAD / teklif adet farkı" status="-13 fark" warning />
            <DecisionRow label="Mal sahibi payı" status="15 birim okundu" />
          </div>
        </div>
      </div>
    </Panel>
  );
}

function MetricGrid() {
  const metrics = [
    {
      label: "Parsel",
      value: formatNumber(data.counts.parcels),
      detail: `${formatNumber(data.counts.source_files)} kaynak dosya`,
      icon: MapPinned,
      tone: "blue" as const,
      progress: 100
    },
    {
      label: "CAD adayları",
      value: formatNumber(data.counts.cad_unit_candidates),
      detail: `${formatNumber(data.counts.cad_unit_rooms)} oda eşleşmesi`,
      icon: Grid3X3,
      tone: "purple" as const,
      progress: 82
    },
    {
      label: "QA kanıtı",
      value: formatNumber(data.counts.document_qa_evidence),
      detail: "sözleşme, CAD, PDF ve uyarı",
      icon: FileText,
      tone: "slate" as const,
      progress: 92
    },
    {
      label: "Review kuyruğu",
      value: formatNumber(data.counts.review_tasks),
      detail: `${formatNumber(data.counts.warnings)} açık uyarı`,
      icon: ShieldCheck,
      tone: "amber" as const,
      progress: 64
    },
    {
      label: "Teklif paketi",
      value: formatNumber(data.counts.offer_data_packages),
      detail: "paylaşım ve PDF hazırlığı",
      icon: BarChart3,
      tone: "green" as const,
      progress: 74
    }
  ];

  return (
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
      {metrics.map((metric) => (
        <MetricCard metric={metric} key={metric.label} />
      ))}
    </section>
  );
}

function MetricCard({
  metric
}: {
  metric: {
    label: string;
    value: string;
    detail: string;
    icon: LucideIcon;
    tone: MetricTone;
    progress?: number;
  };
}) {
  const Icon = metric.icon;

  return (
    <Panel className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium leading-4 text-[#475467]">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[#111827]">{metric.value}</p>
          <p className="mt-1 text-xs text-[#667085]">{metric.detail}</p>
        </div>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneClasses[metric.tone]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      {metric.progress ? <ProgressBar className="mt-4" value={metric.progress} /> : null}
    </Panel>
  );
}

function RecentPlans({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  const rows = viewData.layouts.slice(0, 4);

  return (
    <Panel className="min-w-0 p-4">
      <PanelHeader actionHref="/plans" action="Tümünü gör" kicker="Planlar" title="Son planlar ve kütle seçenekleri" />
      <div className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
        {rows.map((layout, index) => (
          <button
            className={`group min-w-0 overflow-hidden rounded-lg border bg-white text-left transition hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(61,82,104,0.12)] ${
              index === 0 ? "border-[#38BDF8] shadow-[0_0_0_1px_rgba(56,189,248,0.2),0_14px_30px_rgba(49,91,255,0.12)]" : "border-[#E2E8F0]"
            }`}
            key={text(layout.option_key)}
            onClick={() =>
              onOpenAction({
                key: "generic",
                title: text(layout.option_name, "Plan detayı"),
                detail: `${text(layout.project_key)} / fit skoru ${formatNumber(number(layout.fit_score))}`
              })
            }
            type="button"
          >
            <div className="relative border-b border-[#E2E8F0] bg-[linear-gradient(135deg,#F8FAFC_0%,#EEF6FF_100%)] p-3">
              {index === 3 ? <MiniMassModel /> : <MiniFloorPlan />}
              <span className="absolute left-3 top-3 grid h-5 w-5 place-items-center rounded border border-[#D8E2ED] bg-white" />
              <Star className={`absolute right-3 top-3 h-5 w-5 ${index === 0 ? "fill-[#F5A524] text-[#F5A524]" : "text-[#98a2b3]"}`} />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-semibold text-[#111827]">{text(layout.option_name)}</p>
              <p className="mt-1 truncate text-xs text-[#667085]">{text(layout.project_key)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {[
                  `${formatNumber(number(layout.unit_count))} birim`,
                  `${formatNumber(number(layout.efficiency_percent))}% verim`,
                  `${formatNumber(number(layout.net_residential_area_m2))} m²`
                ].map((item) => (
                  <span className="rounded-md bg-[#F1F5F9] px-2 py-1 text-[11px] font-medium text-[#344054]" key={item}>
                    {item}
                  </span>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between text-xs text-[#667085]">
                <span>Fit {formatNumber(number(layout.fit_score))}</span>
                <MoreHorizontal className="h-4 w-4" />
              </div>
            </div>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function ZoningCompliance({ data: viewData }: { data: KentselData }) {
  const contract4300 = viewData.contractRules.find((rule) => text(rule.parcel_key) === "4300-2") ?? {};
  const cad4300 = viewData.cadPlans.find((plan) => text(plan.parcel_key) === "4300-2") ?? {};
  const rows = [
    ["Sözleşme riski", `${formatNumber(number(contract4300.risk_score ?? 4))} / 100`, "Uygun"],
    ["Müteahhit payı", `${formatNumber(number(contract4300.contractor_share_percent ?? 16.67))}%`, "Uygun"],
    ["CAD aday / teklif", `${formatNumber(number(cad4300.primary_candidate_count ?? 5))} / ${formatNumber(number(cad4300.offer_total_units ?? 18))}`, "Kontrol"],
    ["NET etiket sinyali", `${formatNumber(number(cad4300.net_label_candidate_count ?? 5))} etiket`, "Kontrol"],
    ["Teklif paketi", `${formatNumber(data.counts.offer_data_packages)} paket`, "Uygun"]
  ];

  return (
    <Panel className="p-4">
      <PanelHeader actionHref="/regulation-analysis" action="Detay" kicker="İmar" title="Uygunluk kontrolü" />
      <div className="mt-4 space-y-3">
        {rows.map(([label, value, status]) => (
          <CheckRow key={label} label={label} status={status} value={value} />
        ))}
      </div>
    </Panel>
  );
}

function AiSuggestions({ onOpenAction }: { onOpenAction: (action: ActionState) => void }) {
  const suggestions = [
    ["CAD/teklif adet farkını açıkla", "4300-2"],
    ["Mal sahibi dağılımını özetle", "15 / 3"],
    ["Review kuyruğunda öncelik ver", "49 görev"],
    ["Teklif paketi için yönetici özeti yaz", "3 paket"]
  ];

  return (
    <Panel className="p-4">
      <PanelHeader actionHref="/ai-floor-plan" action="AI ekranı" kicker="AI" title="Öneriler" />
      <div className="mt-4 space-y-2">
        {suggestions.map(([label, value]) => (
          <button
            className="flex w-full items-center justify-between gap-3 rounded-lg border border-[#E2E8F0] bg-white px-3 py-3 text-left transition hover:border-[#38BDF8] hover:bg-[#F0FBFF] hover:shadow-[0_10px_24px_rgba(56,189,248,0.12)]"
            key={label}
            onClick={() => onOpenAction({ key: "ai", title: label, detail: value })}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-2">
              <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white ${ui.aiGradient}`}>
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="truncate text-sm font-medium text-[#344054]">{label}</span>
            </span>
            <span className="shrink-0 text-xs font-semibold text-[#18a05e]">{value}</span>
          </button>
        ))}
      </div>
    </Panel>
  );
}

function WorkflowTracker({ data: viewData }: { data: KentselData }) {
  const modules = viewData.modules.length ? viewData.modules : data.modules;

  return (
    <Panel className="min-w-0 p-4">
      <PanelHeader actionHref="/archive" action="Modül arşivi" kicker="Plan / Manage / Flow" title="Kentsel dönüşüm işlem akışı" />
      <div className="mt-4 grid gap-3">
        {modules.map((module) => {
          const progress = statusProgress(text(module.status));

          return (
            <div className="grid gap-3 rounded-lg border border-[#E2E8F0] bg-white/90 p-3 transition hover:border-[#8FA9C7] hover:shadow-[0_10px_26px_rgba(61,82,104,0.08)] md:grid-cols-[36px_minmax(0,1fr)_120px]" key={text(module.module_key)}>
              <span className={`grid h-9 w-9 place-items-center rounded-lg text-sm font-semibold ${moduleToneClass(text(module.status))}`}>
                {formatNumber(number(module.sequence_no))}
              </span>
              <div className="min-w-0">
                <p className="font-semibold text-[#111827]">{text(module.display_name)}</p>
                <p className="mt-1 text-sm text-[#667085]">{text(module.purpose)}</p>
              </div>
              <div className="flex items-center gap-2 md:block">
                <p className="w-10 text-sm font-semibold text-[#111827] md:mb-2 md:w-auto md:text-right">
                  {progress}%
                </p>
                <ProgressBar value={progress} />
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

function QuickActions({ onOpenAction }: { onOpenAction: (action: ActionState) => void }) {
  return (
    <Panel className="p-4">
      <PanelHeader actionHref="/calculations" action="Özelleştir" kicker="Hızlı işlem" title="Bugünkü aksiyonlar" />
      <div className="mt-4 grid grid-cols-2 gap-3">
        {quickActions.map((action) => {
          const Icon = action.icon;
          const content = (
            <>
              <span className={`grid h-9 w-9 place-items-center rounded-lg ${quickActionTone(action.label)}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="mt-3 block text-sm font-semibold text-[#111827]">{action.label}</span>
              <span className="mt-1 block text-xs text-[#667085]">{action.detail}</span>
            </>
          );

          if (action.href) {
            return (
              <Link
                className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#38BDF8] hover:bg-[#F0FBFF] hover:shadow-[0_10px_24px_rgba(56,189,248,0.12)]"
                href={action.href}
                key={action.label}
              >
                {content}
              </Link>
            );
          }

          return (
            <button
              className="rounded-lg border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#38BDF8] hover:bg-[#F0FBFF] hover:shadow-[0_10px_24px_rgba(56,189,248,0.12)]"
              key={action.label}
              onClick={() => onOpenAction({ key: action.action ?? "generic", title: action.label })}
              type="button"
            >
              {content}
            </button>
          );
        })}
      </div>
    </Panel>
  );
}

function ProjectsPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Toplam parsel" value={data.counts.parcels} />
        <StatCard label="Aktif prototip proje" value={data.counts.input_projects} />
        <StatCard label="Kaynak dosya" value={data.counts.source_files} />
        <StatCard label="Review görevi" value={data.counts.review_tasks} />
      </section>
      <ProjectsTable data={viewData} title="Proje portföyü" />
      <Panel className="p-4">
        <PanelHeader action="Proje oluştur" kicker="Kentsel dataset" title="Firma proje örnekleri" />
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {viewData.companyExamples.slice(0, 6).map((item) => (
            <button
              className="rounded-lg border border-[#E2E8F0] bg-white/80 p-4 text-left transition hover:border-[#38BDF8] hover:bg-[#F0FBFF]"
              key={text(item.example_key)}
              onClick={() =>
                onOpenAction({
                  key: "generic",
                  title: `${text(item.parcel_key)} proje örneği`,
                  detail: `${formatNumber(number(item.evidence_count))} kanıt, ${formatNumber(number(item.review_task_count))} görev`
                })
              }
              type="button"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#111827]">{text(item.parcel_key)}</p>
                <StatusPill tone={riskTone(number(item.contract_risk_score))}>
                  Risk {formatNumber(number(item.contract_risk_score))}
                </StatusPill>
              </div>
              <p className="mt-2 text-sm text-[#667085]">{qualityLabel(text(item.reconciliation_quality))}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <MiniValue label="CAD" value={formatNumber(number(item.cad_unit_candidate_count))} />
                <MiniValue label="Teklif" value={formatNumber(number(item.offer_total_units))} />
                <MiniValue label="Kanıt" value={formatNumber(number(item.evidence_count))} />
              </div>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
}

function ProjectsTable({ data: viewData, title }: { data: KentselData; title: string }) {
  const rows = viewData.projects.map((project) => [
    text(project.project_name),
    text(project.status),
    text(project.parcel_key),
    `${formatNumber(number(project.parcel_area_m2))} m²`,
    `${formatNumber(number(project.kaks_or_emsal))}`,
    `${formatNumber(number(project.estimated_unit_capacity))} birim`
  ]);

  return (
    <Panel className="min-w-0 overflow-hidden">
      <div className="border-b border-[#edf1f6] p-4">
        <PanelHeader actionHref="/projects" action="Tümü" kicker="Portföy" title={title} />
      </div>
      <DataTable columns={["Proje", "Durum", "Parsel", "Alan", "Emsal", "Kapasite"]} rows={rows} />
    </Panel>
  );
}

function ModuleOverview({ data: viewData }: { data: KentselData }) {
  const moduleCards = [
    {
      title: "Projeler",
      metric: viewData.counts.input_projects,
      detail: `${formatNumber(viewData.counts.parcels)} parsel verisi`,
      icon: FolderKanban,
      tone: "blue" as const,
      href: "/projects"
    },
    {
      title: "Planlar",
      metric: viewData.counts.unit_layout_options,
      detail: `${formatNumber(viewData.counts.cad_unit_candidates)} CAD adayı`,
      icon: Grid3X3,
      tone: "purple" as const,
      href: "/plans"
    },
    {
      title: "3D Modeller",
      metric: viewData.counts.building_envelope_results,
      detail: `${formatNumber(viewData.counts.core_placement_results)} çekirdek sonucu`,
      icon: Box,
      tone: "slate" as const,
      href: "/models"
    },
    {
      title: "Hesaplamalar",
      metric: viewData.counts.sharing_payment_options,
      detail: `${formatNumber(viewData.counts.offer_data_packages)} teklif paketi`,
      icon: Calculator,
      tone: "green" as const,
      href: "/calculations"
    }
  ];

  return (
    <Panel className="p-4">
      <PanelHeader actionHref="/archive" action="Yönet" kicker="Modüller" title="Çalışma alanı özeti" />
      <div className="mt-4 grid gap-3">
        {moduleCards.map((module) => {
          const Icon = module.icon;

          return (
            <Link
              className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-white p-3 text-left transition hover:border-[#38BDF8] hover:bg-[#F0FBFF]"
              href={module.href}
              key={module.title}
            >
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-lg ${toneClasses[module.tone]}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[#111827]">{module.title}</span>
                <span className="block truncate text-xs text-[#667085]">{module.detail}</span>
              </span>
              <span className="text-xl font-semibold text-[#111827]">{formatNumber(module.metric)}</span>
            </Link>
          );
        })}
      </div>
    </Panel>
  );
}

function PlansPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <RecentPlans data={viewData} onOpenAction={onOpenAction} />
      <Panel className="p-4">
        <PanelHeader actionHref="/ai-floor-plan" action="AI plan ekranı" kicker="CAD" title="4300/2 bağımsız bölüm adayları" />
        <DataTable
          columns={["Aday", "Yöntem", "Tip", "Karma", "Alan", "Oda", "Güven"]}
          rows={viewData.cadCandidates4300.map((item) => [
            text(item.candidate_key),
            methodLabel(text(item.method)),
            unitLabel(text(item.unit_type)),
            text(item.room_mix),
            `${formatNumber(number(item.area_m2))} m²`,
            formatNumber(number(item.room_count)),
            `${formatNumber(number(item.confidence_score) * 100)}%`
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/apartment-mix" action="Daire karması" kicker="Plan seçenekleri" title="AI layout sonuçları" />
        <DataTable
          columns={["Seçenek", "Proje", "Hedef", "Birim", "Ortalama", "Verim", "Fit"]}
          rows={viewData.layouts.map((item) => [
            text(item.option_name),
            text(item.project_key),
            formatNumber(number(item.target_unit_count)),
            formatNumber(number(item.unit_count)),
            `${formatNumber(number(item.avg_unit_area_m2))} m²`,
            `${formatNumber(number(item.efficiency_percent))}%`,
            formatNumber(number(item.fit_score))
          ])}
        />
      </Panel>
    </>
  );
}

function ModelsPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {viewData.envelopes.map((item) => (
          <Panel className="p-4" key={text(item.project_key)}>
            <PanelHeader action="Aç" kicker={text(item.project_key)} title="Yapılaşma zarfı" />
            <MiniMassModel className="mt-4 h-[180px]" />
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <MiniValue label="İnşaat alanı" value={`${formatNumber(number(item.total_construction_area_m2))} m²`} />
              <MiniValue label="Kat" value={formatNumber(number(item.estimated_floor_count))} />
              <MiniValue label="Oturum" value={`${formatNumber(number(item.buildable_footprint_m2))} m²`} />
              <MiniValue label="Otopark" value={formatNumber(number(item.parking_need_estimate))} />
            </div>
          </Panel>
        ))}
      </section>
      <Panel className="p-4">
        <PanelHeader action="Simülasyon" kicker="Çekirdek" title="Çekirdek yerleşim sonuçları" />
        <DataTable
          columns={["Proje", "Tip", "Çekirdek", "Dolaşım", "Net kat", "Verim", "Review"]}
          rows={viewData.cores.map((item) => [
            text(item.project_key),
            text(item.core_type),
            `${formatNumber(number(item.core_area_m2))} m²`,
            `${formatNumber(number(item.circulation_area_m2))} m²`,
            `${formatNumber(number(item.net_floor_area_m2))} m²`,
            `${formatNumber(number(item.core_efficiency_percent))}%`,
            number(item.review_required) ? "Gerekli" : "Temiz"
          ])}
        />
      </Panel>
      <button
        className="rounded-lg border border-[#D8E2ED] bg-white px-4 py-3 text-sm font-semibold text-[#315BFF] shadow-sm transition hover:border-[#38BDF8] hover:bg-[#F0FBFF]"
        onClick={() => onOpenAction({ key: "generic", title: "Model yükleme", detail: "IFC/RVT/DWG model alanı hazır." })}
        type="button"
      >
        Model yükleme alanını aç
      </button>
    </>
  );
}

function ComparisonsPage({ data: viewData }: { data: KentselData }) {
  const layoutRows = viewData.layouts.slice(0, 3);
  const labels = ["Birim", "Ortalama Alan", "Net Alan", "Verim", "Fit Skoru"];

  return (
    <>
      <Panel className="p-4">
        <PanelHeader actionHref="/plans" action="Plan seç" kicker="Karşılaştırma" title="Plan seçenekleri" />
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {layoutRows.map((item, index) => (
            <div className="rounded-lg border border-[#E2E8F0] bg-white/80 p-4" key={text(item.option_key)}>
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[#111827]">{text(item.option_name)}</p>
                <StatusPill tone={index === 0 ? "green" : "blue"}>{index === 0 ? "Önerilen" : `V${index + 1}`}</StatusPill>
              </div>
              <MiniFloorPlan className="mt-4 h-[160px]" />
              <div className="mt-4 space-y-2">
                {labels.map((label) => (
                  <InfoLine key={label} label={label} value={comparisonValue(label, item)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/reports" action="Risk raporu" kicker="Sözleşme" title="Teklif risk karşılaştırması" />
        <DataTable
          columns={["Parsel", "Risk", "Seviye", "Karar", "Mal sahibi", "Müteahhit", "Pay"]}
          rows={viewData.contractRules.map((item) => [
            text(item.parcel_key),
            formatNumber(number(item.risk_score)),
            riskLabel(text(item.risk_level)),
            decisionLabel(text(item.decision_recommendation)),
            formatNumber(number(item.owner_units_total)),
            formatNumber(number(item.contractor_units_total)),
            `${formatNumber(number(item.contractor_share_percent))}%`
          ])}
        />
      </Panel>
    </>
  );
}

function SiteAnalysisPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Parsel" value={data.counts.parcels} />
        <StatCard label="Eşleşmiş" value={viewData.parcels.filter((item) => text(item.status) === "matched").length} />
        <StatCard label="CAD planı" value={data.counts.cad_unit_plans} />
        <StatCard label="Eski metraj" value={data.counts.excel_old_metraj} />
      </section>
      <Panel className="p-4">
        <PanelHeader actionHref="/files" action="Kaynaklar" kicker="Parsel" title="Ada-parsel eşleşmeleri" />
        <DataTable
          columns={["Parsel", "Ada", "Parsel", "Durum", "Kalite", "İlk not"]}
          rows={viewData.parcels.map((item) => [
            text(item.parcel_key),
            formatNumber(number(item.ada)),
            formatNumber(number(item.parsel)),
            statusLabel(text(item.status)),
            qualityLabel(text(item.reconciliation_quality)),
            Array.isArray(item.review_notes) ? text(item.review_notes[0]) : "-"
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/plans" action="CAD detayı" kicker="CAD" title="Plan dosyası okuma sonuçları" />
        <DataTable
          columns={["Parsel", "Yöntem", "Aday", "NET", "Sekans", "Teklif", "Güven"]}
          rows={viewData.cadPlans.map((item) => [
            text(item.parcel_key),
            methodLabel(text(item.primary_method)),
            formatNumber(number(item.candidate_count)),
            formatNumber(number(item.net_label_candidate_count)),
            formatNumber(number(item.sequence_candidate_count)),
            formatNumber(number(item.offer_total_units)),
            `${formatNumber(number(item.confidence_score) * 100)}%`
          ])}
        />
      </Panel>
    </>
  );
}

function RegulationAnalysisPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {viewData.projects.map((project) => (
          <Panel className="p-4" key={text(project.project_key)}>
            <PanelHeader action="Kontrol" kicker={text(project.parcel_key)} title="İmar girdisi" />
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MiniValue label="Parsel alanı" value={`${formatNumber(number(project.parcel_area_m2))} m²`} />
              <MiniValue label="KAKS" value={formatNumber(number(project.kaks_or_emsal))} />
              <MiniValue label="TAKS" value={formatNumber(number(project.taks))} />
              <MiniValue label="Hmax" value={`${formatNumber(number(project.height_limit_m))} m`} />
            </div>
          </Panel>
        ))}
      </section>
      <Panel className="p-4">
        <PanelHeader actionHref="/reports" action="Sözleşme raporu" kicker="Risk" title="Sözleşme kural değerlendirmeleri" />
        <DataTable
          columns={["Parsel", "Tarih", "Risk", "Seviye", "Karar", "Bulgu", "Güven"]}
          rows={viewData.contractRules.map((item) => [
            text(item.parcel_key),
            text(item.proposal_date),
            formatNumber(number(item.risk_score)),
            riskLabel(text(item.risk_level)),
            decisionLabel(text(item.decision_recommendation)),
            formatNumber(number(item.finding_count)),
            `${formatNumber(number(item.confidence_score) * 100)}%`
          ])}
        />
      </Panel>
      <ZoningCompliance data={viewData} />
    </>
  );
}

function ZoningRulesPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <WorkflowTracker data={viewData} />
      <Panel className="p-4">
        <PanelHeader actionHref="/team" action="Review" kicker="Uyarılar" title="Açık mevzuat ve veri uyarıları" />
        <DataTable
          columns={["ID", "Parsel", "Seviye", "Kod", "Mesaj", "Durum"]}
          rows={viewData.warnings.map((item) => [
            formatNumber(number(item.id)),
            text(item.parcel_key, "genel"),
            warningLevel(text(item.level)),
            text(item.code),
            text(item.message),
            statusLabel(text(item.status))
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/archive" action="Kanıtlar" kicker="QA" title="Öncelikli kanıt kayıtları" />
        <EvidenceList rows={viewData.documentEvidence.slice(0, 8)} />
      </Panel>
    </>
  );
}

function AiFloorPlanPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelHeader action="Ayarlar" kicker="AI kat planı" title="4300/2 plan çalışma yüzeyi" />
          <div className="flex gap-2">
            <SecondaryButton icon={Settings} onClick={() => onOpenAction({ key: "generic", title: "Plan ayarları" })}>
              Ayarlar
            </SecondaryButton>
            <PrimaryButton icon={Wand2} onClick={() => onOpenAction({ key: "ai", title: "AI plan üretimi" })}>
              Plan Üret
            </PrimaryButton>
          </div>
        </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[240px_minmax(0,1fr)_280px]">
          <Panel className="p-3">
            <PanelHeader kicker="Katmanlar" title="Görünürlük" />
            <LayerList />
          </Panel>
          <div className="rounded-lg border border-[#E2E8F0] bg-[linear-gradient(135deg,#FFFFFF_0%,#EEF6FF_100%)] p-4">
            <MiniFloorPlan className="h-[440px]" />
          </div>
          <Panel className="p-3">
            <PanelHeader kicker="Plan bilgisi" title="Seçenek 2" />
            <div className="mt-4 space-y-2">
              <InfoLine label="NET etiket" value="5" />
              <InfoLine label="Sekans adayı" value="9" />
              <InfoLine label="Toplam aday" value="14" />
              <InfoLine label="Güven" value="69%" />
            </div>
          </Panel>
        </div>
      </Panel>
      <PlansPage data={viewData} onOpenAction={onOpenAction} />
    </>
  );
}

function BuildingMassPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <ModelsPage data={viewData} onOpenAction={() => undefined} />
      <Panel className="p-4">
        <PanelHeader actionHref="/calculations" action="Hesap" kicker="Kütle diyagramı" title="Yapılaşma süreci" />
        <div className="mt-4 grid gap-4 md:grid-cols-5">
          {["Parsel", "Çekme", "Oturum", "Çekirdek", "Final kütle"].map((step, index) => (
            <div className="rounded-lg border border-[#E2E8F0] bg-white/80 p-3 text-center" key={step}>
              <MiniMassModel className="h-24" />
              <p className="mt-2 text-xs font-semibold text-[#315BFF]">0{index + 1}</p>
              <p className="text-sm font-semibold text-[#111827]">{step}</p>
            </div>
          ))}
        </div>
      </Panel>
    </>
  );
}

function ApartmentMixPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Daire karması" value={data.counts.unit_mix_options} />
        <StatCard label="Yerleşim seçeneği" value={data.counts.unit_layout_options} />
        <StatCard label="Paylaşım senaryosu" value={data.counts.sharing_payment_options} />
        <StatCard label="Dağıtım satırı" value={data.counts.sharing_unit_allocations} />
      </section>
      <Panel className="p-4">
        <PanelHeader action="Optimize et" kicker="Daire karması" title="Tip, adet ve alan dağılımı" />
        <DataTable
          columns={["Proje", "Seçenek", "Tip", "Karma", "Adet", "Ort. Alan", "Toplam"]}
          rows={viewData.mixes.map((item) => [
            text(item.project_key),
            shortKey(text(item.option_key)),
            unitLabel(text(item.unit_type)),
            text(item.room_mix),
            formatNumber(number(item.unit_count)),
            `${formatNumber(number(item.avg_area_m2))} m²`,
            `${formatNumber(number(item.total_area_m2))} m²`
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/reports" action="Teklif" kicker="Paylaşım" title="Mal sahibi / müteahhit senaryoları" />
        <DataTable
          columns={["Senaryo", "Proje", "Mal sahibi", "Müteahhit", "Pay", "Adalet", "Hazırlık"]}
          rows={viewData.payments.map((item) => [
            text(item.option_name),
            text(item.project_key),
            formatNumber(number(item.owner_units)),
            formatNumber(number(item.contractor_units)),
            `${formatNumber(number(item.contractor_share_percent))}%`,
            formatNumber(number(item.fairness_score)),
            formatNumber(number(item.offer_ready_score))
          ])}
        />
      </Panel>
    </>
  );
}

function CalculationsPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <MetricGrid />
      <Panel className="p-4">
        <PanelHeader action="Yeniden hesapla" kicker="Alan" title="Yapılaşma ve verimlilik hesapları" />
        <DataTable
          columns={["Proje", "Parsel", "Oturum", "İnşaat", "Tipik kat", "Kapasite", "Otopark"]}
          rows={viewData.envelopes.map((item) => [
            text(item.project_key),
            `${formatNumber(number(item.parcel_area_m2))} m²`,
            `${formatNumber(number(item.buildable_footprint_m2))} m²`,
            `${formatNumber(number(item.total_construction_area_m2))} m²`,
            `${formatNumber(number(item.typical_floor_area_m2))} m²`,
            formatNumber(number(item.estimated_unit_capacity)),
            formatNumber(number(item.parking_need_estimate))
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/apartment-mix" action="Paylaşım" kicker="Finans" title="Katılım payı ve teklif hazırlığı" />
        <DataTable
          columns={["Senaryo", "Mevcut alan", "Mal sahibi alan", "Fark", "Katılım", "Hazırlık", "Review"]}
          rows={viewData.payments.map((item) => [
            text(item.option_name),
            `${formatNumber(number(item.existing_area_m2))} m²`,
            `${formatNumber(number(item.owner_area_m2))} m²`,
            `${formatNumber(number(item.owner_area_delta_m2))} m²`,
            formatCurrency(number(item.participation_payment_estimate)),
            formatNumber(number(item.offer_ready_score)),
            number(item.review_required) ? "Gerekli" : "Temiz"
          ])}
        />
      </Panel>
    </>
  );
}

function FilesPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-4">
        <StatCard label="Kaynak dosya" value={data.counts.source_files} />
        <StatCard label="CAD plan" value={data.counts.cad_plans} />
        <StatCard label="PDF teklif" value={data.counts.proposal_v2_records} />
        <StatCard label="QA kanıtı" value={data.counts.document_qa_evidence} />
      </section>
      <Panel className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <PanelHeader action="Depolama" kicker="Dosyalar" title="Kaynak dosyalar" />
          <PrimaryButton icon={UploadCloud} onClick={() => onOpenAction({ key: "import", title: "Dosya Yükle" })}>
            Dosya Yükle
          </PrimaryButton>
        </div>
        <DataTable
          columns={["Dosya", "Aşama", "Tip", "Uzantı", "Boyut", "Tarih"]}
          rows={viewData.sourceFiles.map((item) => [
            text(item.relative_path),
            text(item.stage),
            text(item.kind),
            text(item.extension),
            `${formatNumber(number(item.size_mb))} MB`,
            text(item.modified)
          ])}
        />
      </Panel>
      <Panel className="p-4">
        <PanelHeader actionHref="/zoning-rules" action="Kanıt incele" kicker="QA" title="Doküman kanıtları" />
        <EvidenceList rows={viewData.documentEvidence} />
      </Panel>
    </>
  );
}

function ReportsPage({
  data: viewData,
  onOpenAction
}: {
  data: KentselData;
  onOpenAction: (action: ActionState) => void;
}) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-3">
        {viewData.offers.map((item) => (
          <Panel className="p-4" key={text(item.package_key)}>
            <PanelHeader action="İndir" kicker={text(item.project_key)} title="Teklif veri paketi" />
            <div className="mt-4 space-y-2">
              <InfoLine label="Durum" value={statusLabel(text(item.package_status))} />
              <InfoLine label="Hazırlık" value={`${formatNumber(number(item.offer_ready_score))}/100`} />
              <InfoLine label="Review" value={number(item.review_required) ? "Gerekli" : "Temiz"} />
            </div>
            <button
              className={`mt-4 w-full rounded-lg px-4 py-2.5 text-sm font-semibold ${ui.primary}`}
              onClick={() => onOpenAction({ key: "report", title: "Teklif raporu", detail: text(item.package_key) })}
              type="button"
            >
              Raporu aç
            </button>
          </Panel>
        ))}
      </section>
      <Panel className="p-4">
        <PanelHeader actionHref="/regulation-analysis" action="Kural detayı" kicker="Sözleşme" title="Kural bulguları" />
        <DataTable
          columns={["Parsel", "Risk", "Seviye", "Karar", "Bulgu", "Toplam birim", "Müteahhit payı"]}
          rows={viewData.contractRules.map((item) => [
            text(item.parcel_key),
            formatNumber(number(item.risk_score)),
            riskLabel(text(item.risk_level)),
            decisionLabel(text(item.decision_recommendation)),
            formatNumber(number(item.finding_count)),
            formatNumber(number(item.total_units)),
            `${formatNumber(number(item.contractor_share_percent))}%`
          ])}
        />
      </Panel>
    </>
  );
}

function TeamPage({ data: viewData }: { data: KentselData }) {
  return (
    <>
      <section className="grid gap-4 md:grid-cols-5">
        {teamMembers.map((member) => (
          <Panel className="p-4" key={member.initials}>
            <div className="flex items-center gap-3">
              <Avatar label={member.initials} />
              <div>
                <p className="font-semibold text-[#111827]">{member.name}</p>
                <p className="text-xs text-[#667085]">{member.role}</p>
              </div>
            </div>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs">
                <span className="text-[#667085]">Yük</span>
                <span className="font-semibold text-[#111827]">{member.load} görev</span>
              </div>
              <ProgressBar value={member.load * 10} />
            </div>
          </Panel>
        ))}
      </section>
      <Panel className="p-4">
        <PanelHeader actionHref="/zoning-rules" action="Uyarılar" kicker="Review" title="Öncelikli görevler" />
        <DataTable
          columns={["Öncelik", "Parsel", "Kategori", "Seviye", "Başlık", "Durum"]}
          rows={viewData.reviewTasks.map((item) => [
            formatNumber(number(item.priority)),
            text(item.parcel_key),
            text(item.category),
            warningLevel(text(item.level)),
            text(item.summary),
            statusLabel(text(item.status))
          ])}
        />
      </Panel>
    </>
  );
}

function ArchivePage({ data: viewData }: { data: KentselData }) {
  const countRows = Object.entries(data.counts)
    .sort(([, left], [, right]) => right - left)
    .slice(0, 18)
    .map(([key, value]) => [archiveLabel(key), formatNumber(value)]);

  return (
    <>
      <Panel className="p-4">
        <PanelHeader action="Dışa aktar" kicker="Dataset" title="Kentsel otomasyon veri arşivi" />
        <DataTable columns={["Veri alanı", "Kayıt"]} rows={countRows} />
      </Panel>
      <WorkflowTracker data={viewData} />
    </>
  );
}

function SearchResults({ filtered, query }: { filtered: KentselData; query: string }) {
  const total =
    filtered.projects.length +
    filtered.parcels.length +
    filtered.layouts.length +
    filtered.warnings.length +
    filtered.documentEvidence.length +
    filtered.sourceFiles.length;

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[#111827]">Arama sonuçları</p>
          <p className="text-sm text-[#667085]">
            “{query}” için {formatNumber(total)} eşleşme bulundu.
          </p>
        </div>
        <StatusPill tone="blue">Canlı filtre</StatusPill>
      </div>
    </Panel>
  );
}

function RightRail({ onOpenAction }: { onOpenAction: (action: ActionState) => void }) {
  return (
    <aside className="hidden min-h-0 border-l border-[#E2E8F0] bg-white/82 p-5 backdrop-blur xl:block">
      <div className="sticky top-[96px] space-y-5">
        <Panel className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={`grid h-10 w-10 place-items-center rounded-lg text-white shadow-[0_12px_24px_rgba(139,92,246,0.22)] ${ui.aiGradient}`}>
                <Sparkles className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold text-[#111827]">AI Asistan</p>
                <p className="text-xs text-[#667085]">Mimari karar ortağı</p>
              </div>
            </div>
            <button
              aria-label="AI menüsü"
              className="text-[#667085]"
              onClick={() => onOpenAction({ key: "ai", title: "AI Asistan" })}
              type="button"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-[#344054]">
            Kentsel otomasyon verisine göre 4300/2 dosyasında sözleşme riski düşük,
            CAD/teklif adet farkı için manuel teyit gerekiyor.
          </p>
          <div className="mt-4 grid gap-2">
            {["Plan seçeneği üret", "İmar notlarını açıkla", "Paylaşım farkını özetle"].map((item) => (
              <button
                className="flex items-center justify-between rounded-lg border border-[#E2E8F0] bg-white/80 px-3 py-2.5 text-sm font-medium text-[#344054] transition hover:border-[#38BDF8] hover:bg-[#F0FBFF]"
                key={item}
                onClick={() => onOpenAction({ key: "ai", title: item })}
                type="button"
              >
                {item}
                <ChevronDown className="h-4 w-4 -rotate-90 text-[#38BDF8]" />
              </button>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <PanelHeader actionHref="/team" action="Tümü" kicker="Aktivite" title="Proje hareketleri" />
          <div className="mt-4 space-y-4">
            {data.warnings.slice(0, 4).map((item) => (
              <div className="flex gap-3" key={text(item.id)}>
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${text(item.level) === "risk" ? "bg-[#EF5B5B]" : text(item.level) === "review" ? "bg-[#F5A524]" : "bg-[#2BC48A]"}`} />
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-[#111827]">{text(item.message)}</p>
                  <p className="mt-0.5 text-xs text-[#667085]">{text(item.parcel_key, "genel")}</p>
                </div>
                <span className="shrink-0 text-xs text-[#667085]">açık</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel className="p-4">
          <PanelHeader actionHref="/team" action="Takvim" kicker="Ekip" title="Toplantı ve ekip" />
          <div className="mt-4 flex items-center gap-2">
            {teamMembers.map((member) => (
              <Avatar key={member.initials} label={member.initials} />
            ))}
            <button
              aria-label="Ekip üyesi ekle"
              className={`grid h-9 w-9 place-items-center rounded-full ${ui.control}`}
              onClick={() => onOpenAction({ key: "generic", title: "Ekip üyesi ekle" })}
              type="button"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-semibold text-[#111827]">Temmuz 2026</p>
              <CalendarDays className="h-4 w-4 text-[#667085]" />
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
              {[
                ["Pzt", "16"],
                ["Sal", "17"],
                ["Çar", "18"],
                ["Per", "19"],
                ["Cum", "20"],
                ["Cmt", "21"],
                ["Paz", "22"]
              ].map(([day, date]) => (
                <div
                  className={`rounded-lg px-1 py-2 ${
                    date === "18" ? "bg-[linear-gradient(135deg,#315BFF,#38BDF8)] font-semibold text-white shadow-[0_8px_18px_rgba(49,91,255,0.2)]" : "text-[#344054]"
                  }`}
                  key={day}
                >
                  <span className="block text-[10px] text-current opacity-70">{day}</span>
                  <span className="mt-1 block">{date}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-lg bg-[linear-gradient(135deg,#EEF4FF_0%,#EAFBFF_100%)] p-3">
              <p className="text-sm font-semibold text-[#111827]">Belediye ön kontrol</p>
              <p className="mt-1 text-xs text-[#667085]">11:00 - 12:00</p>
            </div>
          </div>
        </Panel>
      </div>
    </aside>
  );
}

function ActionModal({ action, onClose }: { action: ActionState | null; onClose: () => void }) {
  if (!action) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#111827]/24 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-xl border border-[#D8E2ED] bg-white shadow-[0_24px_80px_rgba(61,82,104,0.24)]">
        <div className="h-1.5 bg-[linear-gradient(90deg,#315BFF,#38BDF8,#2BC48A,#8B5CF6)]" />
        <div className="flex items-center justify-between border-b border-[#E2E8F0] bg-[linear-gradient(135deg,#FFFFFF_0%,#F8FAFC_100%)] p-5">
          <div>
            <p className="text-lg font-semibold text-[#111827]">{action.title}</p>
            <p className="mt-1 text-sm text-[#667085]">{modalSubtitle(action)}</p>
          </div>
          <button
            className="grid h-9 w-9 place-items-center rounded-lg text-[#64748B] hover:bg-[#EEF4FF]"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="p-5">
          <ModalContent action={action} />
        </div>
        <div className="flex justify-end gap-2 border-t border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <button
            className="rounded-lg border border-[#D8E2ED] bg-white px-4 py-2 text-sm font-semibold text-[#344054] transition hover:border-[#8FA9C7]"
            onClick={onClose}
            type="button"
          >
            Kapat
          </button>
          <button
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${ui.primary}`}
            onClick={onClose}
            type="button"
          >
            Tamam
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalContent({ action }: { action: ActionState }) {
  if (action.key === "report") {
    return (
      <div className="grid gap-3">
        {data.offers.map((offer) => (
          <InfoLine
            key={text(offer.package_key)}
            label={text(offer.project_key)}
            value={`${formatNumber(number(offer.offer_ready_score))}/100 hazır`}
          />
        ))}
      </div>
    );
  }

  if (action.key === "share") {
    return (
      <div className="rounded-lg bg-[#f7f9fc] p-4">
        <p className="text-sm font-semibold text-[#111827]">Paylaşım linki hazır</p>
        <p className="mt-2 break-all rounded-lg border border-[#D8E2ED] bg-white p-3 text-sm text-[#344054]">
          http://127.0.0.1:3000/dashboard?project=4300-2&mode=review
        </p>
      </div>
    );
  }

  if (action.key === "ai") {
    return (
      <div className="space-y-3 text-sm text-[#344054]">
        <p>
          {action.detail
            ? action.detail
            : "AI asistan, kentsel_automation veri setindeki CAD, teklif, sözleşme ve review kayıtlarını kullanarak özet üretir."}
        </p>
        <InfoLine label="Kanıt havuzu" value={`${formatNumber(data.counts.document_qa_evidence)} kayıt`} />
        <InfoLine label="Açık görev" value={`${formatNumber(data.counts.review_tasks)} görev`} />
        <InfoLine label="Önerilen odak" value="4300/2 CAD-teklif adet farkı" />
      </div>
    );
  }

  if (action.key === "import") {
    return (
      <div className="grid gap-3">
        <InfoLine label="Kaynak" value="kentsel_automation/data/kentsel.db" />
        <InfoLine label="Kaynak dosya" value={`${formatNumber(data.counts.source_files)} dosya`} />
        <InfoLine label="Son snapshot" value="lib/kentsel/kentsel-snapshot.json" />
      </div>
    );
  }

  if (action.key === "project-selector") {
    return (
      <div className="grid gap-2">
        {data.projects.map((project) => (
          <div className="rounded-lg border border-[#E2E8F0] bg-white/80 p-3" key={text(project.project_key)}>
            <p className="font-semibold text-[#111827]">{text(project.project_name)}</p>
            <p className="text-sm text-[#667085]">
              {text(project.parcel_key)} / {formatNumber(number(project.parcel_area_m2))} m²
            </p>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm text-[#344054]">
      <p>{action.detail ?? "Bu aksiyon için çalışma paneli hazırlandı."}</p>
      <InfoLine label="Durum" value="Çalışır UI aksiyonu" />
      <InfoLine label="Veri kaynağı" value="Kentsel otomasyon snapshot" />
    </div>
  );
}

function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`${ui.panel} ${className}`}>
      {children}
    </div>
  );
}

function emitPanelAction(action: string, title: string) {
  window.dispatchEvent(
    new CustomEvent<ActionState>("kentsel-action", {
      detail: {
        key: "generic",
        title: action,
        detail: `${title} paneli için ${action.toLocaleLowerCase("tr-TR")} aksiyonu hazır.`
      }
    })
  );
}

function PanelHeader({
  action,
  actionHref,
  kicker,
  title
}: {
  action?: string;
  actionHref?: string;
  kicker: string;
  title: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-[#667085]">{kicker}</p>
        <h2 className="mt-1 truncate text-base font-semibold text-[#111827]">{title}</h2>
      </div>
      {action && actionHref ? (
        <Link className="shrink-0 text-xs font-semibold text-[#315BFF] transition hover:text-[#38BDF8]" href={actionHref}>
          {action}
        </Link>
      ) : action ? (
        <button
          className="shrink-0 text-xs font-semibold text-[#315BFF] transition hover:text-[#38BDF8]"
          onClick={() => emitPanelAction(action, title)}
          type="button"
        >
          {action}
        </button>
      ) : null}
    </div>
  );
}

function DataTable({ columns, rows }: { columns: string[]; rows: Array<Array<ReactNode>> }) {
  return (
    <div className="mt-4 overflow-x-auto">
      <table className="min-w-[760px] w-full border-collapse text-left text-sm">
        <thead className="bg-[linear-gradient(90deg,#F8FAFC_0%,#EEF6FF_100%)] text-xs font-semibold uppercase text-[#64748B]">
          <tr>
            {columns.map((column) => (
              <th className="px-4 py-3" key={column}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr className="border-t border-[#E2E8F0] transition hover:bg-[#F8FAFC]" key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="max-w-[320px] px-4 py-3 text-[#344054]" key={`${rowIndex}-${cellIndex}`}>
                  <span className={cellIndex === 0 ? "font-semibold text-[#111827]" : ""}>{cell}</span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceList({ rows }: { rows: AnyRecord[] }) {
  return (
    <div className="mt-4 grid gap-3">
      {rows.slice(0, 10).map((item) => (
        <div className="rounded-lg border border-[#E2E8F0] bg-white/80 p-3" key={text(item.evidence_id)}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold text-[#111827]">{text(item.title)}</p>
            <StatusPill tone="blue">{formatNumber(number(item.importance))}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-[#667085]">{text(item.summary)}</p>
          <p className="mt-2 text-xs text-[#98a2b3]">{text(item.source_path, text(item.source_type))}</p>
        </div>
      ))}
    </div>
  );
}

function InfoBlock({
  label,
  progress,
  value
}: {
  label: string;
  progress: number;
  value: string;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-xs font-medium text-[#667085]">{label}</p>
        <p className="text-sm font-semibold text-[#111827]">{value}</p>
      </div>
      <ProgressBar value={progress} />
    </div>
  );
}

function DecisionRow({
  label,
  status,
  warning = false
}: {
  label: string;
  status: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 rounded-full ${warning ? "bg-[#F5A524]" : "bg-[#2BC48A]"}`} />
        <span className="text-sm font-medium text-[#344054]">{label}</span>
      </div>
      <span className="text-xs font-semibold text-[#667085]">{status}</span>
    </div>
  );
}

function CheckRow({ label, status, value }: { label: string; status: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <span
        className={`grid h-6 w-6 shrink-0 place-items-center rounded-full ${
          status === "Uygun" ? ui.softMint : ui.softAmber
        }`}
      >
        <Check className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate text-sm font-medium text-[#344054]">{label}</p>
          <p className="text-sm font-semibold text-[#111827]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function MiniValue({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-lg bg-[linear-gradient(135deg,#F8FAFC_0%,#EEF6FF_100%)] p-3">
      <p className="text-[11px] font-medium text-[#667085]">{label}</p>
      <p className="mt-1 text-sm font-semibold text-[#111827]">{value ?? "-"}</p>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-lg bg-[linear-gradient(135deg,#F8FAFC_0%,#EEF6FF_100%)] px-3 py-2 text-sm">
      <span className="text-[#667085]">{label}</span>
      <span className="text-right font-semibold text-[#111827]">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Panel className="p-4">
      <p className="text-xs font-medium text-[#667085]">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-[#111827]">{typeof value === "number" ? formatNumber(value) : value}</p>
    </Panel>
  );
}

function StatusPill({
  children,
  tone = "blue"
}: {
  children: ReactNode;
  tone?: "blue" | "green" | "amber" | "gray" | "coral";
}) {
  const classes = {
    blue: ui.softBlue,
    green: ui.softMint,
    amber: ui.softAmber,
    coral: ui.softCoral,
    gray: ui.softSlate
  }[tone];

  return (
    <span className={`inline-flex h-7 items-center rounded-md px-2.5 text-xs font-semibold ${classes}`}>
      {children}
    </span>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick
}: {
  icon: LucideIcon;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid h-11 w-11 place-items-center rounded-lg ${ui.control}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}

function PrimaryButton({
  children,
  icon: Icon,
  onClick
}: {
  children: ReactNode;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      className={`inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${ui.primary}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{children}</span>
    </button>
  );
}

function SecondaryButton({
  children,
  className = "",
  icon: Icon,
  onClick
}: {
  children: ReactNode;
  className?: string;
  icon: LucideIcon;
  onClick?: () => void;
}) {
  return (
    <button
      className={`h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold ${ui.control} ${className}`}
      onClick={onClick}
      type="button"
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}

function ProgressBar({ className = "", value }: { className?: string; value: number }) {
  return (
    <div className={`h-2 w-full overflow-hidden rounded-full bg-[#E8EEF4] ${className}`}>
      <div
        className="h-full rounded-full bg-[linear-gradient(90deg,#315BFF_0%,#38BDF8_55%,#2BC48A_100%)]"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Avatar({ label, small = false }: { label: string; small?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#3D5268_0%,#315BFF_100%)] font-semibold text-white shadow-[0_8px_18px_rgba(61,82,104,0.18)] ${
        small ? "h-7 w-7 text-[10px]" : "h-9 w-9 text-xs"
      }`}
    >
      {label}
    </span>
  );
}

function LayerList() {
  return (
    <div className="mt-4 space-y-3">
      {["Duvarlar", "Kapılar", "Pencereler", "Mobilya", "Ölçüler", "Etiketler"].map((item) => (
        <div className="flex items-center justify-between text-sm" key={item}>
          <span className="text-[#344054]">{item}</span>
          <span className="h-2 w-2 rounded-full bg-[#22c55e]" />
        </div>
      ))}
    </div>
  );
}

function MiniBuilding() {
  return (
    <span className="grid h-10 w-12 shrink-0 place-items-center overflow-hidden rounded-md bg-[#eef2f6]">
      <svg aria-hidden="true" className="h-full w-full" viewBox="0 0 80 64">
        <rect fill="#d8e1ec" height="64" width="80" />
        <rect fill="#c2cedd" height="48" width="18" x="10" y="10" />
        <rect fill="#aab8ca" height="38" width="18" x="31" y="20" />
        <rect fill="#eef3f9" height="54" width="20" x="51" y="6" />
        <path d="M8 54H72" stroke="#8fa9c7" strokeWidth="3" />
        <path d="M15 16H24M15 24H24M15 32H24M36 26H44M36 34H44M56 14H66M56 22H66M56 30H66M56 38H66" stroke="#fff" strokeWidth="2" />
      </svg>
    </span>
  );
}

function MiniFloorPlan({ className = "h-[132px]" }: { className?: string }) {
  return (
    <svg aria-label="Kat planı önizlemesi" className={`${className} w-full`} role="img" viewBox="0 0 260 132">
      <rect fill="#ffffff" height="132" width="260" />
      <g stroke="#2f3847" strokeWidth="3">
        <rect fill="#fbfaf7" height="84" width="190" x="34" y="24" />
        <path d="M34 62H224M78 24V108M128 24V108M176 24V108" />
        <path d="M78 62H128M176 62H224" />
      </g>
      <g fill="#cfd8c5" opacity="0.9">
        <circle cx="50" cy="42" r="8" />
        <circle cx="214" cy="44" r="8" />
        <circle cx="202" cy="93" r="8" />
      </g>
      <g fill="#eef2ff" stroke="#a8b8ff">
        <rect height="20" rx="4" width="30" x="88" y="34" />
        <rect height="20" rx="4" width="30" x="138" y="72" />
      </g>
    </svg>
  );
}

function MiniMassModel({ className = "h-[132px]" }: { className?: string }) {
  return (
    <svg aria-label="Kütle modeli önizlemesi" className={`${className} w-full`} role="img" viewBox="0 0 260 132">
      <rect fill="#f7f9fc" height="132" width="260" />
      <path d="M46 96L129 50L215 95L132 121Z" fill="#dfe7ef" />
      <path d="M96 47L132 27L169 47V93L132 113L96 93Z" fill="#ffffff" stroke="#98a7ba" strokeWidth="2" />
      <path d="M132 27V113M96 47L132 67L169 47M96 62L132 82L169 62M96 77L132 97L169 77" stroke="#98a7ba" strokeWidth="2" />
      <path d="M63 91C72 78 83 78 93 91M181 94C191 78 204 80 211 94" stroke="#86b66f" strokeWidth="4" />
    </svg>
  );
}

type MetricTone = "blue" | "green" | "purple" | "amber" | "slate";

const toneClasses: Record<MetricTone, string> = {
  blue: ui.softBlue,
  green: ui.softMint,
  purple: ui.softViolet,
  amber: ui.softAmber,
  slate: ui.softSlate
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(value || 0);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    currency: "TRY",
    maximumFractionDigits: 0,
    style: "currency"
  }).format(value || 0);
}

function text(value: unknown, fallback = "-") {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
}

function number(value: unknown) {
  const next = Number(value);
  return Number.isFinite(next) ? next : 0;
}

function normalize(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replaceAll("ı", "i")
    .replaceAll("ğ", "g")
    .replaceAll("ü", "u")
    .replaceAll("ş", "s")
    .replaceAll("ö", "o")
    .replaceAll("ç", "c");
}

function statusProgress(status: string) {
  if (status === "ready_prototype") return 100;
  if (status === "dataset_ready") return 82;
  if (status === "planned") return 46;
  return 64;
}

function moduleToneClass(status: string) {
  if (status === "ready_prototype") return ui.softMint;
  if (status === "dataset_ready") return ui.softBlue;
  if (status === "planned") return ui.softSlate;
  if (status.includes("review")) return ui.softAmber;
  return ui.softViolet;
}

function quickActionTone(label: string) {
  if (label.includes("AI")) return ui.softViolet;
  if (label.includes("Rapor")) return ui.softMint;
  if (label.includes("Evrak")) return ui.softAmber;
  if (label.includes("KAKS")) return ui.softBlue;
  return ui.softBlue;
}

function riskTone(score: number): "green" | "amber" | "gray" | "coral" {
  if (score >= 85) return "coral";
  if (score >= 70) return "amber";
  if (score > 0) return "green";
  return "gray";
}

function statusLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace("sharing ready", "paylaşım hazır")
    .replace("review required", "review gerekli")
    .replace("open", "açık")
    .replace("matched", "eşleşti")
    .replace("cad yok", "CAD yok");
}

function qualityLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace("olcek farki var", "ölçek farkı var")
    .replace("farkli kapsam veya tekrarli plan", "farklı kapsam / tekrarlı plan")
    .replace("cad yok", "CAD yok")
    .replace("excel yok", "Excel yok");
}

function warningLevel(value: string) {
  if (value === "risk") return "Risk";
  if (value === "review") return "Review";
  if (value === "info") return "Bilgi";
  return value || "-";
}

function riskLabel(value: string) {
  return value
    .replace("blocking", "Blokaj")
    .replace("high", "Yüksek")
    .replace("medium", "Orta")
    .replace("low", "Düşük");
}

function decisionLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace("legal financial review required", "hukuk/finans review")
    .replace("manual review required", "manuel review")
    .replace("hold identity review", "kimlik teyidi")
    .replace("complete distribution before contract", "dağıtım tamamla")
    .replace("review then draft", "kontrol sonra taslak");
}

function methodLabel(value: string) {
  return value.replace("net_area_label", "NET etiketi").replace("sequence_cluster", "oda sekansı");
}

function unitLabel(value: string) {
  return value.replace("daire_", "Daire ").replace("dukkan", "Dükkan").replace("net_area_unit", "NET alan");
}

function shortKey(value: string) {
  return value.split("-").slice(-2).join("-");
}

function archiveLabel(value: string) {
  return value
    .replaceAll("_", " ")
    .replace("cad unit", "CAD bağımsız bölüm")
    .replace("document qa evidence", "doküman QA kanıtı")
    .replace("review tasks", "review görevleri")
    .replace("source files", "kaynak dosyalar");
}

function comparisonValue(label: string, item: AnyRecord) {
  if (label === "Birim") return formatNumber(number(item.unit_count));
  if (label === "Ortalama Alan") return `${formatNumber(number(item.avg_unit_area_m2))} m²`;
  if (label === "Net Alan") return `${formatNumber(number(item.net_residential_area_m2))} m²`;
  if (label === "Verim") return `${formatNumber(number(item.efficiency_percent))}%`;
  return formatNumber(number(item.fit_score));
}

function modalSubtitle(action: ActionState) {
  if (action.key === "report") return "Teklif paketleri ve rapor çıktıları";
  if (action.key === "share") return "Review bağlantısı ve ekip paylaşımı";
  if (action.key === "ai") return "Kentsel dataset üzerinden karar desteği";
  if (action.key === "import") return "Kentsel otomasyon verisini uygulamaya bağlama durumu";
  return "Çalışan aksiyon paneli";
}
