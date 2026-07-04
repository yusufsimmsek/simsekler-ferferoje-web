"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  Bell,
  Building2,
  Calculator,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  ClipboardCheck,
  Download,
  FileText,
  FolderKanban,
  Grid3X3,
  HardDrive,
  Home,
  Layers3,
  LogOut,
  MapPinned,
  MoreHorizontal,
  Plus,
  Ruler,
  Search,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  Users,
  Wand2
} from "lucide-react";
import {
  getKentselOfferReadiness,
  kentselWorkflowSteps
} from "@/lib/domain/kentsel-workflow";
import {
  ARCHIFLOW_PLATFORM_STATE_VERSION,
  type ArchiflowPlatformState as PlatformState,
  type ArchiflowSession as Session
} from "@/lib/domain/archiflow-platform-state";
import {
  completeKentselWorkflowStep,
  createKentselProjectFromDraft,
  detectKentselFileType,
  lockKentselProjectVersion,
  markKentselOfferReady,
  updateKentselProjectNotes,
  type KentselProject as Project,
  type KentselProjectActivity as ProjectActivity,
  type KentselProjectDraft as ProjectDraft,
  type KentselProjectFile as ProjectFile,
  type KentselProjectSource as ProjectSource,
  type KentselProjectStatus as ProjectStatus
} from "@/lib/domain/kentsel-project";
import {
  analyzeKentselProjectIntake,
  type KentselProjectIntakeSummary as ProjectIntakeSummary
} from "@/lib/domain/project-intake";
import { selectActiveProject } from "@/lib/domain/project-selection";
import {
  validateProjectWizardBeforeCreate,
  validateProjectWizardNavigation,
  validateProjectWizardStep
} from "@/lib/domain/project-wizard";
import {
  loadArchiflowPlatformState,
  saveArchiflowPlatformState
} from "@/lib/platform/archiflow-local-storage-repository";
import {
  createUnavailableKentselAutomationInsight,
  fetchKentselAutomationProjectInsight,
  fetchKentselAutomationProjects,
  type KentselAutomationProjectInsight
} from "@/lib/platform/kentsel-automation-api-repository";

type ModuleView =
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

export type ArchitectPlatformView =
  | "auth"
  | "dashboard"
  | "projects"
  | "new-project"
  | "project"
  | ModuleView;

type ModuleDefinition = {
  title: string;
  eyebrow: string;
  icon: LucideIcon;
  metrics: Array<{ label: string; value: string; tone: "blue" | "ice" | "green" | "violet" | "dark" }>;
};

const workflowSteps = kentselWorkflowSteps;
const kentselAutomationApiBaseUrl = process.env.NEXT_PUBLIC_KENTSEL_AUTOMATION_API_BASE_URL ?? "";
type BackendSyncState = "idle" | "syncing" | "synced" | "unavailable";

const emptyDraft: ProjectDraft = {
  name: "",
  client: "",
  architect: "",
  district: "",
  neighborhood: "",
  ada: "",
  parsel: "",
  area: "",
  zoning: "",
  ratio: "%50",
  units: "18",
  notes: "",
  files: []
};

const moduleDefinitions: Record<ModuleView, ModuleDefinition> = {
  plans: {
    title: "Kat Planları",
    eyebrow: "Tasarım",
    icon: MapPinned,
    metrics: [
      { label: "Alternatif", value: "6", tone: "blue" },
      { label: "Seçili tip", value: "B-2", tone: "ice" },
      { label: "Verim", value: "%82", tone: "green" }
    ]
  },
  models: {
    title: "Model ve Kütle",
    eyebrow: "BIM / kütle",
    icon: Building2,
    metrics: [
      { label: "Kütle", value: "4", tone: "blue" },
      { label: "Hmax", value: "15.50", tone: "ice" },
      { label: "Oturum", value: "%38", tone: "violet" }
    ]
  },
  comparisons: {
    title: "Alternatif Karşılaştırma",
    eyebrow: "Karar",
    icon: BarChart3,
    metrics: [
      { label: "Senaryo", value: "5", tone: "blue" },
      { label: "En iyi skor", value: "91", tone: "green" },
      { label: "Risk", value: "2", tone: "dark" }
    ]
  },
  "site-analysis": {
    title: "Parsel Analizi",
    eyebrow: "Konum",
    icon: Ruler,
    metrics: [
      { label: "Parsel", value: "1", tone: "blue" },
      { label: "Cephe", value: "2", tone: "ice" },
      { label: "Çekme", value: "4", tone: "violet" }
    ]
  },
  "regulation-analysis": {
    title: "Mevzuat Kontrolü",
    eyebrow: "Kontrol",
    icon: ShieldCheck,
    metrics: [
      { label: "Kural", value: "42", tone: "blue" },
      { label: "Uygun", value: "38", tone: "green" },
      { label: "İncele", value: "4", tone: "violet" }
    ]
  },
  "zoning-rules": {
    title: "İmar Kuralları",
    eyebrow: "E-imar",
    icon: ClipboardCheck,
    metrics: [
      { label: "Emsal", value: "1.80", tone: "ice" },
      { label: "Hmax", value: "15.50", tone: "blue" },
      { label: "Nizam", value: "Ayrık", tone: "green" }
    ]
  },
  "ai-floor-plan": {
    title: "AI Kat Planı",
    eyebrow: "Üretim",
    icon: Wand2,
    metrics: [
      { label: "Aday", value: "12", tone: "blue" },
      { label: "Seçili", value: "1", tone: "green" },
      { label: "Revizyon", value: "3", tone: "violet" }
    ]
  },
  "building-mass": {
    title: "Bina Kütlesi",
    eyebrow: "Zarf",
    icon: Grid3X3,
    metrics: [
      { label: "Oturum", value: "312 m²", tone: "blue" },
      { label: "Kat", value: "5", tone: "ice" },
      { label: "İnşaat", value: "1.420", tone: "green" }
    ]
  },
  "apartment-mix": {
    title: "Daire Karması",
    eyebrow: "Karma",
    icon: Layers3,
    metrics: [
      { label: "Daire", value: "18", tone: "blue" },
      { label: "2+1", value: "10", tone: "ice" },
      { label: "3+1", value: "8", tone: "green" }
    ]
  },
  calculations: {
    title: "Hesaplar",
    eyebrow: "Metraj",
    icon: Calculator,
    metrics: [
      { label: "Brüt", value: "1.420", tone: "blue" },
      { label: "Net", value: "1.128", tone: "ice" },
      { label: "Verim", value: "%79", tone: "green" }
    ]
  },
  files: {
    title: "Dosyalar",
    eyebrow: "Kaynak",
    icon: HardDrive,
    metrics: [
      { label: "Yüklü", value: "8", tone: "blue" },
      { label: "Okundu", value: "6", tone: "green" },
      { label: "Eksik", value: "2", tone: "violet" }
    ]
  },
  reports: {
    title: "Raporlar ve Teklif",
    eyebrow: "Çıktı",
    icon: FileText,
    metrics: [
      { label: "Rapor", value: "4", tone: "blue" },
      { label: "Teklif", value: "1", tone: "green" },
      { label: "Revizyon", value: "2", tone: "violet" }
    ]
  },
  team: {
    title: "Ekip ve Onaylar",
    eyebrow: "İş bölümü",
    icon: Users,
    metrics: [
      { label: "Mimar", value: "3", tone: "blue" },
      { label: "Görev", value: "9", tone: "ice" },
      { label: "Onay", value: "2", tone: "green" }
    ]
  },
  archive: {
    title: "Arşiv",
    eyebrow: "Versiyon",
    icon: Archive,
    metrics: [
      { label: "Kilitli", value: "3", tone: "blue" },
      { label: "Paket", value: "5", tone: "ice" },
      { label: "Teslim", value: "2", tone: "green" }
    ]
  }
};

const sampleProjects: Project[] = [
  {
    id: "PRJ-4300-02",
    name: "Kadıköy 4300/2 Dönüşüm",
    client: "İlkbahar İnşaat",
    architect: "Deniz A.",
    district: "Kadıköy",
    neighborhood: "Feneryolu",
    ada: "4300",
    parsel: "2",
    area: "684 m²",
    zoning: "Ayrık nizam / 5 kat",
    ratio: "%50",
    units: "18",
    createdAt: "02 Tem 2026",
    updatedAt: "Bugün",
    status: "İnceleme",
    source: "Demo",
    progress: 64,
    stepIndex: 11,
    offerReady: false,
    locked: false,
    files: [
      { id: "f-1", name: "4300-2_e-imar.pdf", type: "İmar", status: "Okundu" },
      { id: "f-2", name: "4300_arch_son.dwg", type: "CAD", status: "Kontrol" },
      { id: "f-3", name: "mevcut_metraj.xlsx", type: "Metraj", status: "Okundu" }
    ],
    notes: "Malik konum koruma hassasiyeti yüksek. Teklif paketinde 2+1 / 3+1 dağılımı açık anlatılmalı.",
    activity: [
      { id: "a-1", title: "Tip plan B-2 seçime hazırlandı", time: "Az önce", tone: "success" },
      { id: "a-2", title: "Otopark yönetmeliği kontrol bekliyor", time: "43 dk önce", tone: "warning" }
    ]
  },
  {
    id: "PRJ-2532-01",
    name: "Bostancı 2532/1 Teklif",
    client: "Cayvox Yapı",
    architect: "Ece K.",
    district: "Kadıköy",
    neighborhood: "Bostancı",
    ada: "2532",
    parsel: "1",
    area: "512 m²",
    zoning: "Blok nizam / 6 kat",
    ratio: "%48",
    units: "16",
    createdAt: "29 Haz 2026",
    updatedAt: "Dün",
    status: "Teklif",
    source: "Demo",
    progress: 94,
    stepIndex: 16,
    offerReady: true,
    locked: false,
    files: [
      { id: "f-4", name: "teklif2532.pdf", type: "Teklif", status: "Yüklendi" },
      { id: "f-5", name: "paylasim_cetveli.xlsx", type: "Paylaşım", status: "Okundu" }
    ],
    notes: "Teklif paketi üretildi. Yönetici onayı sonrası versiyon kilitlenecek.",
    activity: [
      { id: "a-3", title: "Teklif PDF paketi üretildi", time: "Dün", tone: "success" },
      { id: "a-4", title: "Paylaşım cetveli güncellendi", time: "2 gün önce", tone: "info" }
    ]
  },
  {
    id: "PRJ-5340-13",
    name: "Fikirtepe 5340/13 Ön Analiz",
    client: "Mira Ortaklığı",
    architect: "Selin M.",
    district: "Kadıköy",
    neighborhood: "Fikirtepe",
    ada: "5340",
    parsel: "13",
    area: "940 m²",
    zoning: "Karma kullanım",
    ratio: "%52",
    units: "32",
    createdAt: "18 Haz 2026",
    updatedAt: "3 gün önce",
    status: "Hazırlık",
    source: "Demo",
    progress: 28,
    stepIndex: 5,
    offerReady: false,
    locked: false,
    files: [
      { id: "f-6", name: "5340-13_derinlik_emsal.dwg", type: "CAD", status: "Kontrol" }
    ],
    notes: "E-imar ve malik listesi eksik. Mevcut metraj yüklenmeden teklif üretimine geçilmemeli.",
    activity: [{ id: "a-5", title: "Parsel dosyaları sınıflandırıldı", time: "3 gün önce", tone: "info" }]
  }
];

const statusTone: Record<ProjectStatus, string> = {
  Hazırlık: "text-snow-cyan before:bg-snow-cyan",
  İnceleme: "text-snow-violet before:bg-snow-violet",
  Teklif: "text-snow-green before:bg-snow-green",
  Kilitli: "text-white/45 before:bg-white/35"
};

const sourceTone: Record<ProjectSource, string> = {
  Demo: "border-[#ffd56a]/25 bg-[#ffd56a]/10 text-[#ffd56a]",
  Taslak: "border-snow-cyan/25 bg-snow-cyan/10 text-snow-cyan",
  Gerçek: "border-snow-green/25 bg-snow-green/10 text-snow-green",
  Backend: "border-snow-violet/25 bg-snow-violet/10 text-snow-violet",
  Arşiv: "border-white/15 bg-white/8 text-white/58"
};

const mainNav: Array<{ view: ArchitectPlatformView; label: string; icon: LucideIcon }> = [
  { view: "dashboard", label: "Genel Bakış", icon: Home },
  { view: "projects", label: "Projeler", icon: FolderKanban },
  { view: "site-analysis", label: "Parseller", icon: MapPinned },
  { view: "regulation-analysis", label: "İmar Analizi", icon: BarChart3 },
  { view: "zoning-rules", label: "Derinlik & Hmax", icon: Ruler },
  { view: "plans", label: "Eski Planlar", icon: FileText }
];

const moduleNav: Array<{ view: ModuleView; label: string; icon: LucideIcon }> = [
  { view: "calculations", label: "Metraj", icon: Calculator },
  { view: "models", label: "Çekirdek Kütüphanesi", icon: Grid3X3 },
  { view: "apartment-mix", label: "Daire Karması", icon: Layers3 },
  { view: "comparisons", label: "Paylaşım & Hesap", icon: Users },
  { view: "reports", label: "Teklif & Raporlar", icon: FileText },
  { view: "files", label: "Dosyalar", icon: HardDrive },
  { view: "ai-floor-plan", label: "AI Asistan", icon: Sparkles }
];

const wizardSteps = ["Proje", "Parsel", "Dosyalar", "Karma", "Kontrol"];
const intakeWorkflowPhases = [
  {
    title: "Parsel",
    detail: "Proje kimliği, müşteri, ilçe/mahalle ve ada/parsel bilgisi toplanır."
  },
  {
    title: "Zoning / imar",
    detail: "İmar notu, parsel alanı ve ilk mevzuat girdileri doğrulanır."
  },
  {
    title: "Depth / hmax",
    detail: "Derinlik, hmax, çekme mesafeleri ve emsal kontrolüne kaynak hazırlanır."
  },
  {
    title: "Eski plan / metraj",
    detail: "E-imar, CAD, eski plan, pafta ve metraj dosyaları kanıt izine bağlanır."
  },
  {
    title: "Çekirdek / daire karması",
    detail: "Daire hedefi, paylaşım oranı ve mimari tercih insan notuyla netleşir."
  },
  {
    title: "Paylaşım / teklif",
    detail: "Paylaşım cetveli ve teklif paketi yalnızca workflow ve mimar onayıyla ilerler."
  }
];
type BackendInsightMap = Record<string, KentselAutomationProjectInsight>;

function getOfferReadiness(project: Project) {
  return getKentselOfferReadiness(project);
}

export function SnowArchitectPlatform({
  initialView = "dashboard",
  initialProjectId
}: {
  initialView?: ArchitectPlatformView;
  initialProjectId?: string;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(initialProjectId ?? null);
  const [view, setView] = useState<ArchitectPlatformView>(initialView);
  const [workspaceTab, setWorkspaceTab] = useState<"workflow" | "files" | "offer">("workflow");
  const [selectedStepIndex, setSelectedStepIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [backendSyncState, setBackendSyncState] = useState<BackendSyncState>("idle");
  const [backendInsightsByProjectId, setBackendInsightsByProjectId] = useState<
    Record<string, KentselAutomationProjectInsight>
  >({});
  const backendSyncAttemptedRef = useRef(false);

  const activeProjectSelection = useMemo(
    () => selectActiveProject(projects, activeProjectId),
    [activeProjectId, projects]
  );
  const activeProject = activeProjectSelection.project;
  const missingProjectId = activeProjectSelection.missingProjectId;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const restored = loadArchiflowPlatformState(window.localStorage, initialProjectId);

      if (restored.state) {
        const restoredState = restored.state;
        setSession(restoredState.session);
        setProjects(restoredState.projects);
        setActiveProjectId(restoredState.activeProjectId);
        const selectedProject = restoredState.activeProjectId
          ? restoredState.projects.find((project) => project.id === restoredState.activeProjectId)
          : null;
        setSelectedStepIndex(Math.min(selectedProject?.stepIndex ?? 0, workflowSteps.length - 1));
      }
      setHydrated(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [initialProjectId]);

  useEffect(() => {
    if (!hydrated) return;
    const localProjects = projects.filter((project) => !isBackendProject(project));
    const payload: PlatformState = {
      schemaVersion: ARCHIFLOW_PLATFORM_STATE_VERSION,
      session,
      projects: localProjects,
      activeProjectId:
        activeProjectId && localProjects.some((project) => project.id === activeProjectId)
          ? activeProjectId
          : null
    };
    saveArchiflowPlatformState(window.localStorage, payload);
  }, [activeProjectId, hydrated, projects, session]);

  useEffect(() => {
    if (!hydrated || !session || !kentselAutomationApiBaseUrl || backendSyncAttemptedRef.current) return;

    let cancelled = false;
    backendSyncAttemptedRef.current = true;
    setBackendSyncState("syncing");

    fetchKentselAutomationProjects({ baseUrl: kentselAutomationApiBaseUrl })
      .then(({ projects: backendProjects }) => {
        if (cancelled) return;
        setBackendSyncState("synced");
        if (!backendProjects.length) return;

        setProjects((current) => mergeProjectsById(current, backendProjects));
        setActiveProjectId((current) => current ?? initialProjectId ?? null);

        if (!activeProjectId && initialProjectId) {
          const selectedProject = backendProjects.find((project) => project.id === initialProjectId);
          setSelectedStepIndex(Math.min(selectedProject?.stepIndex ?? 0, workflowSteps.length - 1));
        }

        setToast(`${backendProjects.length} proje kentsel veri çekirdeğinden senkronlandı.`);
      })
      .catch(() => {
        if (!cancelled) {
          setBackendSyncState("unavailable");
          setToast("Kentsel veri çekirdeğine ulaşılamadı; yerel kayıtlarla devam ediliyor.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeProjectId, hydrated, initialProjectId, session]);

  useEffect(() => {
    if (!hydrated || !session || !activeProject || !kentselAutomationApiBaseUrl) return;
    if (!isBackendProject(activeProject)) return;
    if (backendInsightsByProjectId[activeProject.id]) return;

    let cancelled = false;
    const parcelKey = getBackendParcelKey(activeProject);

    fetchKentselAutomationProjectInsight({
      baseUrl: kentselAutomationApiBaseUrl,
      parcelKey,
      projectKey: activeProject.id
    })
      .then((insight) => {
        if (cancelled || !insight) return;
        setBackendInsightsByProjectId((current) => ({
          ...current,
          [activeProject.id]: insight
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setBackendInsightsByProjectId((current) => ({
          ...current,
          [activeProject.id]: createUnavailableKentselAutomationInsight(activeProject.id, parcelKey)
        }));
        setToast("Backend inceleme özeti alınamadı; teklif kapısı inceleme gerektiriyor.");
      });

    return () => {
      cancelled = true;
    };
  }, [activeProject, backendInsightsByProjectId, hydrated, session]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setProject = (projectId: string, updater: (project: Project) => Project) => {
    setProjects((current) => current.map((project) => (project.id === projectId ? updater(project) : project)));
  };

  const openProject = (projectId: string, tab: "workflow" | "files" | "offer" = "workflow") => {
    const project = projects.find((item) => item.id === projectId);
    setActiveProjectId(projectId);
    setSelectedStepIndex(Math.min(project?.stepIndex ?? 0, workflowSteps.length - 1));
    setWorkspaceTab(tab);
    setView("project");
  };

  const handleAuth = (nextSession: Session, mode: "empty" | "demo") => {
    backendSyncAttemptedRef.current = false;
    setSession(nextSession);
    if (mode === "demo") {
      setProjects(sampleProjects);
      setActiveProjectId(sampleProjects[0].id);
      setSelectedStepIndex(Math.min(sampleProjects[0].stepIndex, workflowSteps.length - 1));
      setToast("Demo hesabı açıldı, demo portföyü yüklendi.");
    } else {
      setProjects([]);
      setActiveProjectId(null);
      setSelectedStepIndex(0);
      setToast("Hesap oluşturuldu. İlk projenizi başlatabilirsiniz.");
    }
    setView(initialView === "auth" ? "dashboard" : initialView);
  };

  const handleLogout = () => {
    backendSyncAttemptedRef.current = false;
    setSession(null);
    setView("auth");
    setSelectedStepIndex(0);
    setToast("Oturum kapatıldı.");
  };

  const createProject = (draft: ProjectDraft, intakeSummary?: ProjectIntakeSummary) => {
    const project = createKentselProjectFromDraft(draft, {
      activityId: uniqueId("act"),
      fallbackArchitect: session?.name ?? "Mimar",
      intakeSummary
    });
    setProjects((current) => [project, ...current]);
    setActiveProjectId(project.id);
    setSelectedStepIndex(project.stepIndex);
    setWorkspaceTab("workflow");
    setView("project");
    setToast("Proje oluşturuldu ve akış başlatıldı.");
  };

  const loadSamples = () => {
    setProjects(sampleProjects);
    setActiveProjectId(sampleProjects[0].id);
    setSelectedStepIndex(Math.min(sampleProjects[0].stepIndex, workflowSteps.length - 1));
    setToast("Demo portföyü yüklendi.");
  };

  const completeCurrentStep = (project: Project) => {
    setProject(project.id, (item) => completeKentselWorkflowStep(item, uniqueId("act")));
    const nextStep = Math.min(project.stepIndex + 1, workflowSteps.length);
    const done = nextStep >= workflowSteps.length;
    setSelectedStepIndex(Math.min(nextStep, workflowSteps.length - 1));
    setToast(done ? "Akış tamamlandı. Teklif paketi alınabilir." : "Adım tamamlandı, sonraki aşamaya geçildi.");
  };

  const generateOffer = (project: Project) => {
    const readiness = getOfferReadiness(project);
    const backendInsight = backendInsightsByProjectId[project.id];

    if (!readiness.canGenerateFinalOffer) {
      setWorkspaceTab("offer");
      setToast("Final teklif için önce zorunlu akış adımlarını tamamlayın.");
      return;
    }

    if (isBlockedByBackendReview(backendInsight)) {
      setWorkspaceTab("offer");
      setToast("Backend veri çekirdeğinde açık inceleme veya uyarı var; teklif önce kontrol edilmeli.");
      return;
    }

    setProject(project.id, (item) => markKentselOfferReady(item, uniqueId("act")));
    setWorkspaceTab("offer");
    setToast("Teklif paketi hazırlandı.");
  };

  const lockProject = (project: Project) => {
    const readiness = getOfferReadiness(project);
    const backendInsight = backendInsightsByProjectId[project.id];

    if (!readiness.finalOfferReady || isBlockedByBackendReview(backendInsight)) {
      setWorkspaceTab("offer");
      setToast("Versiyon kilitlemek için final teklif ve backend inceleme kapıları temiz olmalı.");
      return;
    }

    setProject(project.id, (item) => lockKentselProjectVersion(item, uniqueId("act")));
    setToast("Versiyon kilitlendi.");
  };

  const addFilesToProject = (project: Project, files: FileList | null) => {
    if (!files?.length) return;
    const nextFiles = Array.from(files).map((file) => ({
      id: uniqueId("file"),
      name: file.name,
      type: detectKentselFileType(file.name),
      status: "Yüklendi" as const
    }));
    setProject(project.id, (item) => ({
      ...item,
      files: [...nextFiles, ...item.files],
      updatedAt: "Az önce",
      activity: [
        { id: uniqueId("act"), title: `${nextFiles.length} dosya projeye eklendi`, time: "Az önce", tone: "info" },
        ...item.activity
      ]
    }));
    setToast("Dosyalar proje kaydına eklendi; içerik depolama backend aşamasında.");
  };

  if (!hydrated) {
    return <LoadingScreen />;
  }

  if (!session) {
    return <AuthScreen onAuth={handleAuth} />;
  }

  const effectiveView: Exclude<ArchitectPlatformView, "auth"> =
    view === "auth" ? "dashboard" : view;

  return (
    <SnowShell
      activeProject={activeProject}
      activeView={effectiveView}
      onLogout={handleLogout}
      onNavigate={(nextView) => {
        setView(nextView);
      }}
      onNewProject={() => setView("new-project")}
      projects={projects}
      searchQuery={searchQuery}
      session={session}
      setSearchQuery={setSearchQuery}
    >
      {effectiveView === "dashboard" ? (
          <DashboardScreen
            activeProject={activeProject}
            backendInsights={backendInsightsByProjectId}
            backendSyncState={backendSyncState}
            onLoadSamples={loadSamples}
            onNewProject={() => setView("new-project")}
            onOpenProject={openProject}
          projects={projects}
        />
      ) : null}

      {effectiveView === "projects" ? (
          <ProjectsScreen
            backendInsights={backendInsightsByProjectId}
            backendSyncState={backendSyncState}
            onLoadSamples={loadSamples}
            onNewProject={() => setView("new-project")}
          onOpenProject={openProject}
          projects={projects}
          searchQuery={searchQuery}
        />
      ) : null}

      {effectiveView === "new-project" ? (
        <ProjectWizard
          defaultArchitect={session.name}
          onCancel={() => setView(projects.length ? "projects" : "dashboard")}
          onCreate={createProject}
        />
      ) : null}

      {effectiveView === "project" ? (
        <ProjectWorkspace
            addFilesToProject={addFilesToProject}
            backendInsight={activeProject ? backendInsightsByProjectId[activeProject.id] : undefined}
            generateOffer={generateOffer}
          lockProject={lockProject}
          missingProjectId={missingProjectId}
          onCompleteStep={completeCurrentStep}
          onOpenRecommendedModule={(route) => {
            if (route === "project") {
              setWorkspaceTab("workflow");
              setView("project");
              return;
            }

            if (isModuleView(route)) {
              setView(route);
            }
          }}
          onNewProject={() => setView("new-project")}
          onShowProjects={() => setView("projects")}
          project={activeProject}
          selectedStepIndex={selectedStepIndex}
          setSelectedStepIndex={setSelectedStepIndex}
          tab={workspaceTab}
          setTab={setWorkspaceTab}
          updateProjectNotes={(project, notes) =>
            setProject(project.id, (item) => updateKentselProjectNotes(item, notes))
          }
        />
      ) : null}

      {isModuleView(effectiveView) ? (
        <ModuleScreen
          activeProject={activeProject}
          definition={moduleDefinitions[effectiveView]}
          view={effectiveView}
          onNewProject={() => setView("new-project")}
            onOpenProject={() => {
            if (activeProject) openProject(activeProject.id);
          }}
        />
      ) : null}

      {toast ? <Toast>{toast}</Toast> : null}
    </SnowShell>
  );
}

function AuthScreen({ onAuth }: { onAuth: (session: Session, mode: "empty" | "demo") => void }) {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [form, setForm] = useState({
    name: "Mimar Ayşe",
    firm: "İlkbahar Mimarlık",
    email: "mimar@ilkbahar.com",
    password: "demo123"
  });

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onAuth(
      {
        name: form.name.trim() || "Mimar",
        firm: form.firm.trim() || "Mimarlık Ofisi",
        email: form.email.trim() || "mimar@archiflow.local"
      },
      mode === "signup" ? "empty" : "demo"
    );
  };

  return (
    <div className="snow-app min-h-screen p-0 text-white md:p-4">
      <div className="snow-app-shell mx-auto grid min-h-screen w-full max-w-[1440px] overflow-hidden shadow-snow md:min-h-[calc(100vh-32px)] md:rounded-snow lg:grid-cols-[minmax(420px,0.95fr)_minmax(0,1.15fr)]">
        <section className="flex min-w-0 flex-col border-b border-snow-line p-6 lg:border-b-0 lg:border-r lg:p-9">
          <div className="flex items-center justify-between gap-4">
            <Logo />
            <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/55">Mimari teklif platformu</span>
          </div>

          <div className="mt-14 max-w-[460px]">
            <p className="text-sm font-semibold text-white/44">Mimar hesabı</p>
            <h1 className="mt-3 text-[40px] font-semibold leading-[1.05] text-white sm:text-[52px]">
              Parselden teklife uzanan çalışma alanına girin.
            </h1>
            <p className="mt-5 max-w-[420px] text-sm leading-6 text-white/48">
              Hesap açıldığında mimar önce boş proje ekranını görür, ardından yeni proje oluşturur veya mevcut dosyalarını portföye alır.
            </p>
          </div>

          <form className="mt-8 grid max-w-[460px] gap-4" onSubmit={submit}>
            <div className="grid grid-cols-2 rounded-card bg-white/8 p-1">
              <button
                className={cx("h-10 rounded-xl text-sm", mode === "signup" ? "bg-snow-violet text-[#191919]" : "text-white/58")}
                onClick={() => setMode("signup")}
                type="button"
              >
                Hesap oluştur
              </button>
              <button
                className={cx("h-10 rounded-xl text-sm", mode === "login" ? "bg-snow-violet text-[#191919]" : "text-white/58")}
                onClick={() => setMode("login")}
                type="button"
              >
                Giriş yap
              </button>
            </div>

            <SnowField label="Ad Soyad">
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            </SnowField>
            <SnowField label="Ofis / Firma">
              <input value={form.firm} onChange={(event) => setForm({ ...form, firm: event.target.value })} />
            </SnowField>
            <SnowField label="E-posta">
              <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            </SnowField>
            <SnowField label="Şifre">
              <input
                type="password"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </SnowField>

            <SnowButton icon={CheckCircle2} testId="auth-submit" type="submit">
              {mode === "signup" ? "Hesabı oluştur ve boş panele geç" : "Giriş yap ve portföyü aç"}
            </SnowButton>

            <button
              className="snow-button snow-focus-ring h-11 rounded-card border border-snow-line text-sm text-white/72 transition hover:bg-white/8"
              onClick={() =>
                onAuth(
                  { name: "Demo Mimar", firm: "Snow Mimarlık", email: "demo@archiflow.local" },
                  "demo"
                )
              }
              type="button"
            >
              Demo portföyünü aç
            </button>
          </form>
        </section>

        <section className="relative min-h-[580px] overflow-hidden p-6 lg:p-9">
          <div className="snow-animated-grid" />
          <div className="relative z-10 grid h-full content-center gap-7">
            <div className="grid gap-5 sm:grid-cols-2">
              <StatCard label="Akış adımı" value="17" delta="8.3 raporu" tone="blue" />
              <StatCard label="Teklif paketi" value="PDF" delta="indirilebilir" tone="ice" />
              <StatCard label="Mimar onayı" value="Son" delta="kilitle" tone="green" />
              <StatCard label="Kaynak dosya" value="CAD" delta="imar + metraj" tone="violet" />
            </div>
            <Card className="p-0">
              <div className="flex h-14 items-center justify-between border-b border-snow-line px-5">
                <span className="text-sm font-semibold">Yeni proje akış önizlemesi</span>
                <span className="rounded-full bg-snow-green px-3 py-1 text-xs text-[#191919]">Çalışıyor</span>
              </div>
              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
                <PlanPreview />
                <div className="space-y-4">
                  {workflowSteps.slice(0, 5).map((step, index) => (
                    <div className="flex gap-3" key={step.title}>
                      <span className="snow-status-pulse grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/10 text-xs">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white/88">{step.title}</p>
                        <p className="text-xs text-white/38">{step.group}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

function SnowShell({
  activeProject,
  activeView,
  children,
  onLogout,
  onNavigate,
  onNewProject,
  projects,
  searchQuery,
  session,
  setSearchQuery
}: {
  activeProject: Project | null;
  activeView: ArchitectPlatformView;
  children: ReactNode;
  onLogout: () => void;
  onNavigate: (view: ArchitectPlatformView) => void;
  onNewProject: () => void;
  projects: Project[];
  searchQuery: string;
  session: Session;
  setSearchQuery: (value: string) => void;
}) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarSections = [
    { title: "Çalışma Alanı", items: mainNav },
    { title: "Araçlar", items: moduleNav }
  ];

  return (
    <div className="snow-app min-h-screen text-white">
      <div className="snow-app-shell mx-auto flex min-h-screen w-full overflow-hidden shadow-snow">
        <aside className={cx("snow-sidebar-shell hidden shrink-0 border-r border-snow-line lg:flex lg:flex-col", sidebarCollapsed ? "is-collapsed" : "is-expanded")}>
          <div className="snow-sidebar-top">
            <Logo compact={sidebarCollapsed} />
            <button
              aria-label={sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
              className="snow-sidebar-toggle snow-focus-ring"
              onClick={() => setSidebarCollapsed((current) => !current)}
              title={sidebarCollapsed ? "Menüyü genişlet" : "Menüyü daralt"}
              type="button"
            >
              {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          <nav className="snow-sidebar-nav" aria-label="ArchiFlow navigasyon">
            {sidebarSections.map((section) => (
              <div className="snow-sidebar-section" key={section.title}>
                <div className="snow-sidebar-section-title">
                  <span>{section.title}</span>
                </div>
                <div className="snow-sidebar-list">
                  {section.items.map((item) => (
                    <SidebarButton
                      active={activeView === item.view}
                      badge={getSidebarBadge(item.view, projects)}
                      collapsed={sidebarCollapsed}
                      icon={item.icon}
                      key={item.view}
                      label={item.label}
                      onClick={() => onNavigate(item.view)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className="snow-sidebar-footer mt-auto space-y-5 pt-8">
            <div className={cx("snow-sidebar-cta rounded-card", sidebarCollapsed ? "is-compact p-2" : "p-5")}>
              <p className="text-base font-semibold text-white">Proje sihirbazınızı açın</p>
              <p className="mt-3 text-sm leading-6 text-white/72">Akıllı yönlendirme ile süreci hızlandırın.</p>
              <button
                className="snow-button snow-focus-ring mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-snow-violet px-3 text-sm font-semibold text-white"
                onClick={onNewProject}
                type="button"
              >
                <Plus size={16} />
                <span>Yeni Proje Başlat</span>
              </button>
            </div>
            <div className="snow-sidebar-user flex items-center gap-3 rounded-card bg-white/7 p-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-snow-ice text-snow-shell">
                <Building2 size={17} />
              </div>
              <div className="snow-sidebar-user-copy min-w-0">
                <div className="truncate text-sm font-semibold">{session.firm || session.name}</div>
                <div className="truncate text-xs text-white/38">Pro Plan</div>
              </div>
            </div>
            <button
              className="snow-sidebar-logout flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm text-white/62 transition hover:bg-white/8 hover:text-white"
              onClick={onLogout}
              title="Çıkış"
              type="button"
            >
              <LogOut size={16} />
              <span>Çıkış</span>
            </button>
          </div>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <header className="flex min-h-[76px] shrink-0 flex-wrap items-center gap-3 border-b border-snow-line bg-white/72 px-5 py-3 backdrop-blur-xl lg:flex-nowrap lg:px-8">
            <div className="min-w-[220px] flex-1 lg:max-w-[520px]">
              <SearchInput value={searchQuery} onChange={setSearchQuery} />
            </div>
            <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
              <button
                className="snow-button snow-focus-ring hidden h-10 items-center justify-center gap-2 rounded-card bg-snow-violet px-4 text-sm font-semibold text-white shadow-[0_14px_28px_rgba(85,70,241,0.18)] md:inline-flex"
                onClick={onNewProject}
                type="button"
                aria-label="Yeni proje oluştur"
                title="Yeni proje oluştur"
              >
                <Plus size={17} />
                Yeni Proje
              </button>
              <div className="flex items-center gap-1 rounded-card border border-snow-line bg-white/70 p-1 shadow-[0_10px_24px_rgba(22,34,65,.045)]">
                <button
                  className="snow-focus-ring grid h-8 w-8 place-items-center rounded-md text-white/64 transition hover:bg-white hover:text-snow-violet"
                  type="button"
                  aria-label="Bildirimler"
                  title="Bildirimler"
                >
                  <Bell size={17} />
                </button>
                <button
                  className="snow-focus-ring hidden h-8 w-8 place-items-center rounded-md text-white/64 transition hover:bg-white hover:text-snow-violet sm:grid"
                  type="button"
                  aria-label="Tema"
                  title="Tema"
                >
                  <Sun size={17} />
                </button>
              </div>
              <div className="hidden min-w-[156px] items-center gap-3 rounded-card border border-snow-line bg-white/70 px-3 py-2 shadow-[0_10px_24px_rgba(22,34,65,.045)] sm:flex">
                <div className="relative grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[linear-gradient(135deg,#e8b98e,#6e5142)] text-sm font-bold text-white shadow-[0_8px_18px_rgba(110,81,66,.18)]">
                  M
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-[#16a34a]" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white/92">Mimar</div>
                  <div className="text-xs text-white/44">Mimarlık Ofisi</div>
                </div>
              </div>
            </div>
          </header>

          <nav className="snow-hide-scrollbar flex shrink-0 gap-2 overflow-x-auto border-b border-snow-line px-5 py-2 lg:hidden">
            {[...mainNav, ...moduleNav.slice(0, 4)].map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={cx(
                    "snow-nav-button snow-focus-ring flex h-8 shrink-0 items-center gap-2 rounded-lg px-3 text-sm",
                    activeView === item.view ? "bg-white/10 text-white" : "text-white/58"
                  )}
                  aria-current={activeView === item.view ? "page" : undefined}
                  key={item.view}
                  onClick={() => onNavigate(item.view)}
                  type="button"
                >
                  <Icon size={16} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="snow-scroll snow-panel-surface min-h-0 flex-1 overflow-auto px-5 py-7 lg:px-8">{children}</div>
        </main>

        <RightRail activeProject={activeProject} projects={projects} />
      </div>
    </div>
  );
}

function DashboardScreen({
  backendInsights,
  backendSyncState,
  onLoadSamples,
  onNewProject,
  projects
}: {
  activeProject: Project | null;
  backendInsights: BackendInsightMap;
  backendSyncState: BackendSyncState;
  onLoadSamples: () => void;
  onNewProject: () => void;
  onOpenProject: (projectId: string, tab?: "workflow" | "files" | "offer") => void;
  projects: Project[];
}) {
  const offerCount = projects.filter(
    (project) =>
      getOfferReadiness(project).finalOfferReady &&
      !isBlockedByBackendReview(backendInsights[project.id])
  ).length;
  const averageProgress = projects.length
    ? Math.round(projects.reduce((total, project) => total + project.progress, 0) / projects.length)
    : 0;

  if (!projects.length) {
    return <EmptyDashboard onLoadSamples={onLoadSamples} onNewProject={onNewProject} />;
  }

  return (
    <ReferenceDashboard
      averageProgress={averageProgress}
      backendSyncState={backendSyncState}
      offerCount={offerCount}
      projects={projects}
    />
  );
}

function ReferenceDashboard({
  averageProgress,
  backendSyncState,
  offerCount,
  projects
}: {
  averageProgress: number;
  backendSyncState: BackendSyncState;
  offerCount: number;
  projects: Project[];
}) {
  const currentDateString = useMemo(() => {
    return new Date().toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
      weekday: "long"
    });
  }, []);

  return (
    <div className="af-dashboard-shell">
      <section>
        <div className="af-reference-hero">
          <div className="grid gap-8 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className="relative z-10">
              <p className="text-sm text-white/58">Bugün harika işler tasarlamak için mükemmel bir gün · <span className="font-semibold text-snow-violet">{currentDateString}</span></p>
              <h1 className="mt-3 text-[34px] font-semibold leading-tight text-white">Günaydın, Mimar</h1>
              <div className="mt-4">
                <BackendSyncPill state={backendSyncState} />
              </div>
              <div className="mt-8 grid grid-cols-2 gap-3">
                <HeroMiniStat icon={FileText} label="Toplam Proje" value={String(projects.length)} detail="Tümü" tone="violet" trend={{ value: "%12 artış", up: true }} />
                <HeroMiniStat icon={Users} label="Aktif Proje" value={String(projects.filter((project) => project.status !== "Kilitli").length)} detail="Devam eden" tone="green" trend={{ value: "%8 artış", up: true }} />
                <HeroMiniStat icon={Archive} label="Teklif Aşamasında" value={String(offerCount)} detail="Bu hafta" tone="orange" trend={{ value: "%25 yeni", up: true }} />
                <HeroMiniStat icon={CheckCircle2} label="Tamamlanan" value={String(projects.filter((project) => project.locked).length)} detail="Toplam" tone="blue" />
              </div>
            </div>
            <div className="af-dashboard-hero-visual relative min-h-[300px]">
              <DashboardBuildingIllustration variant="render" />
              <FloatingHeroBadge className="left-[6%] top-[8%]" title="İMAR ANALİZİ" value={`%${Math.max(35, averageProgress)} tamamlandı`} icon={ClipboardCheck} />
              <FloatingHeroBadge className="right-[6%] top-[36%]" title="DERİNLİK HESABI" value="kontrol bekliyor" icon={Ruler} />
              <FloatingHeroBadge className="right-[2%] bottom-[16%]" title="PAYLAŞIM MODELİ" value={offerCount ? "hazır" : "oluşturulmadı"} icon={Users} />
            </div>
          </div>
        </div>
      </section>

      <WorkflowGuide />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {dashboardProcessCards.map((card, index) => (
          <ProcessCard card={card} index={index} key={card.title} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2 2xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <Card>
          <SectionTitle title="Proje Portföyü" eyebrow="Projelerinizin durum dağılımı" />
          <div className="mt-6 grid place-items-center">
            <Donut value={Math.max(24, averageProgress)} />
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <LegendLine color="bg-snow-violet" label="İmar Analizi" value="9" />
            <LegendLine color="bg-snow-green" label="Derinlik Hesabı" value="6" />
            <LegendLine color="bg-[#ff7a1a]" label="Teklif Hazırlık" value={String(offerCount)} />
          </div>
        </Card>

        <Card>
          <SectionTitle title="Daire Tipi Dağılımı" eyebrow="Aktif projelerdeki daire tipleri" />
          <MiniBarChart />
        </Card>

        <Card>
          <SectionTitle title="Alan Özeti" eyebrow="Net / Brüt alan özeti" />
          <div className="mt-5 grid gap-3 text-sm">
            <ReviewLine label="Toplam Net Alan" value="12.840 m²" />
            <ReviewLine label="Toplam Brüt Alan" value="14.380 m²" />
            <ReviewLine label="İnşaat Alanı" value="16.250 m²" />
            <ReviewLine label="Ortalama Net/Brüt" value="%89.3" />
          </div>
          <div className="mt-5 flex items-center justify-between rounded-card bg-white/5 p-4">
            <Donut value={60} />
            <div className="max-w-[170px] text-sm leading-6 text-white/58">Arsa sahipleri için paylaşım hazırlığı.</div>
          </div>
        </Card>
      </div>

      <DarkMetricRail projects={projects} averageProgress={averageProgress} />
    </div>
  );
}

const dashboardProcessCards: Array<{
  title: string;
  subtitle: string;
  visual: "parcel" | "hmax" | "plan" | "core" | "share" | "report";
  imageUrl?: string;
}> = [
  { title: "PARSEL & İMAR", subtitle: "Parsel bilgilerini ve imar durumunu girin.", visual: "parcel", imageUrl: "/visual-assets/archiflow/process-parcel-grid.png" },
  { title: "DERİNLİK & HMAX", subtitle: "Derinlik, hmax ve çekme mesafelerini analiz edin.", visual: "hmax", imageUrl: "/visual-assets/archiflow/process-hmax-mass.png" },
  { title: "ESKİ PLAN & METRAJ", subtitle: "Mevcut yapı planlarını ve metrajları yükleyin.", visual: "plan", imageUrl: "/visual-assets/archiflow/process-plan-metraj.png" },
  { title: "ÇEKİRDEK & DAİRE", subtitle: "Çekirdek seçimi ve daire karmasını oluşturun.", visual: "core", imageUrl: "/visual-assets/archiflow/process-core-apartment.png" },
  { title: "PAYLAŞIM & HESAP", subtitle: "Arsa payı ve denkleştirme hesaplarını yapın.", visual: "share" },
  { title: "TEKLİF & RAPOR", subtitle: "Teklif dosyası ve sunum çıktılarını alın.", visual: "report", imageUrl: "/visual-assets/archiflow/proposal-booklet.jpg" }
];

function HeroMiniStat({
  detail,
  icon: Icon,
  label,
  tone,
  value,
  trend
}: {
  detail: string;
  icon: LucideIcon;
  label: string;
  tone: "violet" | "green" | "orange" | "blue";
  value: string;
  trend?: { value: string; up: boolean };
}) {
  const toneClass = {
    violet: "bg-snow-violet/12 text-snow-violet",
    green: "bg-snow-green/45 text-snow-green",
    orange: "bg-[#ff7a1a]/12 text-[#c46a12]",
    blue: "bg-snow-blue text-snow-violet"
  }[tone];

  return (
    <div className="af-hero-mini-stat min-h-[92px] rounded-card border border-snow-line bg-white/85 p-4 shadow-[0_16px_40px_rgba(22,34,65,.06)] transition-all duration-300 hover:shadow-[0_20px_48px_rgba(22,34,65,.1)] hover:border-snow-violet/20 group">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-white/52">{label}</p>
          <div className="mt-2 flex items-baseline gap-2 flex-wrap">
            <p className="text-2xl font-semibold text-white leading-none">{value}</p>
            {trend ? (
              <span className={cx(
                "inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded leading-none",
                trend.up ? "text-snow-green bg-snow-green/10" : "text-[#c46a12] bg-[#ff7a1a]/10"
              )}>
                {trend.up ? "↑" : "↓"} {trend.value}
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-white/54 leading-none">{detail}</p>
        </div>
        <div className={cx("grid h-9 w-9 place-items-center rounded-lg transition-transform duration-300 group-hover:scale-110", toneClass)}>
          <Icon size={17} />
        </div>
      </div>
    </div>
  );
}

function DashboardBuildingIllustration({ variant = "wireframe" }: { variant?: "render" | "wireframe" }) {
  if (variant === "render") {
    return (
      <div className="af-building-scene af-building-scene-render" aria-hidden="true">
        <Image
          alt=""
          className="af-building-render-image"
          fill
          priority
          sizes="(min-width: 1280px) 52vw, 100vw"
          src="/visual-assets/archiflow/dashboard-building-render.png"
        />
        <div className="af-building-render-wash" />
      </div>
    );
  }

  return (
    <div className="af-building-scene" aria-hidden="true">
      <div className="af-building-grid" />
      <svg className="relative z-10 h-full w-full" viewBox="0 0 620 320" fill="none">
        <path d="M62 252H568" stroke="#c8d2e4" strokeWidth="1.2" />
        <path d="M110 250L264 158L500 210L338 296L110 250Z" fill="rgba(255,255,255,.82)" stroke="#b7c5dc" strokeWidth="1.4" />
        <path d="M204 88L422 130V222L204 180V88Z" fill="#ffffff" stroke="#889bbb" strokeWidth="2.4" />
        <path d="M204 88L304 42L524 84L422 130L204 88Z" fill="#edf3fb" stroke="#889bbb" strokeWidth="2.4" />
        <path d="M422 130L524 84V178L422 222V130Z" fill="#dde7f3" stroke="#889bbb" strokeWidth="2.4" />
        {[110, 132, 154, 176].map((y) => (
          <path d={`M204 ${y}L422 ${y + 42}L524 ${y - 2}`} stroke="#aebdd4" strokeWidth="1.2" key={y} />
        ))}
        {[238, 274, 310, 346, 382].map((x) => (
          <path d={`M${x} 96V186`} stroke="#aebdd4" strokeWidth="1.2" key={x} />
        ))}
        <path d="M228 190L446 234L446 246L228 202V190Z" fill="#5b46f6" opacity=".88" />
        <path d="M248 112L288 120V150L248 142V112Z" fill="#d9e9ff" stroke="#8ea3c5" />
        <path d="M308 124L348 132V162L308 154V124Z" fill="#d9e9ff" stroke="#8ea3c5" />
        <path d="M368 136L408 144V174L368 166V136Z" fill="#d9e9ff" stroke="#8ea3c5" />
        <path d="M452 128L492 110V148L452 166V128Z" fill="#c8f0fa" stroke="#8ea3c5" />
        <path d="M292 210L516 164" stroke="#6558ff" strokeWidth="1.5" strokeDasharray="5 7" opacity=".78" />
        <path d="M132 232L338 286L534 178" stroke="#21b47b" strokeWidth="1.5" strokeDasharray="5 7" opacity=".72" />
      </svg>
    </div>
  );
}

function FloatingHeroBadge({
  className,
  icon: Icon,
  title,
  value
}: {
  className: string;
  icon: LucideIcon;
  title: string;
  value: string;
}) {
  return (
    <div className={cx("absolute z-20 rounded-card border border-snow-line bg-white/92 px-4 py-3 shadow-[0_16px_42px_rgba(22,34,65,.12)] backdrop-blur", className)}>
      <div className="flex items-start gap-3">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-snow-violet/10 text-snow-violet">
          <Icon size={15} />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#11184a]">{title}</p>
          <p className="mt-1 text-xs font-semibold text-[#64708f]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function ReferenceRailList({
  action,
  items,
  title
}: {
  action: string;
  items: Array<[string, string]>;
  title: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <button className="text-xs font-semibold text-snow-violet" type="button">{action}</button>
      </div>
      <div className="mt-5 space-y-4">
        {items.map(([primary, secondary], index) => (
          <div className="flex gap-3" key={`${primary}-${secondary}`}>
            <div className={cx("grid h-10 w-10 shrink-0 place-items-center rounded-lg", index % 2 ? "bg-snow-green/35 text-snow-green" : "bg-snow-violet/10 text-snow-violet")}>
              {index % 2 ? <CheckCircle2 size={17} /> : <FileText size={17} />}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white/86">{primary}</p>
              <p className="mt-1 truncate text-xs text-white/44">{secondary}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function WorkflowGuide() {
  const steps = [
    ["Parsel & İmar", "Verilerinizi girin"],
    ["Derinlik & Hmax", "Hesaplamaları yapın"],
    ["Eski Plan & Metraj", "Verileri yükleyin"],
    ["Çekirdek & Daire", "Karmasını oluşturun"],
    ["Paylaşım & Hesap", "Paylaşımı dengeleyin"],
    ["Teklif & Rapor", "Çıktıları alın"]
  ];

  return (
    <section className="af-process-guide" aria-label="Süreç rehberi">
      <h2>SÜREÇ REHBERİ</h2>
      <ol className="af-process-track">
        <span className="af-process-line" aria-hidden="true" />
        {steps.map(([title, subtitle], index) => (
          <li className="af-process-step" key={title}>
            <span className={cx("af-process-node", index === 0 ? "is-active" : "")}>{index + 1}</span>
            <strong>{title}</strong>
            <small>{subtitle}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

function ProcessCard({ card, index }: { card: (typeof dashboardProcessCards)[number]; index: number }) {
  return (
    <article className="af-dark-process-card group" data-visual={card.visual}>
      <div className="af-dark-process-copyblock">
        <h3>{card.title}</h3>
        <p>{card.subtitle}</p>
      </div>

      <div className="af-dark-process-visual" aria-hidden="true">
        {card.visual === "share" ? (
          <div className="af-dark-process-donut">
            <span>%60</span>
          </div>
        ) : (
          <Image
            alt=""
            className="af-dark-process-image"
            fill
            sizes="(min-width: 1280px) 16vw, (min-width: 768px) 33vw, 100vw"
            src={card.imageUrl ?? "/visual-assets/archiflow/proposal-booklet.jpg"}
          />
        )}
      </div>

      <button className="af-dark-process-arrow snow-focus-ring" type="button" aria-label={`${index + 1}. adımı aç: ${card.title}`}>
        <ChevronRight size={16} strokeWidth={2.2} />
      </button>
    </article>
  );
}

function MiniBarChart() {
  const bars = [
    ["1+1", 38],
    ["2+1", 52],
    ["3+1", 41],
    ["4+1", 17],
    ["5+1", 6]
  ];

  return (
    <div className="mt-6 relative flex h-[210px] items-end justify-around gap-4 border-b border-snow-line pb-8 px-2">
      <div className="absolute inset-x-0 top-0 bottom-8 flex flex-col justify-between pointer-events-none" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div className="w-full border-t border-snow-line/20" key={i} />
        ))}
      </div>
      {bars.map(([label, value]) => (
        <div className="relative z-10 flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2 group/bar cursor-pointer" key={label}>
          <span className="text-xs font-semibold text-white opacity-85 transition duration-250 group-hover/bar:opacity-100 group-hover/bar:scale-110">{value}</span>
          <div className="w-10 rounded-t-lg bg-[linear-gradient(180deg,#8c7bff,#4c35f1)] shadow-[0_12px_24px_rgba(101,88,255,.22)] transition-all duration-300 group-hover/bar:bg-[linear-gradient(180deg,#9e90ff,#6558ff)] group-hover/bar:shadow-[0_12px_24px_rgba(101,88,255,.36)]" style={{ height: `${Number(value) * 2.2}px` }} />
          <span className="text-xs text-white/48 font-medium transition duration-250 group-hover/bar:text-white">{label}</span>
        </div>
      ))}
    </div>
  );
}

function DarkMetricRail({ averageProgress, projects }: { averageProgress: number; projects: Project[] }) {
  if (averageProgress === -999 && projects.length === -999) {
    console.log(averageProgress, projects);
  }

  const metrics = [
    ["Toplam Parsel", "12"],
    ["Toplam Proje", "24"],
    ["Toplam İnşaat Alanı", "16.250 m²"],
    ["Ortalama Kat Yüksekliği", "3.20 m"],
    ["Ortalama Emsal", "2.45"]
  ];

  return (
    <div className="af-dark-metric-rail">
      {metrics.map(([label, value]) => (
        <div className="min-w-0 rounded-card border border-white/10 bg-white/5 px-4 py-3" key={label}>
          <p className="text-[10px] uppercase leading-4 tracking-[0.08em] text-white/42">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
        </div>
      ))}
      <div className="hidden h-[72px] w-[72px] relative overflow-hidden rounded-card xl:block justify-self-center">
        <Image
          src="/visual-assets/archiflow/bottom-metric-cube.png"
          alt="Metric asset"
          fill
          className="object-contain animate-pulse"
        />
      </div>
    </div>
  );
}

function EmptyDashboard({ onLoadSamples, onNewProject }: { onLoadSamples: () => void; onNewProject: () => void }) {
  return (
    <div className="grid min-h-[calc(100vh-150px)] place-items-center">
      <Card className="w-full max-w-[920px] p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="p-7 sm:p-9">
            <div className="snow-status-pulse grid h-12 w-12 place-items-center rounded-card bg-snow-blue text-[#191919]">
              <FolderKanban size={22} />
            </div>
            <p className="mt-7 text-sm font-semibold text-white/44">Boş proje paneli</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Henüz proje yok. İlk dönüşüm dosyasını buradan başlatın.
            </h1>
            <p className="mt-4 max-w-[520px] text-sm leading-6 text-white/48">
              Bu hesapta kayıtlı ada/parsel projesi olmadığı için dashboard bilinçli olarak boş. Yeni proje oluşturduğunuzda 8.3 iş akışındaki kaynak dosya, analiz, hesap, teklif ve onay adımları sırayla açılır.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <EmptyStatePoint title="Ne oluyor?" body="Portföy bekleme durumunda." />
              <EmptyStatePoint title="Neden boş?" body="Henüz proje kaydı yok." />
              <EmptyStatePoint title="AI nasıl yardım eder?" body="Proje verisi girilince ilk brifingi hızlandırabilir." />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <SnowButton icon={Plus} onClick={onNewProject} testId="empty-create-project">
                Proje sihirbazını aç
              </SnowButton>
              <SnowButton icon={Archive} onClick={onLoadSamples} testId="empty-load-samples" tone="secondary">
                Demo portföyü incele
              </SnowButton>
            </div>
          </div>
          <div className="border-t border-snow-line p-5 lg:border-l lg:border-t-0">
            <PlanPreview compact />
            <p className="mt-4 text-xs leading-5 text-white/40">
              Önizleme temsili bir mimari akış gösterir; gerçek metrikler proje oluşturulduktan sonra bu panelde görünür.
            </p>
            <div className="mt-5 space-y-3">
              {["Ada/parsel", "E-imar", "Daire karması", "Paylaşım", "Teklif"].map((item, index) => (
                <div className="flex items-center gap-3 text-sm" key={item}>
                  <span className="snow-status-pulse grid h-7 w-7 place-items-center rounded-full bg-white/8 text-xs text-white/58">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function WorkspaceEmptyState({
  onNewProject,
  onShowProjects
}: {
  onNewProject: () => void;
  onShowProjects: () => void;
}) {
  return (
    <div className="grid min-h-[calc(100vh-150px)] place-items-center">
      <Card className="w-full max-w-[900px] p-0">
        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="p-7 sm:p-9">
            <div className="snow-status-pulse grid h-12 w-12 place-items-center rounded-card bg-snow-cyan text-[#191919]">
              <Layers3 size={22} />
            </div>
            <p className="mt-7 text-sm font-semibold text-white/44">Çalışma alanı beklemede</p>
            <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
              Aktif proje seçilmeden mimari workflow açılmaz.
            </h1>
            <p className="mt-4 max-w-[560px] text-sm leading-6 text-white/48">
              ArchiFlow sahte adım, dosya veya teklif verisi göstermiyor. Bir proje seçildiğinde kaynak dosyalar, mimar notları, hesap kontrolleri ve teklif kapısı aynı çalışma alanında sırayla açılır.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <EmptyStatePoint title="Ne oluyor?" body="Workspace gerçek proje bağlamı bekliyor." />
              <EmptyStatePoint title="Neden boş?" body="Henüz aktif ada/parsel dosyası yok." />
              <EmptyStatePoint title="AI nasıl yardım eder?" body="Proje verisi oluşunca ilk eksik veri listesini hızlandırabilir." />
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              <SnowButton icon={Sparkles} onClick={onNewProject}>
                Proje sihirbazını aç
              </SnowButton>
              <SnowButton icon={FolderKanban} onClick={onShowProjects} tone="secondary">
                Portföyü aç
              </SnowButton>
            </div>
          </div>
          <div className="border-t border-snow-line p-5 lg:border-l lg:border-t-0">
            <SectionTitle title="Açılacak çalışma düzeni" eyebrow="8.3" />
            <div className="mt-5 space-y-3">
              {["Kaynak toplama", "İmar kontrolü", "Alternatif plan", "Paylaşım cetveli", "Teklif kilidi"].map((item, index) => (
                <div className="flex items-center gap-3 rounded-card bg-white/5 px-3 py-3 text-sm" key={item}>
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-white/8 text-xs text-white/58">{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function MissingProjectScreen({
  missingProjectId,
  onNewProject,
  onShowProjects
}: {
  missingProjectId: string;
  onNewProject: () => void;
  onShowProjects: () => void;
}) {
  return (
    <div className="grid min-h-[calc(100vh-150px)] place-items-center">
      <Card className="w-full max-w-[720px]">
        <div className="snow-status-pulse grid h-12 w-12 place-items-center rounded-card bg-[#ffd56a]/90 text-[#191919]">
          <FolderKanban size={22} />
        </div>
        <p className="mt-7 text-sm font-semibold text-white/44">Proje bulunamadı</p>
        <h1 className="mt-3 text-3xl font-semibold leading-tight text-white sm:text-4xl">
          Bu çalışma alanı kayıtlı proje portföyünde yok.
        </h1>
        <p className="mt-4 max-w-[560px] text-sm leading-6 text-white/48">
          İstenen proje kodu <span className="text-white/82">{missingProjectId}</span>. ArchiFlow başka bir projeyi otomatik açmaz; portföyden doğru projeyi seçin veya yeni proje oluşturun.
        </p>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <EmptyStatePoint title="Ne oluyor?" body="İstenen proje kaydı bulunamadı." />
          <EmptyStatePoint title="Neden boş?" body="Kaydedilmiş portföy bu kimliği içermiyor." />
          <EmptyStatePoint title="AI nasıl yardım eder?" body="Yeni dosya açıldığında eksik kimlik alanlarını önerebilir." />
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <SnowButton icon={FolderKanban} onClick={onShowProjects} testId="missing-project-open-list">
            Projeleri aç
          </SnowButton>
          <SnowButton icon={Plus} onClick={onNewProject} testId="missing-project-create" tone="secondary">
            Yeni proje oluştur
          </SnowButton>
        </div>
      </Card>
    </div>
  );
}

function EmptyStatePoint({ body, title }: { body: string; title: string }) {
  return (
    <div className="rounded-card border border-white/10 bg-white/5 p-3">
      <p className="text-xs font-semibold text-white/78">{title}</p>
      <p className="mt-1 text-xs leading-5 text-white/42">{body}</p>
    </div>
  );
}

function PortfolioEmptyState({
  onLoadSamples,
  onNewProject
}: {
  onLoadSamples: () => void;
  onNewProject: () => void;
}) {
  return (
    <div className="grid min-h-[420px] place-items-center p-8">
      <div className="max-w-[680px] text-center">
        <div className="snow-status-pulse mx-auto grid h-12 w-12 place-items-center rounded-card bg-snow-violet text-[#191919]">
          <FolderKanban size={22} />
        </div>
        <p className="mt-5 text-sm font-semibold text-white/44">Portföy hazır, proje bekliyor</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          Burada gerçek, taslak, backend ve arşiv projeleri ayrışacak.
        </h2>
        <p className="mx-auto mt-3 max-w-[540px] text-sm leading-6 text-white/46">
          Henüz proje kaydı olmadığı için tablo boş. Mimar yeni bir ada/parsel dosyası başlattığında kaynak, ilerleme, teklif ve onay durumları burada görünür.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <EmptyStatePoint title="Ne oluyor?" body="Proje portföyü veri bekliyor." />
          <EmptyStatePoint title="Neden boş?" body="Bu hesapta kayıtlı dosya yok." />
          <EmptyStatePoint title="AI nasıl yardım eder?" body="Proje verisi girilince ilk brifing ve eksik veri listesini hızlandırır." />
        </div>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <SnowButton icon={Plus} onClick={onNewProject}>
            Proje sihirbazını aç
          </SnowButton>
          <SnowButton icon={Archive} onClick={onLoadSamples} tone="secondary">
            Demo portföyü incele
          </SnowButton>
        </div>
      </div>
    </div>
  );
}

function SearchEmptyState({
  onNewProject,
  searchQuery
}: {
  onNewProject: () => void;
  searchQuery: string;
}) {
  const normalizedQuery = searchQuery.trim();

  return (
    <div className="grid min-h-[380px] place-items-center p-8">
      <div className="max-w-[660px] text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-white/8 text-white/62">
          <Search size={22} />
        </div>
        <p className="mt-5 text-sm font-semibold text-white/44">Arama sonucu boş</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">
          {normalizedQuery ? `"${normalizedQuery}" için kayıtlı proje bulunmadı.` : "Bu filtreyle eşleşen proje yok."}
        </h2>
        <p className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-white/46">
          Portföydeki gerçek, taslak, backend ve arşiv projeleri bu arama terimiyle eşleşmiyor. Ada/parsel, müşteri veya mahalle bilgisini değiştirin ya da yeni dosyayı proje sihirbazıyla başlatın.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <EmptyStatePoint title="Ne oluyor?" body="Portföy araması sonuç döndürmedi." />
          <EmptyStatePoint title="Neden boş?" body="Kayıtlı projelerde bu terim yok." />
          <EmptyStatePoint title="AI nasıl yardım eder?" body="Proje verisi girilince brifing taslağını hızlandırabilir." />
        </div>
        <div className="mt-7 flex justify-center">
          <SnowButton icon={Sparkles} onClick={onNewProject}>
            Proje sihirbazını aç
          </SnowButton>
        </div>
      </div>
    </div>
  );
}

function ProjectsScreen({
  backendInsights,
  backendSyncState,
  onLoadSamples,
  onNewProject,
  onOpenProject,
  projects,
  searchQuery
}: {
  backendInsights: BackendInsightMap;
  backendSyncState: BackendSyncState;
  onLoadSamples: () => void;
  onNewProject: () => void;
  onOpenProject: (projectId: string, tab?: "workflow" | "files" | "offer") => void;
  projects: Project[];
  searchQuery: string;
}) {
  const normalized = searchQuery.trim().toLocaleLowerCase("tr-TR");
  const filtered = normalized
    ? projects.filter((project) =>
        [project.name, project.client, project.district, project.neighborhood, project.ada, project.parsel]
          .join(" ")
          .toLocaleLowerCase("tr-TR")
          .includes(normalized)
      )
    : projects;

  return (
    <div className="space-y-6">
      <ProjectPortfolioExperienceHero
        onLoadSamples={onLoadSamples}
        onNewProject={onNewProject}
        projects={projects}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {["Tümü", "Aktif", "Teklif Aşamasında", "Tasarım", "Taslak", "Arşiv"].map((label, index) => (
            <button className={cx("snow-focus-ring h-9 rounded-lg border px-4 text-sm font-semibold", index === 0 ? "border-snow-violet bg-snow-violet/10 text-snow-violet" : "border-snow-line bg-white/7 text-white/58")} key={label} type="button">
              {label}
            </button>
          ))}
        </div>
        <BackendSyncPill state={backendSyncState} />
      </div>

      {filtered.length ? (
        <>
          <div className="af-stat-grid">
            <StatCard label="Toplam Proje" value={String(projects.length)} delta="Tüm zamanlar" tone="blue" />
            <StatCard label="Aktif Proje" value={String(projects.filter((project) => project.status !== "Kilitli").length)} delta="Devam eden" tone="green" />
            <StatCard label="Teklif Aşamasında" value={String(projects.filter((project) => project.status === "Teklif").length || 3)} delta="Bu hafta" tone="ice" />
            <StatCard label="Tamamlanan" value={String(projects.filter((project) => project.locked).length || 8)} delta="Toplam" tone="violet" />
            <StatCard label="Toplam İnşaat Alanı" value="16.250 m²" delta="Net alan" tone="blue" />
            <StatCard label="Ortalama Kat Yüksekliği" value="3.20 m" delta="Tüm projelerde" tone="dark" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((project, index) => (
              <ProjectReferenceCard
                backendInsight={backendInsights[project.id]}
                index={index}
                key={project.id}
                onOpenProject={onOpenProject}
                project={project}
              />
            ))}
          </div>
        </>
      ) : projects.length === 0 ? (
        <PortfolioEmptyState onLoadSamples={onLoadSamples} onNewProject={onNewProject} />
      ) : (
        <SearchEmptyState onNewProject={onNewProject} searchQuery={searchQuery} />
      )}
    </div>
  );
}

function ProjectPortfolioExperienceHero({
  onLoadSamples,
  onNewProject,
  projects
}: {
  onLoadSamples: () => void;
  onNewProject: () => void;
  projects: Project[];
}) {
  const featuredProject = projects[0];
  const projectCount = projects.length;
  const activeCount = projects.filter((project) => project.status !== "Kilitli").length;
  const offerCount = projects.filter((project) => project.status === "Teklif").length;

  return (
    <section className="af-project-experience af-experience-hero">
      <div className="af-experience-copy">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-snow-violet">Proje Portföyü</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight text-[#081042]">Projeler</h1>
          <span className="rounded-full bg-snow-violet/10 px-3 py-1 text-xs font-semibold text-snow-violet">{projectCount} Toplam</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-[#11184a]">Mimari ofisin yaşayan proje galerisi</p>
        <p className="mt-3 max-w-[560px] text-[15px] leading-7 text-[#4f5874]">
          Projeler sadece kart listesi değildir. Her parsel, görsel ilerleme sahnesi, teklif ritmi, kaynak izi ve mimari karar geçmişiyle portföyde yerini alır.
        </p>

        <div className="af-story-grid mt-7 grid gap-3 sm:grid-cols-3">
          {[
            ["Portföy", `${projectCount} proje`],
            ["Aktif", `${activeCount} çalışma`],
            ["Teklif", `${offerCount || 1} dosya`]
          ].map(([label, value]) => (
            <div className="af-story-step" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <SnowButton icon={Plus} onClick={onNewProject}>
            Yeni Proje
          </SnowButton>
          <SnowButton icon={Archive} onClick={onLoadSamples} tone="secondary">
            Demo Portföyü
          </SnowButton>
          <SnowButton icon={Grid3X3} tone="secondary">
            Galeri Görünümü
          </SnowButton>
        </div>
      </div>

      <div className="af-experience-stage-wrap">
        <div className="af-experience-stage af-project-stage" data-experience="projects">
          <div className="af-premium-asset af-premium-asset-projects" aria-hidden="true" />
          <OperationalMotionLayer mode="projects" />
          <div className="af-ai-panel">
            <span>AI Portföy Okuması</span>
            <strong>{featuredProject ? `${featuredProject.ada}/${featuredProject.parsel} için sonraki kritik adım izleniyor` : "İlk proje için intake sahnesi hazır"}</strong>
          </div>
          <div className="af-project-gallery-strip">
            {(projects.length ? projects.slice(0, 3) : sampleProjects.slice(0, 3)).map((project, index) => (
              <div className="af-project-gallery-card" key={`${project.id}-${index}`}>
                <div className={cx("af-gallery-asset", `af-gallery-asset-${index}`)} aria-hidden="true" />
                <span>{project.ada}/{project.parsel}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProjectReferenceCard({
  backendInsight,
  index,
  onOpenProject,
  project
}: {
  backendInsight?: KentselAutomationProjectInsight;
  index: number;
  onOpenProject: (projectId: string, tab?: "workflow" | "files" | "offer") => void;
  project: Project;
}) {
  const readiness = getOfferReadiness(project);
  const locked = project.locked;
  const badge = locked ? "Arşiv" : project.status === "Teklif" ? "Teklif Aşamasında" : project.status === "Hazırlık" ? "Tasarım" : "Aktif";
  const badgeClass = locked
    ? "bg-neutral-200 text-white/58"
    : project.status === "Teklif"
      ? "bg-[#ff7a1a]/15 text-[#c46a12]"
      : project.status === "Hazırlık"
        ? "bg-snow-green/35 text-snow-green"
        : "bg-snow-violet text-white";

  return (
    <article className="snow-card overflow-hidden rounded-card p-0">
      <div
        className="block w-full cursor-pointer text-left"
        onClick={() => onOpenProject(project.id)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenProject(project.id);
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`${project.name} projesini aç`}
      >
        <div className="project-render relative h-44">
          <div className={cx("absolute left-4 top-4 z-20 rounded-lg px-3 py-1 text-xs font-semibold", badgeClass)}>
            {badge}
          </div>
          <button
            className="snow-focus-ring absolute right-4 top-4 z-20 grid h-8 w-8 place-items-center rounded-lg bg-white/90 text-[#11184a] transition hover:text-snow-violet"
            onClick={(event) => {
              event.stopPropagation();
              onOpenProject(project.id, readiness.finalOfferReady ? "offer" : "workflow");
            }}
            type="button"
            aria-label={`${project.name} hızlı işlem`}
          >
            <MoreHorizontal size={17} />
          </button>
          <ProjectRenderVisual muted={locked} variant={index} />
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold text-white">{project.ada}/{project.parsel} Parsel</h2>
              <p className="mt-1 text-sm text-white/48">{project.district} / {project.neighborhood}</p>
            </div>
            <SourceBadge source={getProjectDisplaySource(project)} />
          </div>

          <div className="mt-5 grid grid-cols-3 gap-3 text-xs">
            <ProjectMiniMetric label="İnşaat Alanı" value={project.area || "12.840 m²"} />
            <ProjectMiniMetric label="Net Alan" value="9.650 m²" />
            <ProjectMiniMetric label="Kat Adedi" value={String(Math.max(4, Math.min(9, project.stepIndex + 3)))} />
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/58">{workflowSteps[Math.min(project.stepIndex, workflowSteps.length - 1)].title}</span>
              <span className="font-semibold text-white/72">%{project.progress}</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-white/10">
              <div className={cx("h-full rounded-full", index % 3 === 0 ? "bg-snow-violet" : index % 3 === 1 ? "bg-snow-green" : "bg-[#ff7a1a]")} style={{ width: `${project.progress}%` }} />
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4">
            <div className="flex -space-x-2">
              {["M", "A", "K"].map((label, avatarIndex) => (
                <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#f8d5ba,#5a4b42)] text-[10px] font-bold text-white" key={label + avatarIndex}>
                  {label}
                </span>
              ))}
              {backendInsight ? <span className="grid h-7 w-7 place-items-center rounded-full border-2 border-white bg-snow-violet text-[10px] font-bold text-white">AI</span> : null}
            </div>
            <span className="text-xs text-white/42">{project.updatedAt}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

function ProjectMiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 border-r border-snow-line pr-2 last:border-r-0">
      <p className="truncate text-white/42">{label}</p>
      <p className="mt-1 truncate font-semibold text-white/88">{value}</p>
    </div>
  );
}

function ProjectRenderVisual({ muted, variant }: { muted: boolean; variant: number }) {
  return <div className={cx("af-project-render-asset", `af-project-render-asset-${variant % 6}`, muted ? "grayscale opacity-70" : "")} aria-hidden="true" />;
}

function ProjectWizard({
  defaultArchitect,
  onCancel,
  onCreate
}: {
  defaultArchitect: string;
  onCancel: () => void;
  onCreate: (draft: ProjectDraft, intakeSummary: ProjectIntakeSummary) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<ProjectDraft>({ ...emptyDraft, architect: defaultArchitect });
  const [error, setError] = useState<string | null>(null);
  const [selectedMixPreference, setSelectedMixPreference] = useState<string | null>(null);
  const intakeSummary = useMemo(
    () => analyzeKentselProjectIntake(draft, { daireKarmasiPreference: selectedMixPreference }),
    [draft, selectedMixPreference]
  );

  const update = (patch: Partial<ProjectDraft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setError(null);
  };

  const goToStep = (targetStep: number) => {
    if (targetStep <= step) {
      setStep(targetStep);
      setError(null);
      return;
    }

    const validation = validateProjectWizardNavigation(draft, targetStep);
    if (validation) {
      setStep(validation.stepIndex);
      setError(validation.message);
      return;
    }

    setError(null);
    setStep(targetStep);
  };

  const next = () => {
    const message = validateProjectWizardStep(draft, step);
    if (message) {
      setError(message);
      return;
    }

    setError(null);
    setStep((value) => Math.min(value + 1, wizardSteps.length - 1));
  };

  const create = () => {
    const validation = validateProjectWizardBeforeCreate(draft);
    if (validation) {
      setError(validation.message);
      setStep(validation.stepIndex);
      return;
    }

    setError(null);
    onCreate(draft, intakeSummary);
  };

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).map((file) => ({
      id: uniqueId("file"),
      name: file.name,
      type: detectKentselFileType(file.name),
      status: "Yüklendi" as const
    }));
    update({ files: [...files, ...draft.files] });
  };

  const selectMixPreference = (preference: string) => {
    setSelectedMixPreference(preference);
    update({ notes: applyMixPreferenceToNotes(draft.notes, preference) });
  };

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/44">Kural tabanlı intake ön kontrolü</p>
          <h1 className="mt-2 text-3xl font-semibold">Mimari dönüşüm dosyası</h1>
          <p className="mt-2 max-w-[720px] text-sm leading-6 text-white/45">
            Bu panel mimarın girdilerinden kural tabanlı brief, eksik veri, kaynak izi ve sonraki modül önerisi oluşturur; tasarım veya teklif kararı vermez.
          </p>
        </div>
        <SnowButton icon={ChevronLeft} onClick={onCancel} tone="secondary">
          Geri dön
        </SnowButton>
      </div>

      <div className="grid items-start gap-7 xl:grid-cols-[260px_minmax(0,1fr)_340px]">
        <Card className="content-start xl:sticky xl:top-7">
          <SectionTitle title="Kurulum adımları" />
          <div className="mt-5 space-y-2">
            {wizardSteps.map((label, index) => (
              <button
                className={cx(
                  "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-sm transition",
                  index === step ? "bg-white/12 text-white" : "text-white/52 hover:bg-white/7"
                )}
                aria-current={index === step ? "step" : undefined}
                key={label}
                onClick={() => goToStep(index)}
                type="button"
              >
                <span className={cx("grid h-6 w-6 place-items-center rounded-full text-xs", index <= step ? "bg-snow-violet text-[#191919]" : "bg-white/8")}>
                  {index + 1}
                </span>
                {label}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          {step === 0 ? (
            <WizardPanel title="Proje kimliği" subtitle="Proje kartı, sorumlu mimar ve teklif klasörü burada oluşur.">
              <div className="grid gap-4 md:grid-cols-2">
                <SnowField label="Proje adı">
                  <input data-testid="project-name-input" value={draft.name} onChange={(event) => update({ name: event.target.value })} placeholder="Örn. Kadıköy 4300/2 Dönüşüm" />
                </SnowField>
                <SnowField label="Müşteri / firma">
                  <input data-testid="project-client-input" value={draft.client} onChange={(event) => update({ client: event.target.value })} placeholder="İlkbahar İnşaat" />
                </SnowField>
                <SnowField label="Sorumlu mimar">
                  <input value={draft.architect} onChange={(event) => update({ architect: event.target.value })} />
                </SnowField>
                <SnowField label="Kat karşılığı">
                  <input value={draft.ratio} onChange={(event) => update({ ratio: event.target.value })} />
                </SnowField>
              </div>
            </WizardPanel>
          ) : null}

          {step === 1 ? (
            <WizardPanel title="Ada/parsel ve imar" subtitle="Konum ve imar bilgisi 8.3 akışının hesap katmanını besler.">
              <div className="grid gap-4 md:grid-cols-2">
                <SnowField label="İlçe">
                  <input data-testid="project-district-input" value={draft.district} onChange={(event) => update({ district: event.target.value })} placeholder="Kadıköy" />
                </SnowField>
                <SnowField label="Mahalle">
                  <input data-testid="project-neighborhood-input" value={draft.neighborhood} onChange={(event) => update({ neighborhood: event.target.value })} placeholder="Feneryolu" />
                </SnowField>
                <SnowField label="Ada">
                  <input data-testid="project-ada-input" value={draft.ada} onChange={(event) => update({ ada: event.target.value })} placeholder="4300" />
                </SnowField>
                <SnowField label="Parsel">
                  <input data-testid="project-parsel-input" value={draft.parsel} onChange={(event) => update({ parsel: event.target.value })} placeholder="2" />
                </SnowField>
                <SnowField label="Parsel alanı">
                  <input data-testid="project-area-input" value={draft.area} onChange={(event) => update({ area: event.target.value })} placeholder="684 m²" />
                </SnowField>
                <SnowField label="İmar notu">
                  <input data-testid="project-zoning-input" value={draft.zoning} onChange={(event) => update({ zoning: event.target.value })} placeholder="Ayrık nizam / 5 kat" />
                </SnowField>
              </div>
            </WizardPanel>
          ) : null}

          {step === 2 ? (
            <WizardPanel title="Kaynak dosyalar" subtitle="E-imar, TKGM, pafta, mevcut plan ve metraj dosyaları aynı proje kaydına bağlanır.">
              <label className="snow-button snow-focus-ring grid min-h-[150px] cursor-pointer place-items-center rounded-card border border-dashed border-white/18 bg-white/5 p-6 text-center transition hover:bg-white/8">
                <input className="sr-only" multiple onChange={handleFiles} type="file" />
                <div>
                  <UploadCloud className="mx-auto text-snow-cyan" size={30} />
                  <p className="mt-3 text-sm font-semibold">Dosya seç</p>
                  <p className="mt-1 text-xs text-white/42">PDF, DWG, DXF, XLSX, PNG</p>
                </div>
              </label>
              <div className="mt-5 grid gap-2">
                {draft.files.length ? (
                  draft.files.map((file) => <FileRow file={file} key={file.id} />)
                ) : (
                  <p className="rounded-card bg-white/5 px-4 py-3 text-sm leading-6 text-white/45">
                    Henüz kaynak dosya seçilmedi. Projeyi başlatmak için zorunlu değil; intake özeti kaynak dosya eksiklerini görünür tutacak.
                  </p>
                )}
              </div>
            </WizardPanel>
          ) : null}

          {step === 3 ? (
            <WizardPanel title="Daire karması hedefleri" subtitle="Kat karşılığı, daire adedi ve tasarım tercihi alternatif üretimini yönlendirir.">
              <div className="grid gap-4 md:grid-cols-2">
                <SnowField label="Hedef daire adedi">
                  <input data-testid="project-units-input" value={draft.units} onChange={(event) => update({ units: event.target.value })} placeholder="18" />
                </SnowField>
                <SnowField label="Kat karşılığı oranı">
                  <input value={draft.ratio} onChange={(event) => update({ ratio: event.target.value })} placeholder="%50" />
                </SnowField>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Daire karması tercihi">
                {["1+1 minimum", "2+1 ağırlıklı", "3+1 cephe koruma"].map((item) => (
                  <button
                    className={cx(
                      "snow-button snow-focus-ring rounded-card border px-4 py-4 text-left text-sm transition",
                      selectedMixPreference === item
                        ? "border-snow-violet bg-snow-violet/18 text-white"
                        : "border-snow-line bg-white/5 text-white/76 hover:bg-white/8"
                    )}
                    aria-checked={selectedMixPreference === item}
                    key={item}
                    onClick={() => selectMixPreference(item)}
                    role="radio"
                    type="button"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <SnowField className="mt-5" label="Mimar notu">
                <textarea rows={4} value={draft.notes} onChange={(event) => update({ notes: event.target.value })} placeholder="Malik konum koruma, müteahhit tercihi, özel notlar..." />
              </SnowField>
            </WizardPanel>
          ) : null}

          {step === 4 ? (
            <WizardPanel title="Kontrol ve oluştur" subtitle="Proje oluşturulduğunda mimar 17 adımlı çalışma alanına geçer.">
              <div className="grid gap-3">
                <ReviewLine label="Proje" value={draft.name || "Eksik"} />
                <ReviewLine label="Parsel" value={`${draft.ada || "-"} / ${draft.parsel || "-"}`} />
                <ReviewLine label="İmar" value={draft.zoning || "Sonra girilecek"} />
                <ReviewLine label="Dosya" value={`${draft.files.length} dosya`} />
                <ReviewLine label="Daire" value={`${draft.units || "-"} hedef`} />
              </div>
              <IntakeReviewPanel summary={intakeSummary} />
            </WizardPanel>
          ) : null}

          {error ? <p className="mt-5 rounded-card bg-red-500/12 px-4 py-3 text-sm text-red-200" role="alert">{error}</p> : null}

          <div className="mt-7 flex flex-wrap justify-between gap-3">
              <SnowButton icon={ChevronLeft} onClick={() => setStep((value) => Math.max(value - 1, 0))} testId="wizard-prev" tone="secondary" disabled={step === 0}>
                Önceki
              </SnowButton>
              {step < wizardSteps.length - 1 ? (
              <SnowButton icon={ChevronRight} onClick={next} testId="wizard-next">
                Sonraki
              </SnowButton>
            ) : (
              <SnowButton icon={CheckCircle2} onClick={create} testId="wizard-create">
                Projeyi oluştur
              </SnowButton>
            )}
          </div>
        </Card>

        <Card className="max-h-[calc(100vh-180px)] overflow-auto xl:sticky xl:top-7">
          <IntakeAssistantPanel currentStep={step} summary={intakeSummary} />
        </Card>
      </div>
    </div>
  );
}

function ProjectWorkspace({
  addFilesToProject,
  backendInsight,
  generateOffer,
  lockProject,
  missingProjectId,
  onCompleteStep,
  onOpenRecommendedModule,
  onNewProject,
  onShowProjects,
  project,
  selectedStepIndex,
  setSelectedStepIndex,
  tab,
  setTab,
  updateProjectNotes
}: {
  addFilesToProject: (project: Project, files: FileList | null) => void;
  backendInsight?: KentselAutomationProjectInsight;
  generateOffer: (project: Project) => void;
  lockProject: (project: Project) => void;
  missingProjectId: string | null;
  onCompleteStep: (project: Project) => void;
  onOpenRecommendedModule: (route: string) => void;
  onNewProject: () => void;
  onShowProjects: () => void;
  project: Project | null;
  selectedStepIndex: number;
  setSelectedStepIndex: (index: number) => void;
  tab: "workflow" | "files" | "offer";
  setTab: (tab: "workflow" | "files" | "offer") => void;
  updateProjectNotes: (project: Project, notes: string) => void;
}) {
  if (!project) {
    if (missingProjectId) {
      return (
        <MissingProjectScreen
          missingProjectId={missingProjectId}
          onNewProject={onNewProject}
          onShowProjects={onShowProjects}
        />
      );
    }

    return <WorkspaceEmptyState onNewProject={onNewProject} onShowProjects={onShowProjects} />;
  }

  const selectedStep = workflowSteps[selectedStepIndex] ?? workflowSteps[0];
  const isSelectedCurrent = selectedStepIndex === Math.min(project.stepIndex, workflowSteps.length - 1);
  const offerReadiness = getOfferReadiness(project);
  const backendReviewBlocked = isBlockedByBackendReview(backendInsight);
  const finalOfferReady = offerReadiness.finalOfferReady && !backendReviewBlocked;
  const canGenerateOffer = offerReadiness.canGenerateFinalOffer && !backendReviewBlocked;

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <StatusBadge status={project.status} />
            <SourceBadge source={getProjectDisplaySource(project)} />
            <span className="text-sm text-white/38">{project.id}</span>
          </div>
          <h1 className="mt-2 truncate text-3xl font-semibold">{project.name}</h1>
          <p className="mt-2 text-sm text-white/48">
            {project.district} / {project.neighborhood} · Ada {project.ada} Parsel {project.parsel}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <SnowButton icon={Download} onClick={() => downloadOffer(project)} testId="workspace-download-offer-top" tone="secondary" disabled={!finalOfferReady}>
            Teklifi indir
          </SnowButton>
          <SnowButton
            icon={Sparkles}
            onClick={() => generateOffer(project)}
            testId="workspace-generate-offer-top"
            tone={canGenerateOffer ? "primary" : "secondary"}
          >
            {canGenerateOffer ? "Teklif üret" : "Teklif ön kontrolü"}
          </SnowButton>
        </div>
      </div>

      <div className="grid gap-7 2xl:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-7">
          <Card className="p-0">
            <div className="flex flex-col items-start gap-4 border-b border-snow-line px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-6">
              <div className="snow-hide-scrollbar flex w-full gap-2 overflow-x-auto sm:w-auto">
                {[
                  ["workflow", "İş akışı", Layers3],
                  ["files", "Dosyalar", HardDrive],
                  ["offer", "Teklif", FileText]
                ].map(([key, label, Icon]) => (
                  <button
                    className={cx(
                      "snow-focus-ring flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm transition",
                      tab === key ? "bg-white/12 text-white" : "text-white/50 hover:bg-white/7"
                    )}
                    aria-pressed={tab === key}
                    key={String(key)}
                    onClick={() => setTab(key as "workflow" | "files" | "offer")}
                    type="button"
                  >
                    <Icon size={16} />
                    {String(label)}
                  </button>
                ))}
              </div>
              <MetricBar value={project.progress} compact />
            </div>

            {tab === "workflow" ? (
              <div className="grid gap-0 xl:grid-cols-[280px_minmax(0,1fr)]">
                <div className="max-h-[420px] overflow-auto border-b border-snow-line p-4 md:max-h-[560px] xl:max-h-[720px] xl:border-b-0 xl:border-r">
                  <div className="space-y-2">
                    {workflowSteps.map((step, index) => {
                      const state = index < project.stepIndex ? "done" : index === project.stepIndex ? "active" : "wait";
                      return (
                        <button
                          className={cx(
                            "snow-workflow-step snow-focus-ring grid w-full grid-cols-[34px_minmax(0,1fr)] gap-3 rounded-lg p-3 text-left transition",
                            selectedStepIndex === index ? "is-selected bg-white/12" : "hover:bg-white/7",
                            state === "done" ? "is-done" : "",
                            state === "active" ? "is-active" : "",
                            state === "wait" ? "is-wait" : ""
                          )}
                          aria-current={selectedStepIndex === index ? "step" : undefined}
                          key={step.title}
                          onClick={() => setSelectedStepIndex(index)}
                          type="button"
                        >
                          <span
                            className={cx(
                              "snow-workflow-step-index grid h-8 w-8 place-items-center rounded-full text-xs",
                              state === "done" ? "bg-snow-green text-[#191919]" : "",
                              state === "active" ? "bg-snow-violet text-[#191919]" : "",
                              state === "wait" ? "bg-white/8 text-white/38" : ""
                            )}
                          >
                            {state === "done" ? <Check size={15} /> : index + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">{step.title}</span>
                            <span className="mt-1 block text-xs text-white/38">{step.group}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="p-5 sm:p-6">
                  <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_260px]">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white/44">
                        {selectedStep.group} · {selectedStep.owner} · {selectedStep.time}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold">{selectedStep.title}</h2>
                      <p className="mt-3 text-sm leading-6 text-white/48">{selectedStep.objective}</p>

                      <div className="mt-6 grid gap-4 xl:grid-cols-3">
                        <Checklist title="Girdi" items={selectedStep.inputs} />
                        <Checklist title="Çıktı" items={selectedStep.outputs} />
                        <Checklist title="Kontrol" items={selectedStep.checks} />
                      </div>

                      <SnowField className="mt-6" label="Mimar karar notu">
                        <textarea
                          aria-describedby="workflow-note-helper"
                          onChange={(event) => updateProjectNotes(project, event.target.value)}
                          rows={4}
                          value={project.notes}
                        />
                      </SnowField>
                      <p id="workflow-note-helper" className="mt-2 text-xs text-white/38">
                        Notlar proje kaydına otomatik yazılır ve teklif çıktısına yansır.
                      </p>

                      <div className="mt-6 flex flex-wrap gap-3">
                        <SnowButton icon={CheckCircle2} onClick={() => onCompleteStep(project)} disabled={!isSelectedCurrent || project.locked} testId="workspace-complete-step">
                          Adımı tamamla
                        </SnowButton>
                        <SnowButton icon={Sparkles} onClick={() => generateOffer(project)} testId="workspace-generate-offer" tone="secondary">
                          {canGenerateOffer ? "Teklif üret" : "Teklif ön kontrolü"}
                        </SnowButton>
                      </div>
                    </div>

                    <div className="space-y-5">
                      <PlanPreview compact />
                      <Card className="bg-white/5">
                        <SectionTitle title="Proje özeti" />
                        <div className="mt-4 space-y-3">
                          <ReviewLine label="Alan" value={project.area} />
                          <ReviewLine label="İmar" value={project.zoning} />
                          <ReviewLine label="Daire" value={project.units} />
                          <ReviewLine label="Paylaşım" value={project.ratio} />
                        </div>
                      </Card>
                      {project.intakeSummary ? (
                        <IntakeSnapshotCard
                          onOpenRecommendedModule={onOpenRecommendedModule}
                          summary={project.intakeSummary}
                        />
                      ) : null}
                      <BackendInsightCard insight={backendInsight} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "files" ? (
              <div className="p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <SectionTitle title="Proje kaynak dosyaları" eyebrow="E-imar / CAD / metraj" />
                  <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-card bg-snow-violet px-4 text-sm font-semibold text-[#191919]">
                    <UploadCloud size={16} />
                    Dosya seç
                    <input className="sr-only" multiple onChange={(event) => addFilesToProject(project, event.target.files)} type="file" />
                  </label>
                </div>
                <div className="mt-5 grid gap-3">
                  {project.files.length ? (
                    project.files.map((file) => <FileRow file={file} key={file.id} />)
                  ) : (
                    <ProjectFilesEmptyState />
                  )}
                </div>
              </div>
            ) : null}

            {tab === "offer" ? (
              <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div>
                  <SectionTitle title="Teklif paketi" eyebrow="PDF / PNG / paylaşım cetveli" />
                  {!offerReadiness.canGenerateFinalOffer ? (
                    <div className="mt-5 rounded-card border border-[#ffd56a]/30 bg-[#ffd56a]/10 p-4">
                      <p className="text-sm font-semibold text-[#ffd56a]">Final teklif için zorunlu akış eksik</p>
                      <p className="mt-2 text-sm leading-6 text-white/58">
                        8.3 iş akışına göre teklif paketi; alan hesabı, paylaşım cetveli, mevzuat/kalite kontrol raporu ve mimar seçimi tamamlanmadan final çıktı olarak üretilemez.
                      </p>
                      <div className="mt-4 grid gap-2">
                        {offerReadiness.missingSteps.slice(0, 4).map((step) => (
                          <div className="flex items-center gap-3 rounded-lg bg-white/6 px-3 py-2 text-sm" key={step.stepNumber}>
                            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs text-white/52">
                              {step.stepNumber}
                            </span>
                            <span className="text-white/78">{step.title}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  <div className="mt-5 grid gap-4 sm:grid-cols-3">
                    <PackageTile label="Teklif PDF" ready={finalOfferReady} />
                    <PackageTile label="Plan PNG" ready={finalOfferReady} />
                    <PackageTile label="Paylaşım eki" ready={finalOfferReady} />
                  </div>
                  <SnowField className="mt-6" label="Teklif notu">
                    <textarea
                      aria-describedby="offer-note-helper"
                      onChange={(event) => updateProjectNotes(project, event.target.value)}
                      rows={6}
                      value={project.notes}
                    />
                  </SnowField>
                  <p id="offer-note-helper" className="mt-2 text-xs text-white/38">
                    Bu not indirme paketindeki mimar karar notu olarak kullanılır.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <SnowButton
                      icon={Sparkles}
                      onClick={() => generateOffer(project)}
                      testId="offer-generate"
                      tone={canGenerateOffer ? "primary" : "secondary"}
                    >
                      {canGenerateOffer ? "Teklif üret" : "Ön koşulları göster"}
                    </SnowButton>
                    <SnowButton icon={Download} onClick={() => downloadOffer(project)} testId="offer-download" tone="secondary" disabled={!finalOfferReady}>
                      İndir
                    </SnowButton>
                    <SnowButton icon={CheckCircle2} onClick={() => lockProject(project)} testId="offer-lock" tone="secondary" disabled={!finalOfferReady || project.locked}>
                      Versiyonu kilitle
                    </SnowButton>
                  </div>
                </div>
                <Card className="bg-white/5">
                  <SectionTitle title="Teslim kontrolü" />
                  <div className="mt-5 space-y-3">
                    {[
                      ["Seçili tip plan", project.stepIndex > 10],
                      ["Alan hesapları", project.stepIndex > 12],
                      ["Paylaşım cetveli", project.stepIndex > 13],
                      ["Mevzuat raporu", project.stepIndex > 14],
                      ["Backend inceleme", !backendReviewBlocked],
                      ["Teklif PDF", finalOfferReady],
                      ["İnsan onayı", project.locked]
                    ].map(([label, ready]) => (
                      <div className="flex items-center justify-between gap-3 text-sm" key={String(label)}>
                        <span>{String(label)}</span>
                        <span className={cx("rounded-full px-2 py-1 text-xs", ready ? "bg-snow-green text-[#191919]" : "bg-white/8 text-white/42")}>
                          {ready ? "Hazır" : "Bekliyor"}
                        </span>
                      </div>
                    ))}
                  </div>
                </Card>
                <BackendInsightCard insight={backendInsight} />
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-7">
          <Card>
            <SectionTitle title="Son hareketler" />
            <div className="mt-5 space-y-4">
              {project.activity.length ? (
                project.activity.slice(0, 5).map((item) => <ActivityRow activity={item} key={item.id} />)
              ) : (
                <ProjectActivityEmptyState />
              )}
            </div>
          </Card>

          <Card>
            <SectionTitle title="Teklif durumu" />
            <div className="mt-5 grid place-items-center">
              <Donut value={finalOfferReady ? 100 : project.progress} />
            </div>
          </Card>
          <BackendInsightCard insight={backendInsight} />
        </div>
      </div>
    </div>
  );
}

function ModuleScreen({
  activeProject,
  definition,
  onNewProject,
  onOpenProject,
  view
}: {
  activeProject: Project | null;
  definition: ModuleDefinition;
  onNewProject: () => void;
  onOpenProject: () => void;
  view: ModuleView;
}) {
  const Icon = definition.icon;
  const moduleMetrics = createModuleMetrics(activeProject, definition);
  const moduleRows = activeProject ? createModuleRows(activeProject) : [];
  const referenceProject = activeProject;
  const legacyProject = activeProject as Project | null;

  if (referenceProject) {
    return (
      <ReferenceModuleScreen
        definition={definition}
        onNewProject={onNewProject}
        onOpenProject={onOpenProject}
        project={referenceProject}
        view={view}
      />
    );
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-white/44">{definition.eyebrow}</p>
          <h1 className="mt-2 flex items-center gap-3 text-3xl font-semibold">
            <Icon className="text-snow-cyan" size={28} />
            {definition.title}
          </h1>
        </div>
        <div className="flex flex-wrap gap-3">
          <SnowButton icon={Layers3} onClick={onOpenProject} tone="secondary" disabled={!activeProject}>
            Aktif projeyi aç
          </SnowButton>
          <SnowButton icon={Plus} onClick={onNewProject}>
            Yeni proje
          </SnowButton>
        </div>
      </div>

      <div className="grid gap-7 sm:grid-cols-3">
        {moduleMetrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} tone={metric.tone} />
        ))}
      </div>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="p-0">
          <div className="flex h-14 items-center justify-between border-b border-snow-line px-6">
            <SectionTitle title={`${definition.title} kayıtları`} />
            <MoreHorizontal size={18} className="text-white/45" />
          </div>
          {activeProject ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="text-white/38">
                  <tr className="border-b border-snow-line">
                    <th className="px-6 py-3 font-normal">Başlık</th>
                    <th className="px-4 py-3 font-normal">Değer</th>
                    <th className="px-4 py-3 font-normal">Durum</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleRows.map((row) => (
                    <tr className="border-b border-snow-line last:border-0" key={row.join("-")}>
                      <td className="px-6 py-4 text-white/88">{row[0]}</td>
                      <td className="px-4 py-4 text-white/68">{row[1]}</td>
                      <td className="px-4 py-4">
                        <span className="rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/62">{row[2]}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <ModuleEmptyState onNewProject={onNewProject} />
          )}
        </Card>

        <Card>
          <SectionTitle title="Bağlı proje" eyebrow="Çalışma alanı" />
          {legacyProject ? (
            <div className="mt-5 space-y-4">
              <p className="text-lg font-semibold">{legacyProject.name}</p>
              <div>
                <SourceBadge source={getProjectDisplaySource(legacyProject)} />
              </div>
              <ReviewLine label="Durum" value={legacyProject.status} />
              <ReviewLine label="İlerleme" value={`%${legacyProject.progress}`} />
              <MetricBar value={legacyProject.progress} />
            </div>
          ) : (
            <div className="mt-5 rounded-card bg-white/5 p-4 text-sm leading-6 text-white/45">
              Aktif proje seçilmediği için bu modül gerçek kayıt göstermiyor. Yeni proje başlatın ya da portföyden bir proje açın.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

type ReferenceModuleSurface = "map" | "depth" | "library" | "mix" | "metraj" | "finance" | "reports" | "files" | "plans";
type ReferenceModuleExperience =
  | "parcel-gis"
  | "zoning-blueprint"
  | "hmax-mass"
  | "plan-ocr"
  | "metraj-heatmap"
  | "core-3d"
  | "apartment-stack"
  | "ownership-allocation"
  | "proposal-booklet"
  | "file-vault";

type ExperienceMotionMode = ReferenceModuleExperience | "projects";

const operationalMotionProfiles: Record<ExperienceMotionMode, { accent: string; primary: string; secondary: string }> = {
  "apartment-stack": {
    accent: "Karma dengesi",
    primary: "Daire yığını",
    secondary: "tipler okunuyor"
  },
  "core-3d": {
    accent: "Çekirdek seçimi",
    primary: "3D çekirdek",
    secondary: "kat tekrarı izleniyor"
  },
  "file-vault": {
    accent: "Kaynak kasası",
    primary: "Dosya izi",
    secondary: "kanıt sırası korunuyor"
  },
  "hmax-mass": {
    accent: "Hmax kontrolü",
    primary: "Kütle taraması",
    secondary: "yükseklik sınırı canlı"
  },
  "metraj-heatmap": {
    accent: "Alan farkı",
    primary: "Metraj ısı izi",
    secondary: "sapmalar işaretleniyor"
  },
  "ownership-allocation": {
    accent: "Paylaşım dengesi",
    primary: "Hak sahipliği",
    secondary: "oranlar karşılaştırılıyor"
  },
  "parcel-gis": {
    accent: "Ada/parsel",
    primary: "GIS taraması",
    secondary: "parsel sınırı sabit"
  },
  "plan-ocr": {
    accent: "OCR kontrolü",
    primary: "Plan okuma",
    secondary: "mahaller eşleşiyor"
  },
  projects: {
    accent: "Portföy ritmi",
    primary: "Proje akışı",
    secondary: "kritik adımlar izleniyor"
  },
  "proposal-booklet": {
    accent: "Teslim paketi",
    primary: "Teklif sahnesi",
    secondary: "çıktılar hazırlanıyor"
  },
  "zoning-blueprint": {
    accent: "İmar notu",
    primary: "Plan notu",
    secondary: "kurallar katmanlanıyor"
  }
};

type ReferenceModuleConfig = {
  title: string;
  eyebrow: string;
  status: string;
  tabs: string[];
  actionLabel: string;
  stats: Array<{ label: string; value: string; delta: string; tone: "blue" | "ice" | "green" | "violet" | "dark" }>;
  surface: ReferenceModuleSurface;
  experience: ReferenceModuleExperience;
  experienceTitle: string;
  experienceCopy: string;
  experienceSignal: string;
  story: Array<[string, string]>;
  primaryTitle: string;
  secondaryTitle: string;
  tableTitle: string;
  tableColumns: string[];
  tableRows: string[][];
  summary: Array<[string, string]>;
  quickActions: Array<[LucideIcon, string]>;
  documents: Array<[LucideIcon, string, string]>;
};

function ReferenceModuleScreen({
  definition,
  onNewProject,
  onOpenProject,
  project,
  view
}: {
  definition: ModuleDefinition;
  onNewProject: () => void;
  onOpenProject: () => void;
  project: Project;
  view: ModuleView;
}) {
  const config = createReferenceModuleConfig(view, project, definition);

  return (
    <div className="space-y-6">
      <ModuleExperienceHero
        config={config}
        onNewProject={onNewProject}
        onOpenProject={onOpenProject}
        project={project}
      />

      <div className="snow-hide-scrollbar flex gap-7 overflow-x-auto border-b border-snow-line">
        {config.tabs.map((tab, index) => (
          <button
            className={cx(
              "snow-focus-ring relative h-11 shrink-0 rounded-md px-1 text-sm font-semibold transition",
              index === 0 ? "text-snow-violet" : "text-[#4f5874] hover:text-[#101746]"
            )}
            aria-current={index === 0 ? "page" : undefined}
            key={tab}
            type="button"
          >
            {tab}
            {index === 0 ? <span className="absolute inset-x-0 bottom-[-1px] h-0.5 rounded-full bg-snow-violet" /> : null}
          </button>
        ))}
      </div>

      <div className="af-stat-grid">
        {config.stats.map((stat) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} delta={stat.delta} tone={stat.tone} />
        ))}
      </div>

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_330px]">
        <div className="min-w-0 space-y-5">
          <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,.75fr)]">
            <Card className="min-w-0 min-h-[340px] p-5">
              <SectionTitle title={config.primaryTitle} />
              <ReferenceModuleSurfaceView config={config} project={project} />
            </Card>
            <Card className="min-w-0 min-h-[340px] p-5">
              <SectionTitle title={config.secondaryTitle} />
              <ReferenceModuleSecondaryView config={config} />
            </Card>
          </div>

          <Card className="min-w-0 p-0">
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-snow-line px-5">
              <SectionTitle title={config.tableTitle} />
              <button className="snow-focus-ring grid h-9 w-9 place-items-center rounded-lg border border-snow-line bg-white text-[#11184a]" type="button" aria-label="Tablo seçenekleri">
                <MoreHorizontal size={18} />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="text-[#6c7590]">
                  <tr className="border-b border-snow-line">
                    {config.tableColumns.map((column) => (
                      <th className="px-5 py-3 font-semibold" key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {config.tableRows.map((row) => (
                    <tr className="border-b border-snow-line last:border-0" key={row.join("-")}>
                      {row.map((cell, index) => (
                        <td className={cx("px-5 py-4", index === 0 ? "font-semibold text-[#11184a]" : "text-[#4f5874]")} key={`${cell}-${index}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>

        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <SectionTitle title={`${config.title} Özeti`} />
            <div className="mt-5 space-y-3">
              {config.summary.map(([label, value]) => (
                <ReviewLine key={label} label={label} value={value} />
              ))}
            </div>
            <div className="mt-5">
              <SnowButton icon={Sparkles} onClick={onOpenProject} tone="secondary">
                Detaylı Akışa Git
              </SnowButton>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle title="Hızlı İşlemler" />
            <div className="mt-4 grid grid-cols-4 gap-3">
              {config.quickActions.map(([Icon, label]) => (
                <button className="snow-focus-ring grid gap-2 rounded-card border border-snow-line bg-white px-2 py-3 text-center text-[11px] font-medium text-[#4f5874]" key={label} type="button">
                  <span className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-snow-violet/10 text-snow-violet">
                    <Icon size={16} />
                  </span>
                  {label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionTitle title="İlgili Dokümanlar" />
              <button className="text-xs font-semibold text-snow-violet" type="button">Tümü</button>
            </div>
            <div className="mt-4 space-y-3">
              {config.documents.map(([Icon, name, meta]) => (
                <div className="flex items-center gap-3 rounded-card border border-snow-line bg-white px-3 py-3" key={name}>
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-snow-violet/10 text-snow-violet">
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#11184a]">{name}</p>
                    <p className="mt-1 text-xs text-[#6c7590]">{meta}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function OperationalMotionLayer({ mode }: { mode: ExperienceMotionMode }) {
  const profile = operationalMotionProfiles[mode];

  return (
    <div className="af-operational-motion" aria-hidden="true">
      <span className="af-motion-sweep" />
      <span className="af-motion-vector af-motion-vector-a" />
      <span className="af-motion-vector af-motion-vector-b" />
      <span className="af-motion-pulse af-motion-pulse-a" />
      <span className="af-motion-pulse af-motion-pulse-b" />
      <span className="af-motion-chip af-motion-chip-a">
        <span>{profile.primary}</span>
        <strong>{profile.secondary}</strong>
      </span>
      <span className="af-motion-chip af-motion-chip-b">
        <span>{profile.accent}</span>
        <strong>kontrol altında</strong>
      </span>
    </div>
  );
}

function ModuleExperienceHero({
  config,
  onNewProject,
  onOpenProject,
  project
}: {
  config: ReferenceModuleConfig;
  onNewProject: () => void;
  onOpenProject: () => void;
  project: Project;
}) {
  return (
    <section className={cx("af-experience-hero", `af-experience-${config.experience}`)}>
      <div className="af-experience-copy">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-snow-violet">
          {config.eyebrow} <span className="mx-2 text-[#98a2bc]">›</span> {project.ada}/{project.parsel} Parsel
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-[28px] font-semibold leading-tight text-[#081042]">{config.title}</h1>
          <span className="rounded-full bg-snow-green/16 px-3 py-1 text-xs font-semibold text-snow-green">{config.status}</span>
        </div>
        <p className="mt-3 text-sm font-semibold text-[#11184a]">{config.experienceTitle}</p>
        <p className="mt-3 max-w-[560px] text-[15px] leading-7 text-[#4f5874]">{config.experienceCopy}</p>

        <div className="af-story-grid mt-7 grid gap-3 sm:grid-cols-3">
          {config.story.map(([label, value]) => (
            <div className="af-story-step" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="mt-7 flex flex-wrap gap-3">
          <SnowButton icon={Sparkles} onClick={onOpenProject} tone="secondary">
            Akışı Aç
          </SnowButton>
          <SnowButton icon={FileText} onClick={onOpenProject} tone="secondary">
            Rapor Oluştur
          </SnowButton>
          <SnowButton icon={Plus} onClick={onNewProject}>
            {config.actionLabel}
          </SnowButton>
        </div>
      </div>

      <div className="af-experience-stage-wrap">
        <div className="af-experience-stage" data-experience={config.experience}>
          <div className={cx("af-premium-asset", `af-premium-asset-${config.experience}`)} aria-hidden="true" />
          <OperationalMotionLayer mode={config.experience} />
          <div className="af-ai-panel">
            <span>AI Görselleştirme</span>
            <strong>{config.experienceSignal}</strong>
          </div>
          <div className="af-floating-node af-floating-node-a">
            <Sparkles size={15} />
            <span>Kaynak izi</span>
          </div>
          <div className="af-floating-node af-floating-node-b">
            <Ruler size={15} />
            <span>Kontrol katmanı</span>
          </div>
        </div>
      </div>
    </section>
  );
}

function createReferenceModuleConfig(view: ModuleView, project: Project, definition: ModuleDefinition): ReferenceModuleConfig {
  const baseSummary: Array<[string, string]> = [
    ["Proje", project.name],
    ["Ada / Parsel", `${project.ada}/${project.parsel}`],
    ["İmar", project.zoning],
    ["İlerleme", `%${project.progress}`]
  ];
  const documents: Array<[LucideIcon, string, string]> = [
    [FileText, `${project.ada}_${project.parsel}_imar.pdf`, "PDF · kaynak"],
    [HardDrive, `${project.ada}_${project.parsel}_plan.dwg`, "DWG · çizim"],
    [FileText, `${project.ada}_${project.parsel}_rapor.pdf`, "PDF · çıktı"]
  ];
  const quickActions: Array<[LucideIcon, string]> = [
    [Sparkles, "Analiz"],
    [UploadCloud, "Dosya"],
    [FileText, "Rapor"],
    [Download, "Dışa Aktar"]
  ];
  const fallback: ReferenceModuleConfig = {
    title: definition.title,
    eyebrow: definition.eyebrow,
    status: "Aktif",
    tabs: ["Özet", "Detaylar", "Raporlar", "Geçmiş"],
    actionLabel: "Yeni Kayıt",
    stats: createModuleMetrics(project, definition).map((metric) => ({ ...metric, delta: "Aktif proje" })),
    surface: "plans",
    experience: "plan-ocr",
    experienceTitle: "Mimari çalışma sahnesi",
    experienceCopy: "Bu alan veriden önce bağlamı gösterir: kaynak, karar ve kontrol katmanları tek mimari yüzeyde okunur.",
    experienceSignal: "Kural tabanlı ön okuma hazır",
    story: [
      ["01", "Kaynak okunur"],
      ["02", "Kontrol katmanı açılır"],
      ["03", "Mimar onayı bekler"]
    ],
    primaryTitle: "Mimari Çalışma Yüzeyi",
    secondaryTitle: "Analiz Dağılımı",
    tableTitle: `${definition.title} Detayları`,
    tableColumns: ["Başlık", "Değer", "Durum", "Kaynak"],
    tableRows: createModuleRows(project).map((row) => [...row, "Proje"]),
    summary: baseSummary,
    quickActions,
    documents
  };

  const configs: Partial<Record<ModuleView, ReferenceModuleConfig>> = {
    "site-analysis": {
      ...fallback,
      title: "Parseller",
      eyebrow: "Çalışma Alanı",
      tabs: ["Tümü", "İmar Analizi Yapılan", "Analiz Bekleyen", "Gelişim Aşamasında", "Arşiv"],
      actionLabel: "Yeni Parsel",
      surface: "map",
      experience: "parcel-gis",
      experienceTitle: "Parseli önce haritada hisset",
      experienceCopy: "Parsel dosyası bir tabloyla değil, GIS yüzeyi, komşu sınırlar, imar bindirmeleri ve kaynak iziyle açılır. Mimar önce araziyi görür, sonra veriye iner.",
      experienceSignal: "Parsel sınırı ve çevre katmanı ayrıştırılıyor",
      story: [
        ["GIS", "Parsel ve komşular"],
        ["Overlay", "İmar ve risk katmanı"],
        ["Sonraki", "İmar analizi"]
      ],
      primaryTitle: "Parsel Haritası",
      secondaryTitle: "Parsel Dağılımı",
      stats: [
        { label: "Toplam Parsel", value: "58", delta: "Tüm zamanlar", tone: "blue" },
        { label: "İmar Analizi Yapılan", value: "32", delta: "%55", tone: "green" },
        { label: "Gelişim Aşamasında", value: "18", delta: "%31", tone: "ice" },
        { label: "Potansiyel Net Alan", value: "128.450 m²", delta: "Toplam", tone: "violet" },
        { label: "Arsa Sahipleri", value: "45", delta: "Aktif", tone: "blue" },
        { label: "Aktif Proje", value: project.ada, delta: `${project.parsel} parsel`, tone: "dark" }
      ],
      tableTitle: "Parsel Listesi",
      tableColumns: ["Ada / Parsel", "Adres", "İl / İlçe", "Alan", "İmar Durumu", "Durum"],
      tableRows: [
        [`${project.ada}/${project.parsel}`, `${project.neighborhood} Mah.`, project.district, project.area, project.zoning, project.status],
        ["4300/2", "Feneryolu Mah.", "Kadıköy", "16.250 m²", "Ticaret + Konut", "Gelişim Aşamasında"],
        ["2881/4", "Erenköy Mah.", "Kadıköy", "11.200 m²", "Konut Alanı", "İmar Analizi"]
      ]
    },
    "regulation-analysis": {
      ...fallback,
      title: "İmar Analizi",
      eyebrow: "İmar Analizi",
      tabs: ["Özet", "İmar Durumu", "Hesaplamalar", "Kısıtlar", "Görseller", "Raporlar", "Geçmiş"],
      actionLabel: "Yeni Analiz",
      surface: "map",
      experience: "zoning-blueprint",
      experienceTitle: "İmar kararını çizim üstünde oku",
      experienceCopy: "İmar analizi önce parselin teknik çizim yüzeyini açar; emsal, çekme, hmax ve plan notları ayrı veri kutuları değil, aynı blueprint katmanında görünür.",
      experienceSignal: "Regülasyon bindirmeleri görselleştiriliyor",
      story: [
        ["Plan", "1/1000 imar izi"],
        ["Kısıt", "Çekme ve yapılaşma"],
        ["Onay", "Mimar kontrolü"]
      ],
      primaryTitle: "Parsel Konumu",
      secondaryTitle: "Analiz Sonucu",
      stats: [
        { label: "İmar Durumu", value: "Konut Alanı", delta: "KAKS 2.20", tone: "green" },
        { label: "Taban Alanı", value: "1.865 m²", delta: "%35", tone: "violet" },
        { label: "Toplam İnşaat Alanı", value: "11.200 m²", delta: "Hesaplandı", tone: "blue" },
        { label: "Kat Adedi", value: "7 Kat", delta: "Zemin + 6", tone: "ice" },
        { label: "Hmax", value: "21.50 m", delta: "Uygun", tone: "green" },
        { label: "Çekme", value: "Ön 5.00 m", delta: "Yan 3.00 m", tone: "violet" }
      ],
      tableTitle: "İmar Durumu Detayları",
      tableColumns: ["Plan Adı", "Tasdik", "Ölçek", "Fonksiyon", "KAKS", "Hmax"],
      tableRows: [
        ["Çankaya Uygulama İmar Planı", "12.05.2022", "1/1000", "Konut Alanı", "2.20", "21.50 m"],
        ["Plan Notları", "12.05.2022", "PDF", "Ayrık Nizam", "0.35 TAKS", "7 Kat"]
      ]
    },
    "zoning-rules": {
      ...fallback,
      title: "Derinlik & Hmax Hesabı",
      eyebrow: "Derinlik & Hmax",
      tabs: ["Özet", "Derinlik Hesabı", "Hmax Hesabı", "Kat Analizi", "Kısıtlar", "Görseller", "Raporlar"],
      actionLabel: "Yeni Hesaplama",
      surface: "depth",
      experience: "hmax-mass",
      experienceTitle: "Yüksekliği kütle olarak gör",
      experienceCopy: "Derinlik ve Hmax hesabı sayılarla başlamaz; yapı zarfı, çekme mesafeleri ve yükseklik sınırı mimari kütle üzerinde okunur.",
      experienceSignal: "Hmax ve setback hacmi taranıyor",
      story: [
        ["Zarf", "Maksimum hacim"],
        ["Hmax", "21.50 m sınır"],
        ["Çekme", "5 / 3 / 3 m"]
      ],
      primaryTitle: "3D Analiz Görüntüsü",
      secondaryTitle: "Yönetmelik Kontrolü",
      stats: [
        { label: "Parsel Alanı", value: project.area || "12.840 m²", delta: "Net alan", tone: "blue" },
        { label: "İmar Durumu", value: "Konut Alanı", delta: "E: 2.20", tone: "violet" },
        { label: "Yapılaşma", value: "Hmax'a göre", delta: "Uygun", tone: "ice" },
        { label: "Hmax", value: "21.50 m", delta: "Belirlenen maks.", tone: "dark" },
        { label: "Maks. Kat", value: "7 Kat", delta: "Zemin + 6", tone: "green" },
        { label: "Çekme", value: "5 / 3 / 3 m", delta: "Ön / yan / arka", tone: "blue" }
      ],
      tableTitle: "Kat Yükseklikleri",
      tableColumns: ["Kat", "Kot", "Yükseklik", "Kümülatif"],
      tableRows: [
        ["Zemin Kat", "+0.30", "3.00 m", "3.00 m"],
        ["1. Kat", "+3.30", "3.00 m", "6.00 m"],
        ["2. Kat", "+6.30", "3.00 m", "9.00 m"],
        ["6. Kat", "+18.30", "3.00 m", "21.20 m"]
      ]
    },
    calculations: {
      ...fallback,
      title: "Metraj",
      eyebrow: "Metraj",
      tabs: ["Özet", "Alan Çıktıları", "Mahaller", "Kat Bazlı Metraj", "Birim Fiyatlar", "Raporlar"],
      actionLabel: "Yeni Metraj",
      surface: "metraj",
      experience: "metraj-heatmap",
      experienceTitle: "Metrajı alan ısısı olarak keşfet",
      experienceCopy: "Metraj ekranı önce alanların mekansal dağılımını gösterir. Net, ortak, şaft ve otopark alanları okunabilir bir heatmap içinde ayrışır.",
      experienceSignal: "Alan sınıfları renklendiriliyor",
      story: [
        ["Net", "Daire alanı"],
        ["Ortak", "Sirkülasyon"],
        ["Maliyet", "Birim fiyat izi"]
      ],
      primaryTitle: "Alan Dağılımı",
      secondaryTitle: "Kat Bazlı Alan Dağılımı",
      stats: [
        { label: "Toplam İnşaat Alanı", value: "16.250 m²", delta: "Brüt Alan", tone: "blue" },
        { label: "Toplam Net Alan", value: "12.840 m²", delta: "Net Alan", tone: "green" },
        { label: "Sirkülasyon Alanı", value: "2.650 m²", delta: "%16.31", tone: "ice" },
        { label: "Toplam Hacim", value: "51.860 m³", delta: "Hacim", tone: "violet" },
        { label: "Tahmini Maliyet", value: "₺ 68.450.000", delta: "KDV Hariç", tone: "dark" },
        { label: "Metraj Kalemi", value: "128", delta: "Toplam", tone: "blue" }
      ],
      tableTitle: "Metraj Kalemleri",
      tableColumns: ["Kalem Kodu", "Kalem Adı", "Birim", "Miktar", "Birim Fiyat", "Tutar"],
      tableRows: [
        ["01.01", "Betonarme İmalatlar", "m³", "2.845,60", "₺2.450,00", "₺6.973.720,00"],
        ["01.02", "Duvar İmalatları", "m²", "4.250,80", "₺650,00", "₺2.763.020,00"],
        ["01.03", "Döşeme Kaplamaları", "m²", "16.250,00", "₺320,00", "₺5.200.000,00"]
      ]
    },
    models: {
      ...fallback,
      title: "Çekirdek Kütüphanesi",
      eyebrow: "Çekirdek Kütüphanesi",
      tabs: ["Tümü", "Asansör", "Merdiven", "Yangın", "Şaft", "Favoriler"],
      actionLabel: "Yeni Çekirdek",
      surface: "library",
      experience: "core-3d",
      experienceTitle: "Çekirdeği bir katalog değil, yapı parçası gibi seç",
      experienceCopy: "Çekirdek kütüphanesi 3D çekirdek, şaft, merdiven ve asansör ilişkisini göstererek başlar; tip kartları ancak bağlamdan sonra gelir.",
      experienceSignal: "Çekirdek uygunluk matrisi hazırlanıyor",
      story: [
        ["3D", "Şaft ve merdiven"],
        ["Uyum", "Kat aralığı"],
        ["Seçim", "C-03 önerisi"]
      ],
      primaryTitle: "Çekirdek Tipleri",
      secondaryTitle: "Önerilen Çekirdek",
      tableTitle: "Çekirdek Teknik Özeti",
      tableColumns: ["Kod", "Tip", "Alan", "Kapasite", "Uygun Kat", "Etiket"],
      tableRows: [
        ["C-01", "Standart Asansör Çekirdeği", "45.00 m²", "8 kişi / 630 kg", "2 - 20 Kat", "Asansör"],
        ["C-02", "Çift Asansör Çekirdeği", "52.00 m²", "13 kişi / 1000 kg", "2 - 25 Kat", "Asansör"],
        ["C-03", "Merdiven + Asansör", "61.50 m²", "13 kişi / 1000 kg", "2 - 30 Kat", "Asansör"]
      ],
      stats: [
        { label: "Toplam Çekirdek", value: "86", delta: "Tüm tipler", tone: "violet" },
        { label: "Asansör Çekirdeği", value: "42", delta: "%48.8", tone: "green" },
        { label: "Merdiven Çekirdeği", value: "28", delta: "%32.6", tone: "blue" },
        { label: "Yangın Merdiveni", value: "10", delta: "%11.6", tone: "ice" },
        { label: "Şaft Grubu", value: "6", delta: "%7.0", tone: "dark" },
        { label: "Aktif Seçim", value: "C-03", delta: "Önerilen", tone: "violet" }
      ]
    },
    "apartment-mix": {
      ...fallback,
      title: "Daire Karması",
      eyebrow: "Daire Karması",
      tabs: ["Özet", "Daire Tipleri", "Kat Dağılımı", "Alan Dağılımı", "Pazar Analizi", "Alternatif Senaryolar"],
      actionLabel: "Yeni Karma",
      surface: "mix",
      experience: "apartment-stack",
      experienceTitle: "Daire karmasını katlarda gör",
      experienceCopy: "Daire karması önce katlara yayılan yaşam senaryosu olarak açılır. Tip dağılımı, satılabilir alan ve pazar ağırlığı aynı kesitte okunur.",
      experienceSignal: "Kat dağılımı ve tip dengesi simüle ediliyor",
      story: [
        ["Tip", "1+1 / 2+1 / 3+1"],
        ["Kat", "Dağılım dengesi"],
        ["Pazar", "Talep skoru"]
      ],
      primaryTitle: "Daire Tipi Dağılımı",
      secondaryTitle: "Kat Dağılımı",
      stats: [
        { label: "Toplam Daire", value: project.units || "96", delta: "Adet", tone: "violet" },
        { label: "Toplam Net Alan", value: "9.850 m²", delta: "Net Alan", tone: "green" },
        { label: "Ortalama Brüt Alan", value: "132.5 m²", delta: "/ Daire", tone: "blue" },
        { label: "Satılabilir Alan", value: "11.420 m²", delta: "Brüt Alan", tone: "ice" },
        { label: "Pazar Talep Skoru", value: "8.7 / 10", delta: "Yüksek", tone: "green" },
        { label: "Tahmini Gelir", value: "₺ 68.450.000", delta: "KDV Hariç", tone: "dark" }
      ],
      tableTitle: "Daire Tipi Detayları",
      tableColumns: ["Daire Tipi", "Daire Adedi", "Oran", "Net Alan", "Brüt Alan", "Tahmini Gelir"],
      tableRows: [
        ["1+1", "22", "%22.9", "52.3 m²", "68.7 m²", "₺47.300.000"],
        ["2+1", "38", "%39.6", "82.1 m²", "106.4 m²", "₺115.225.000"],
        ["3+1", "26", "%27.1", "124.6 m²", "152.3 m²", "₺97.425.000"]
      ]
    },
    comparisons: {
      ...fallback,
      title: "Paylaşım & Hesap",
      eyebrow: "Paylaşım & Hesap",
      tabs: ["Özet", "Paylaşım Cetveli", "Gelir & Gider", "Nakit Akışı", "Hisse Dağılımı", "Varsayımlar"],
      actionLabel: "Yeni Hesaplama",
      surface: "finance",
      experience: "ownership-allocation",
      experienceTitle: "Paylaşımı daire ve hisse akışı olarak oku",
      experienceCopy: "Paylaşım ekranı finans tablosuyla başlamaz; arsa sahibi, müteahhit, daire ve nakit dengesinin görsel akışını kurar.",
      experienceSignal: "Hisse ve daire eşleştirmesi kontrol ediliyor",
      story: [
        ["Arsa", "%50 pay"],
        ["Müteahhit", "%50 pay"],
        ["Denge", "Net tahsilat"]
      ],
      primaryTitle: "Paylaşım Özeti",
      secondaryTitle: "Arsa Sahibi Payı",
      stats: [
        { label: "Toplam Satış Geliri", value: "₺ 68.450.000", delta: "KDV Hariç", tone: "violet" },
        { label: "Toplam Maliyet", value: "₺ 42.120.000", delta: "KDV Hariç", tone: "green" },
        { label: "Toplam Kar", value: "₺ 26.330.000", delta: "KDV Hariç", tone: "ice" },
        { label: "Arsa Sahibi Payı", value: "₺ 13.165.000", delta: "%50.0", tone: "blue" },
        { label: "Müteahhit Payı", value: "₺ 13.165.000", delta: "%50.0", tone: "violet" },
        { label: "Katılım Payı", value: "₺ 1.250.000", delta: "%4.7", tone: "dark" }
      ],
      tableTitle: "Paylaşım Cetveli",
      tableColumns: ["Açıklama", "Toplam", "Arsa Sahibi", "Müteahhit", "Oran"],
      tableRows: [
        ["Toplam Satış Geliri", "₺68.450.000", "₺34.225.000", "₺34.225.000", "%100"],
        ["Toplam Maliyet", "₺42.120.000", "-", "₺42.120.000", "-"],
        ["Net Pay", "₺24.430.000", "₺12.215.000", "₺12.215.000", "%35.6"]
      ]
    },
    reports: {
      ...fallback,
      title: "Teklif & Raporlar",
      eyebrow: "Teklif & Raporlar",
      tabs: ["Özet", "Teklifler", "Raporlar", "Şablonlar", "Paylaşılanlar", "Arşiv"],
      actionLabel: "Yeni Teklif",
      surface: "reports",
      experience: "proposal-booklet",
      experienceTitle: "Teklifi sunum paketi olarak önizle",
      experienceCopy: "Teklif ekranı önce mimarın teslim edeceği kitapçığı gösterir. Rapor, özet, kaynak ve onay akışı sunum modunda birleşir.",
      experienceSignal: "Teklif kitapçığı bölümleri hazırlanıyor",
      story: [
        ["Brief", "Proje özeti"],
        ["Ekler", "Hesap ve planlar"],
        ["Onay", "Kilitli sürüm"]
      ],
      primaryTitle: "Teklif Durum Dağılımı",
      secondaryTitle: "Teklif Değer Trendi",
      stats: [
        { label: "Toplam Teklif", value: "18", delta: "Adet", tone: "violet" },
        { label: "Beklemede", value: "6", delta: "Teklif", tone: "ice" },
        { label: "Gönderilen", value: "8", delta: "Teklif", tone: "blue" },
        { label: "Kabul Edilen", value: "3", delta: "Teklif", tone: "green" },
        { label: "Raporlar", value: "10", delta: "Rapor", tone: "violet" },
        { label: "Toplam Değer", value: "₺ 68.450.000", delta: "KDV Hariç", tone: "dark" }
      ],
      tableTitle: "Teklifler",
      tableColumns: ["Teklif No", "Proje / Parsel", "Teklif Türü", "Toplam Tutar", "Durum", "Tarih"],
      tableRows: [
        ["TEK-2026-018", `${project.ada}/${project.parsel} Parsel`, "Kat Karşılığı Teklif", "₺ 12.450.000", "Beklemede", "01.07.2026"],
        ["TEK-2026-017", "2531/4 Parsel", "Mimari Proje Teklifi", "₺ 8.750.000", "Gönderilen", "30.06.2026"],
        ["TEK-2026-016", "2528/2 Parsel", "Fizibilite Raporu", "₺ 6.300.000", "Kabul Edildi", "29.06.2026"]
      ]
    },
    files: {
      ...fallback,
      title: "Dosyalar",
      eyebrow: "Dosyalar",
      tabs: ["Tümü", "İmar", "CAD", "Metraj", "Teklif", "Arşiv"],
      actionLabel: "Dosya Yükle",
      surface: "files",
      experience: "file-vault",
      experienceTitle: "Kaynakları yaşayan bir dosya kasasında gör",
      experienceCopy: "Dosyalar yalnızca liste değildir; imar, CAD, metraj ve teklif kaynakları proje hafızasının görsel katmanları olarak açılır.",
      experienceSignal: "Dosya türleri ve kaynak izi sınıflandırılıyor",
      story: [
        ["Kaynak", "PDF / DWG / XLSX"],
        ["Durum", "Okundu / bekliyor"],
        ["İz", "Teklife bağlanır"]
      ],
      primaryTitle: "Kaynak Dosya Kasası",
      secondaryTitle: "Kaynak Türleri",
      tableTitle: "Dosya Listesi",
      tableColumns: ["Dosya", "Tür", "Durum", "Kaynak", "Tarih"],
      tableRows: project.files.length
        ? project.files.map((file) => [file.name, file.type, file.status, getProjectDisplaySource(project), project.updatedAt])
        : [["Kaynak dosya bekleniyor", "Belge", "Bekliyor", getProjectDisplaySource(project), project.updatedAt]]
    },
    plans: {
      ...fallback,
      title: "Eski Planlar",
      eyebrow: "Eski Planlar",
      tabs: ["Özet", "Planlar", "Katlar", "Mahaller", "Eksikler", "Geçmiş"],
      actionLabel: "Plan Yükle",
      surface: "plans",
      experience: "plan-ocr",
      experienceTitle: "Eski planı tarama masasında aç",
      experienceCopy: "Mevcut planlar önce çizim tarama yüzeyiyle karşılar. OCR, mahal ayrımı ve plan karşılaştırması veri tablosundan önce görünür olur.",
      experienceSignal: "Plan çizgileri ve mahal blokları taranıyor",
      story: [
        ["Scan", "Çizim okunur"],
        ["OCR", "Mahaller ayrışır"],
        ["Kontrol", "Mimar onayı"]
      ],
      primaryTitle: "Mevcut Plan Okuması",
      secondaryTitle: "Eksik Veri Kontrolü",
      tableTitle: "Plan ve Metraj Girdileri",
      tableColumns: ["Kaynak", "Kat", "Durum", "Okuma", "Not"],
      tableRows: [
        ["Zemin Kat Planı.pdf", "Zemin", "Yüklendi", "Bekliyor", "Mahaller kontrol edilecek"],
        ["Normal Kat.dwg", "1-6", "Kontrol", "Kural tabanlı", "Şaft ve çekirdek eşleşmeli"]
      ]
    }
  };

  return configs[view] ?? fallback;
}

function ReferenceModuleSurfaceView({ config, project }: { config: ReferenceModuleConfig; project: Project }) {
  if (config.surface === "map") return <ReferenceMapVisual project={project} />;
  if (config.surface === "depth") return <ReferenceDepthVisual />;
  if (config.surface === "library") return <ReferenceCoreLibrary />;
  if (config.surface === "mix") return <ReferenceMixVisual />;
  if (config.surface === "metraj") return <ReferenceMetrajVisual />;
  if (config.surface === "finance") return <ReferenceFinanceVisual />;
  if (config.surface === "reports") return <ReferenceReportsVisual />;
  if (config.surface === "files") return <ReferenceFilesVisual project={project} />;
  return <ReferencePlansVisual />;
}

function ReferenceModuleSecondaryView({ config }: { config: ReferenceModuleConfig }) {
  if (config.surface === "library") {
    return (
      <div className="mt-5 space-y-4">
        <ReferenceCoreMiniCard code="C-03" title="Merdiven + Asansör Çekirdeği" />
        <ReviewLine label="Alan" value="61.50 m²" />
        <ReviewLine label="Kapasite" value="13 kişi / 1000 kg" />
        <ReviewLine label="Uygun Kat" value="2 - 30 Kat" />
      </div>
    );
  }

  if (config.surface === "reports") {
    return <MiniLineTrend />;
  }

  if (config.surface === "files" || config.surface === "plans") {
    return (
      <div className="mt-5 space-y-3">
        {config.documents.map(([Icon, name, meta]) => (
          <div className="flex items-center gap-3 rounded-card border border-snow-line bg-white px-3 py-3" key={name}>
            <Icon className="text-snow-violet" size={16} />
            <div>
              <p className="text-sm font-semibold text-[#11184a]">{name}</p>
              <p className="mt-1 text-xs text-[#6c7590]">{meta}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-6 grid place-items-center">
      <Donut value={config.surface === "finance" ? 50 : config.surface === "mix" ? 87 : 65} />
      <div className="mt-6 w-full space-y-3">
        {config.summary.slice(1, 5).map(([label, value]) => (
          <ReviewLine key={label} label={label} value={value} />
        ))}
      </div>
    </div>
  );
}

function ReferenceMapVisual({ project }: { project: Project }) {
  return (
    <div className="relative mt-5 h-[280px] overflow-hidden rounded-card border border-snow-line bg-[linear-gradient(135deg,#f7f9fd,#eef3fb)]">
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(91,105,135,.08)_1px,transparent_1px),linear-gradient(rgba(91,105,135,.08)_1px,transparent_1px)] bg-[size:36px_36px]" />
      <div className="absolute left-[18%] top-[34%] h-24 w-44 rotate-[-12deg] rounded-xl border-2 border-snow-violet bg-snow-violet/18 shadow-[0_20px_50px_rgba(101,88,255,.22)]" />
      <div className="absolute left-[48%] top-[24%] h-24 w-36 rotate-[10deg] rounded-xl border border-snow-violet/35 bg-snow-violet/12" />
      <div className="absolute right-[12%] top-[18%] h-20 w-32 rotate-[-18deg] rounded-xl border border-[#ff7a1a]/60 bg-[#ff7a1a]/12" />
      <div className="absolute left-[31%] top-[38%] rounded-lg bg-snow-violet px-3 py-1 text-xs font-bold text-white shadow-[0_12px_28px_rgba(101,88,255,.26)]">
        {project.ada}/{project.parsel}
      </div>
      <div className="absolute left-4 top-4 grid gap-2">
        {["+", "-", "⌖"].map((item) => (
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-snow-line bg-white text-sm font-semibold text-[#11184a]" key={item}>{item}</span>
        ))}
      </div>
    </div>
  );
}

function ReferenceDepthVisual() {
  return (
    <div className="relative mt-5 h-[280px] overflow-hidden rounded-card border border-snow-line bg-[linear-gradient(135deg,#f8fbff,#eef5ff)]">
      <DashboardBuildingIllustration />
      <div className="absolute left-5 top-5 grid gap-2">
        {["3D", "2D", "⌗"].map((item) => (
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-snow-line bg-white text-xs font-bold text-snow-violet" key={item}>{item}</span>
        ))}
      </div>
      <span className="absolute right-8 top-10 rounded-lg bg-white px-3 py-2 text-xs font-bold text-snow-violet shadow-[0_12px_28px_rgba(101,88,255,.16)]">Hmax 21.50 m</span>
      <span className="absolute bottom-8 left-16 rounded-lg bg-white px-3 py-2 text-xs font-bold text-snow-violet shadow-[0_12px_28px_rgba(101,88,255,.16)]">Ön Bahçe 5.00 m</span>
    </div>
  );
}

function ReferenceCoreLibrary() {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {[
        ["C-01", "Standart Asansör", "45.00 m²"],
        ["C-02", "Çift Asansör", "52.00 m²"],
        ["C-03", "Merdiven + Asansör", "61.50 m²"],
        ["C-04", "Çift Merdiven", "48.00 m²"]
      ].map(([code, title, area]) => (
        <ReferenceCoreMiniCard area={area} code={code} key={code} title={title} />
      ))}
    </div>
  );
}

function ReferenceCoreMiniCard({ area, code, title }: { area?: string; code: string; title: string }) {
  return (
    <div className="rounded-card border border-snow-line bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-md bg-snow-violet/10 px-2 py-1 text-xs font-bold text-snow-violet">{code}</span>
        <span className="text-[#ffad25]">★</span>
      </div>
      <div className="mt-4 h-24 rounded-lg border border-snow-line bg-[linear-gradient(90deg,rgba(88,100,130,.12)_1px,transparent_1px),linear-gradient(rgba(88,100,130,.12)_1px,transparent_1px)] bg-[size:18px_18px]" />
      <p className="mt-3 text-sm font-semibold text-[#11184a]">{title}</p>
      <p className="mt-1 text-xs text-[#6c7590]">{area ?? "61.50 m²"} · 2 - 30 Kat</p>
    </div>
  );
}

function ReferenceMixVisual() {
  return (
    <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <Donut value={96} />
      <div className="space-y-3">
        {[
          ["1+1 Daire", "22", "%22.9"],
          ["2+1 Daire", "38", "%39.6"],
          ["3+1 Daire", "26", "%27.1"],
          ["4+1 Daire", "8", "%8.3"]
        ].map(([label, value, percent]) => (
          <div className="grid grid-cols-[minmax(0,1fr)_48px_56px] gap-3 text-sm" key={label}>
            <span className="font-semibold text-[#11184a]">{label}</span>
            <span className="text-right text-[#4f5874]">{value}</span>
            <span className="text-right text-[#4f5874]">{percent}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceMetrajVisual() {
  return (
    <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <Donut value={78} />
      <div className="space-y-4">
        {[
          ["Net Daire Alanı", "9.850 m²", "w-[70%]", "bg-snow-violet"],
          ["Ortak Alanlar", "2.650 m²", "w-[42%]", "bg-snow-green"],
          ["Tesisat & Şaft", "1.250 m²", "w-[28%]", "bg-[#ff7a1a]"],
          ["Otopark", "2.500 m²", "w-[36%]", "bg-[#aeb6ca]"]
        ].map(([label, value, width, color]) => (
          <div key={label}>
            <div className="flex justify-between text-sm font-semibold text-[#11184a]">
              <span>{label}</span>
              <span>{value}</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[#e8edf6]">
              <div className={cx("h-2 rounded-full", width, color)} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ReferenceFinanceVisual() {
  return (
    <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <Donut value={50} />
      <div className="space-y-3">
        <ReviewLine label="Arsa Sahibi Payı" value="₺ 13.165.000" />
        <ReviewLine label="Müteahhit Payı" value="₺ 13.165.000" />
        <ReviewLine label="Katılım Payı" value="₺ 1.250.000" />
        <ReviewLine label="Vergi ve Kesintiler" value="₺ 650.000" />
      </div>
    </div>
  );
}

function ReferenceReportsVisual() {
  return (
    <div className="mt-6 grid items-center gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
      <Donut value={18} />
      <div className="space-y-3">
        <LegendLine color="bg-snow-violet" label="Beklemede" value="6" />
        <LegendLine color="bg-snow-blue" label="Gönderilen" value="8" />
        <LegendLine color="bg-snow-green" label="Kabul Edilen" value="3" />
        <LegendLine color="bg-[#ff7a1a]" label="Reddedilen" value="1" />
      </div>
    </div>
  );
}

function ReferenceFilesVisual({ project }: { project: Project }) {
  return (
    <div className="mt-5 grid gap-3">
      {(project.files.length ? project.files : [{ id: "empty", name: "Kaynak dosya bekleniyor", type: "Belge", status: "Bekliyor" }]).map((file) => (
        <div className="flex items-center justify-between gap-4 rounded-card border border-snow-line bg-white px-4 py-3" key={file.id}>
          <div className="flex min-w-0 items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-snow-violet/10 text-snow-violet">
              <FileText size={17} />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-[#11184a]">{file.name}</p>
              <p className="mt-1 text-xs text-[#6c7590]">{file.type}</p>
            </div>
          </div>
          <span className="rounded-full bg-snow-green/14 px-3 py-1 text-xs font-semibold text-snow-green">{file.status}</span>
        </div>
      ))}
    </div>
  );
}

function ReferencePlansVisual() {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2">
      {["Zemin Kat", "Normal Kat", "Çatı Katı", "Bodrum"].map((label, index) => (
        <div className="rounded-card border border-snow-line bg-white p-4" key={label}>
          <div className="h-28 rounded-lg border border-snow-line bg-[linear-gradient(90deg,rgba(88,100,130,.11)_1px,transparent_1px),linear-gradient(rgba(88,100,130,.11)_1px,transparent_1px)] bg-[size:20px_20px]" />
          <p className="mt-3 text-sm font-semibold text-[#11184a]">{label}</p>
          <p className="mt-1 text-xs text-[#6c7590]">{index === 0 ? "Okuma bekliyor" : "Kontrol listesinde"}</p>
        </div>
      ))}
    </div>
  );
}

function MiniLineTrend() {
  return (
    <div className="mt-6 h-[240px] rounded-card border border-snow-line bg-[linear-gradient(180deg,#ffffff,#f7f9ff)] p-5">
      <svg className="h-full w-full" viewBox="0 0 360 190" fill="none" aria-hidden="true">
        {[40, 80, 120, 160].map((y) => (
          <path d={`M20 ${y}H340`} stroke="#e0e6f1" key={y} />
        ))}
        <path d="M24 148C68 126 88 112 122 116C156 120 174 72 210 70C246 68 266 38 306 52C322 58 330 62 338 60" stroke="#6558ff" strokeWidth="4" strokeLinecap="round" />
        <path d="M24 148C68 126 88 112 122 116C156 120 174 72 210 70C246 68 266 38 306 52C322 58 330 62 338 60V188H24V148Z" fill="url(#trendFill)" />
        <defs>
          <linearGradient id="trendFill" x1="181" y1="44" x2="181" y2="188" gradientUnits="userSpaceOnUse">
            <stop stopColor="#6558ff" stopOpacity=".22" />
            <stop offset="1" stopColor="#6558ff" stopOpacity="0" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

function ModuleEmptyState({ onNewProject }: { onNewProject: () => void }) {
  return (
    <div className="grid min-h-[360px] place-items-center p-8">
      <div className="max-w-[620px] text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-card bg-snow-cyan text-[#191919]">
          <Layers3 size={22} />
        </div>
        <p className="mt-5 text-sm font-semibold text-white/44">Aktif proje bekleniyor</p>
        <h2 className="mt-3 text-2xl font-semibold text-white">Bu modül proje bağlanmadan sahte kayıt göstermez.</h2>
        <p className="mx-auto mt-3 max-w-[520px] text-sm leading-6 text-white/46">
          Parsel, dosya, hesap ve teklif kayıtları seçili proje üzerinden oluşur. Bu ekranda veri yok çünkü henüz aktif proje seçilmedi.
        </p>
        <div className="mt-6 grid gap-3 text-left sm:grid-cols-3">
          <EmptyStatePoint title="Ne oluyor?" body="Modül gerçek proje verisi bekliyor." />
          <EmptyStatePoint title="Neden boş?" body="Bağlı aktif çalışma alanı yok." />
          <EmptyStatePoint title="AI nasıl yardım eder?" body="Proje açıldığında eksik veri ve sonraki adım özetini hızlandırabilir." />
        </div>
        <div className="mt-7">
          <SnowButton icon={Sparkles} onClick={onNewProject}>
            Proje sihirbazını aç
          </SnowButton>
        </div>
      </div>
    </div>
  );
}

function ProjectFilesEmptyState() {
  return (
    <div className="rounded-card border border-dashed border-white/14 bg-white/5 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-card bg-snow-cyan/90 text-[#191919]">
          <UploadCloud size={20} />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Kaynak dosya bekleniyor</p>
          <p className="mt-2 text-sm leading-6 text-white/46">
            Bu proje açıldı, fakat henüz e-imar, TKGM, pafta, mevcut plan, metraj veya görsel kaynak bağlanmadı. Dosyalar eklendiğinde teklif ve kontrol adımları aynı proje izinde takip edilir.
          </p>
          <p className="mt-3 text-xs leading-5 text-white/38">
            Sonraki adım: üstteki Dosya seç kontrolüyle ilk kaynakları bağlayın; sistem dosya tiplerini proje kaydına işler.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <EmptyStatePoint title="Ne oluyor?" body="Dosya kasası gerçek kaynak bekliyor." />
            <EmptyStatePoint title="Neden boş?" body="Bu projeye henüz dosya seçilmedi." />
            <EmptyStatePoint title="AI nasıl yardım eder?" body="Dosyalar eklendiğinde eksik veri listesini hızlandırabilir." />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectActivityEmptyState() {
  return (
    <div className="rounded-card bg-white/5 p-4">
      <div className="flex gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/8 text-white/58">
          <FileText size={17} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white/82">Karar izi henüz oluşmadı</p>
          <p className="mt-2 text-xs leading-5 text-white/42">
            İlk adım tamamlandığında mimar kararları, dosya eklemeleri, teklif kontrolleri ve sistem önerileri burada zaman çizgisine dönüşür.
          </p>
          <p className="mt-2 text-xs leading-5 text-white/38">
            Sonraki adım: çalışma akışındaki aktif adımı tamamlayın veya kaynak dosya ekleyin.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-3">
        <EmptyStatePoint title="Ne oluyor?" body="Aktivite günlüğü ilk kayıtları bekliyor." />
        <EmptyStatePoint title="Neden boş?" body="Bu projede henüz iş akışı aksiyonu yok." />
        <EmptyStatePoint title="AI nasıl yardım eder?" body="Aktivite oluşunca sonraki adım ve risk özetini hızlandırabilir." />
      </div>
    </div>
  );
}

function IntakeAssistantPanel({
  currentStep,
  summary
}: {
  currentStep: number;
  summary: ProjectIntakeSummary;
}) {
  const missingCount = summary.missingDataChecklist.filter((item) => item.status === "missing").length;
  return (
    <div>
      <SectionTitle title="Intake ön kontrolü" eyebrow="Kural tabanlı / mimar onaylı" />
      <div className="mt-5 rounded-card border border-white/10 bg-white/5 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-white/42">Hazırlık skoru</p>
            <p className="mt-1 text-3xl font-semibold text-white">%{summary.readinessScore}</p>
          </div>
          <span className="rounded-full bg-[#ffd56a]/12 px-2.5 py-1 text-xs text-[#ffd56a]">İnsan onayı gerekli</span>
        </div>
        <MetricBar value={summary.readinessScore} />
        <p className="mt-3 text-xs leading-5 text-white/42">
          Bu özet AI için hazırlanmış yapılandırılmış bir intake’tir; final karar üretmez, mimarın kontrolünü hızlandırır.
        </p>
      </div>

      <div className="mt-5 space-y-3">
        <IntakeMiniSection title="Akış fazı">
          <IntakeWorkflowPath currentStep={currentStep} summary={summary} />
        </IntakeMiniSection>

        <IntakeMiniSection title="Eksik veri">
          {missingCount ? (
            summary.missingDataChecklist
              .filter((item) => item.status === "missing")
              .slice(0, 3)
              .map((item) => <IntakeChecklistRow item={item} key={item.label} />)
          ) : (
            <p className="rounded-card bg-snow-green/10 px-3 py-3 text-xs leading-5 text-snow-green">
              Zorunlu intake alanları hazır. Yine de teklif ve kilit için mimar onayı gerekir.
            </p>
          )}
        </IntakeMiniSection>

        <IntakeMiniSection title="Sonraki öneri">
          <div className="rounded-card bg-white/5 p-3">
            <p className="text-sm font-semibold text-white/84">{summary.nextModule.label}</p>
            <p className="mt-1 text-xs leading-5 text-white/42">{summary.nextModule.reason}</p>
          </div>
        </IntakeMiniSection>
      </div>
    </div>
  );
}

function IntakeWorkflowPath({
  currentStep,
  summary
}: {
  currentStep: number;
  summary: ProjectIntakeSummary;
}) {
  return (
    <div className="space-y-2">
      {intakeWorkflowPhases.map((phase, index) => {
        const status = getIntakePhaseStatus(summary, index);
        const active = index === Math.min(currentStep, intakeWorkflowPhases.length - 1);

        return (
          <div
            className={cx(
              "rounded-card border px-3 py-3 transition",
              active ? "border-snow-violet/40 bg-snow-violet/12" : "border-white/8 bg-white/5"
            )}
            key={phase.title}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/84">{phase.title}</p>
                <p className="mt-1 text-xs leading-5 text-white/40">{phase.detail}</p>
              </div>
              <span className={cx("shrink-0 rounded-full px-2 py-1 text-xs", intakePhaseTone(status))}>{status}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function IntakeReviewPanel({ summary }: { summary: ProjectIntakeSummary }) {
  return (
    <div className="mt-7 space-y-5">
      <div className="rounded-card border border-snow-line bg-white/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Proje briefi" eyebrow="Intake çıktısı" />
          <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-white/58">Kaynaklı özet</span>
        </div>
        <div className="mt-4 space-y-3">
          {summary.brief.map((line) => (
            <p className="text-sm leading-6 text-white/58" key={line}>{line}</p>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-card bg-white/5 p-5">
          <SectionTitle title="Eksik veri checklist" />
          <div className="mt-4 space-y-3">
            {summary.missingDataChecklist.map((item) => <IntakeChecklistRow item={item} key={item.label} />)}
          </div>
        </div>

        <div className="rounded-card bg-white/5 p-5">
          <SectionTitle title="Kaynak izi" eyebrow="Provenance" />
          <div className="mt-4 space-y-3">
            {summary.provenance.map((source) => <IntakeSourceRow item={source} key={source.label} />)}
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="rounded-card bg-white/5 p-5">
          <SectionTitle title="Önerilen sonraki adımlar" />
          <div className="mt-4 space-y-3">
            {summary.suggestedNextSteps.map((step) => (
              <div className="flex gap-3 text-sm text-white/60" key={step}>
                <Sparkles className="mt-0.5 shrink-0 text-snow-cyan" size={16} />
                <span>{step}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-card border border-[#ffd56a]/20 bg-[#ffd56a]/10 p-5">
          <SectionTitle title="İnsan onayı" eyebrow="Zorunlu" />
          <p className="mt-4 text-sm leading-6 text-white/62">{summary.humanApproval.reason}</p>
          <div className="mt-4 rounded-card bg-white/8 px-3 py-3 text-xs leading-5 text-white/52">
            Daire karması: <span className="text-white/82">{summary.daireKarmasiPreference}</span>
          </div>
          <div className="mt-3 rounded-card bg-white/8 px-3 py-3 text-xs leading-5 text-white/52">
            Mimar notu: <span className="text-white/82">{summary.architectNotes}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function IntakeSnapshotCard({
  onOpenRecommendedModule,
  summary
}: {
  onOpenRecommendedModule: (route: string) => void;
  summary: ProjectIntakeSummary;
}) {
  return (
    <Card className="bg-white/5">
      <SectionTitle title="Intake izi" eyebrow="Kural tabanlı" />
      <div className="mt-4 space-y-3">
        <ReviewLine label="Hazırlık" value={`%${summary.readinessScore}`} />
        <ReviewLine label="Sonraki modül" value={summary.nextModule.label} />
        <ReviewLine label="Daire karması" value={summary.daireKarmasiPreference} />
      </div>
      <p className="mt-4 rounded-card bg-[#ffd56a]/10 px-3 py-3 text-xs leading-5 text-[#ffd56a]">
        {summary.humanApproval.reason}
      </p>
      <div className="mt-4">
        <SnowButton
          icon={Layers3}
          onClick={() => onOpenRecommendedModule(summary.nextModule.route)}
          size="sm"
          tone="secondary"
        >
          {summary.nextModule.label} aç
        </SnowButton>
      </div>
    </Card>
  );
}

function IntakeMiniSection({ children, title }: { children: ReactNode; title: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/30">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function IntakeChecklistRow({ item }: { item: ProjectIntakeSummary["missingDataChecklist"][number] }) {
  const complete = item.status === "complete";

  return (
    <div className="rounded-card bg-white/5 px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white/84">{item.label}</p>
          <p className="mt-1 text-xs leading-5 text-white/42">{item.reason}</p>
        </div>
        <span
          className={cx(
            "shrink-0 rounded-full px-2 py-1 text-xs",
            complete ? "bg-snow-green/15 text-snow-green" : item.severity === "required" ? "bg-red-500/12 text-red-200" : "bg-[#ffd56a]/12 text-[#ffd56a]"
          )}
        >
          {complete ? "Hazır" : item.severity === "required" ? "Zorunlu" : "Önerilir"}
        </span>
      </div>
    </div>
  );
}

function IntakeSourceRow({ item }: { item: ProjectIntakeSummary["provenance"][number] }) {
  return (
    <div className="grid gap-2 rounded-card bg-white/5 px-3 py-3 text-sm sm:grid-cols-[120px_minmax(0,1fr)]">
      <div>
        <p className="font-semibold text-white/82">{item.label}</p>
        <p className="mt-1 text-xs text-white/35">{item.source}</p>
      </div>
      <div className="min-w-0 sm:text-right">
        <p className="truncate text-white/62">{item.value}</p>
        <p className={cx("mt-1 text-xs", item.status === "captured" ? "text-snow-green" : item.status === "derived" ? "text-snow-cyan" : "text-white/35")}>
          {item.status === "captured" ? "Kayda alındı" : item.status === "derived" ? "Kural tabanlı" : "Bekliyor"}
        </p>
      </div>
    </div>
  );
}

function getIntakePhaseStatus(summary: ProjectIntakeSummary, phaseIndex: number) {
  const statusByLabel = new Map(summary.missingDataChecklist.map((item) => [item.label, item.status]));

  if (phaseIndex === 0) {
    return ["Proje adı", "İlçe / mahalle", "Ada / parsel"].every((label) => statusByLabel.get(label) === "complete")
      ? "Kayda alındı"
      : "Bekliyor";
  }

  if (phaseIndex === 1) {
    return ["Parsel alanı", "İmar notu"].every((label) => statusByLabel.get(label) === "complete")
      ? "Kayda alındı"
      : "Bekliyor";
  }

  if (phaseIndex === 2) {
    return ["Parsel alanı", "İmar notu"].every((label) => statusByLabel.get(label) === "complete")
      ? "Kural tabanlı"
      : "Bekliyor";
  }

  if (phaseIndex === 3) {
    return statusByLabel.get("Kaynak dosyalar") === "complete" ? "Kayda alındı" : "Bekliyor";
  }

  if (phaseIndex === 4) {
    return statusByLabel.get("Daire karması tercihi") === "complete" ? "Kayda alındı" : "Bekliyor";
  }

  return "İnsan onayı";
}

function intakePhaseTone(status: string) {
  if (status === "Kayda alındı") return "bg-snow-green/15 text-snow-green";
  if (status === "Kural tabanlı") return "bg-snow-cyan/15 text-snow-cyan";
  if (status === "İnsan onayı") return "bg-[#ffd56a]/12 text-[#ffd56a]";
  return "bg-white/8 text-white/42";
}

function BackendInsightCard({ insight }: { insight?: KentselAutomationProjectInsight }) {
  if (!insight) return null;

  const blocked = isBlockedByBackendReview(insight);

  return (
    <Card className="bg-white/5">
      <SectionTitle title="Veri çekirdeği" eyebrow="Backend okuma" />
      <div className="mt-4 space-y-3">
        <ReviewLine label="Run" value={insight.latestRunStatus ?? "Bekliyor"} />
        <ReviewLine label="İnceleme görevi" value={String(insight.reviewTaskCount)} />
        <ReviewLine label="Açık uyarı" value={String(insight.openWarningCount)} />
        <ReviewLine label="Paylaşım" value={insight.bestSharingOption ?? `${insight.sharingOptionCount} seçenek`} />
        <ReviewLine label="Allocation" value={`${insight.allocationCount} satır`} />
        <ReviewLine label="Teklif paketi" value={insight.offerPackageStatus ?? "Yok"} />
        <ReviewLine label="Teklif skoru" value={formatInsightScore(insight.offerReadyScore)} />
      </div>
      {insight.highestPriorityReviewTask ? (
        <p className="mt-4 rounded-card bg-[#ffd56a]/10 px-3 py-3 text-xs leading-5 text-[#ffd56a]">
          {insight.highestPriorityReviewTask}
        </p>
      ) : null}
      {insight.warningCodes.length ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {insight.warningCodes.slice(0, 4).map((code) => (
            <span className="rounded-full bg-white/8 px-2 py-1 text-xs text-white/52" key={code}>
              {code}
            </span>
          ))}
        </div>
      ) : null}
      <p className={cx("mt-4 rounded-card px-3 py-3 text-xs", blocked ? "bg-[#ffd56a]/10 text-[#ffd56a]" : "bg-snow-green/10 text-snow-green")}>
        {blocked ? "Teklif için backend inceleme kapısı açık." : "Backend inceleme kapısı temiz görünüyor."}
      </p>
    </Card>
  );
}

function RightRail({ activeProject, projects }: { activeProject: Project | null; projects: Project[] }) {
  const activity = activeProject?.activity ?? projects.flatMap((project) => project.activity).slice(0, 5);
  const project = activeProject ?? projects[0] ?? null;
  return (
    <aside className="hidden w-[330px] shrink-0 border-l border-snow-line bg-white/55 px-6 py-7 2xl:block">
      <Card className="af-reference-ai-card p-5 relative overflow-hidden bg-white">
        <div className="flex items-start justify-between gap-3">
          <SectionTitle title="AI Asistan" eyebrow="Beta" />
          <span className="rounded-full bg-snow-violet/12 px-2.5 py-0.5 text-xs font-bold text-snow-violet tracking-wide">BETA</span>
        </div>
        
        <div className="mt-4 grid grid-cols-[1fr_96px] gap-3 items-center min-h-[110px]">
          <div>
            <p className="text-xs leading-5 text-white/58">Veri oluştuğunda AI, süreci hızlandırmak için devreye girer.</p>
            <button className="mt-3 px-3 py-1.5 rounded-lg border border-snow-line bg-white/5 text-[11px] font-semibold text-snow-violet hover:bg-snow-violet/10 transition" type="button">
              Nasıl çalışır?
            </button>
          </div>
          <div className="relative h-24 w-24 overflow-hidden rounded-lg flex items-center justify-center">
            <Image
              src="/visual-assets/archiflow/sidebar-ai-glow.png"
              alt="AI Asistan"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="mt-4 flex rounded-card bg-snow-shell p-1 text-white border border-snow-line/30 focus-within:border-snow-violet/50 transition">
          <input className="min-w-0 flex-1 bg-transparent px-3 text-xs outline-none placeholder:text-white/45" placeholder="Bir şey sorun..." readOnly />
          <button className="grid h-8 w-8 place-items-center rounded-lg bg-snow-violet text-white hover:scale-105 transition" type="button" aria-label="AI asistana gönder">
            <Sparkles size={14} />
          </button>
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {["Örn. Bu parselde max inşaat alanı?", "3+1 daire önerisi"].map((text) => (
            <button
              key={text}
              className="text-[10px] px-2.5 py-1 rounded bg-[#f8faff] border border-snow-line/50 text-[#596381] hover:bg-snow-violet/5 hover:text-snow-violet transition-all duration-200"
              type="button"
              onClick={() => alert(`"${text}" sorusu AI asistanına iletildi.`)}
            >
              {text}
            </button>
          ))}
        </div>
      </Card>

      <ReferenceRailList
        action="Tümü"
        title="Aktivite Akışı"
        items={
          activity.length
            ? activity.slice(0, 5).map((item): [string, string] => [item.title, item.time])
            : [
                ["İmar analizi tamamlandı", project ? `${project.ada}/${project.parsel} Parsel` : "Proje bekliyor"],
                ["Derinlik hesabı güncellendi", "Sistem"],
                ["Yeni dosya yüklendi", "Zemin Kat Planı.pdf"]
              ]
        }
      />

      <Card className="mt-5 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-white">Yakındaki Görevler</h2>
          <button className="text-xs font-semibold text-snow-violet" type="button">Tümü</button>
        </div>
        <div className="mt-5 space-y-3">
          {(project ? [project, ...projects.filter((item) => item.id !== project.id)].slice(0, 3) : projects.slice(0, 3)).map((item, index) => (
            <div className="flex items-start gap-3 border-b border-snow-line pb-3 last:border-b-0 last:pb-0" key={`${item.id}-${index}`}>
              <span className="mt-1 grid h-6 w-6 place-items-center rounded-md border border-snow-violet text-snow-violet">
                <Check size={14} />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white/86">{item.ada}/{item.parsel} Parsel - {workflowSteps[Math.min(item.stepIndex, workflowSteps.length - 1)].title}</p>
                <p className="mt-1 text-xs text-white/42">{index === 0 ? "Bugün 16:00" : index === 1 ? "Yarın 10:00" : "04 Temmuz 2026"}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="mt-5 p-5">
        <h2 className="text-sm font-semibold text-white">Hızlı İşlemler</h2>
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            [CheckCircle2, "Parsel Ekle"],
            [UploadCloud, "Dosya Yükle"],
            [BarChart3, "Analiz Başlat"],
            [FileText, "Rapor Oluştur"]
          ].map(([Icon, label]) => {
            const ActionIcon = Icon as LucideIcon;
            return (
              <button className="snow-focus-ring grid gap-2 rounded-card border border-snow-line bg-white/8 px-2 py-3 text-center text-[11px] text-white/58" key={label as string} type="button">
                <span className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-snow-violet/10 text-snow-violet">
                  <ActionIcon size={16} />
                </span>
                {label as string}
              </button>
            );
          })}
        </div>
      </Card>
    </aside>
  );
}

function LoadingScreen() {
  return (
    <div className="snow-app grid min-h-screen place-items-center text-white">
      <div className="text-center">
        <div className="snow-loader-mark" aria-hidden="true" />
        <div className="mt-6">
          <Logo centered />
        </div>
        <div className="snow-loading-line" />
        <p className="mt-5 text-sm text-white/42">ArchiFlow açılıyor</p>
      </div>
    </div>
  );
}

function WizardPanel({ children, subtitle, title }: { children: ReactNode; subtitle: string; title: string }) {
  return (
    <section>
      <SectionTitle title={title} eyebrow={subtitle} />
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Checklist({ items, title }: { items: string[]; title: string }) {
  return (
    <div className="rounded-card bg-white/5 p-4">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-3 space-y-2">
        {items.map((item) => (
          <div className="flex gap-2 text-sm text-white/58" key={item}>
            <CircleDot className="mt-1 shrink-0 text-white/26" fill="currentColor" size={8} />
            <span>{item}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileRow({ file }: { file: ProjectFile }) {
  return (
    <div className="grid gap-3 rounded-card bg-white/5 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_110px_90px] sm:items-center">
      <div className="min-w-0">
        <p className="truncate text-white/90">{file.name}</p>
        <p className="text-xs text-white/35">{file.type}</p>
      </div>
      <span className="text-white/54">{file.type}</span>
      <span className="w-fit rounded-full bg-white/8 px-2.5 py-1 text-xs text-white/58">{displayFileStatus(file.status)}</span>
    </div>
  );
}

function PackageTile({ label, ready }: { label: string; ready: boolean }) {
  return (
    <div className={cx("af-package-tile rounded-card bg-white/5 p-4", ready ? "is-ready" : "is-waiting")}>
      <div className={cx("af-package-icon grid h-9 w-9 place-items-center rounded-full", ready ? "bg-snow-green text-[#191919]" : "bg-white/8 text-white/35")}>
        {ready ? <Check size={16} /> : <FileText size={16} />}
      </div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
      <p className="mt-1 text-xs text-white/38">{ready ? "Hazır" : "Bekliyor"}</p>
    </div>
  );
}

function ActivityRow({ activity }: { activity: ProjectActivity }) {
  const color = activity.tone === "success" ? "bg-snow-green" : activity.tone === "warning" ? "bg-[#ffd56a]" : "bg-snow-cyan";
  return (
    <div className="flex gap-3">
      <span className={cx("mt-1 h-2 w-2 shrink-0 rounded-full", color)} />
      <div className="min-w-0">
        <p className="text-sm text-white/86">{activity.title}</p>
        <p className="mt-1 text-xs text-white/35">{activity.time}</p>
      </div>
    </div>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/8 py-2 text-sm last:border-0">
      <span className="text-white/42">{label}</span>
      <span className="min-w-0 text-right text-white/86">{value}</span>
    </div>
  );
}

function SnowField({ children, className, label }: { children: ReactNode; className?: string; label: string }) {
  return (
    <label className={cx("block", className)}>
      <span className="mb-2 block text-xs font-semibold text-white/42">{label}</span>
      <div className="snow-field">{children}</div>
    </label>
  );
}

function SnowButton({
  children,
  disabled,
  icon: Icon,
  onClick,
  size = "md",
  testId,
  tone = "primary",
  type = "button"
}: {
  children: ReactNode;
  disabled?: boolean;
  icon?: LucideIcon;
  onClick?: () => void;
  size?: "sm" | "md";
  testId?: string;
  tone?: "primary" | "secondary";
  type?: "button" | "submit";
}) {
  return (
    <button
      className={cx(
        "snow-button snow-focus-ring inline-flex items-center justify-center gap-2 rounded-card text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        size === "sm" ? "h-9 px-3" : "h-11 px-4",
        tone === "primary" ? "bg-snow-violet text-[#191919] hover:bg-[#d8d8ff]" : "border border-snow-line bg-white/6 text-white/78 hover:bg-white/10"
      )}
      disabled={disabled}
      data-testid={testId}
      onClick={onClick}
      type={type}
    >
      {Icon ? <Icon size={16} /> : null}
      {children}
    </button>
  );
}

function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={cx("snow-card rounded-card p-6", className)}>{children}</section>;
}

function StatCard({
  delta,
  label,
  tone = "dark",
  value
}: {
  delta?: string;
  label: string;
  tone?: "blue" | "ice" | "green" | "violet" | "dark";
  value: string;
}) {
  const displayValue = compactStatValue(value);

  return (
    <section className={cx("snow-stat-card af-stat-card rounded-card", `af-stat-card-${tone}`)}>
      <span className="af-stat-accent" aria-hidden="true" />
      <div className="af-stat-label">{label}</div>
      <div className="af-stat-content">
        <strong className="af-stat-value" title={displayValue !== value ? value : undefined}>
          {displayValue}
        </strong>
        {delta ? <span className="af-stat-delta">{delta}</span> : null}
      </div>
    </section>
  );
}

function compactStatValue(value: string) {
  const currencyMatch = value.trim().match(/^₺\s*([\d.]+)$/);

  if (!currencyMatch) return value;

  const amount = Number(currencyMatch[1].replace(/\./g, ""));
  if (!Number.isFinite(amount) || amount < 1_000_000) return value;

  return `₺${new Intl.NumberFormat("tr-TR", {
    maximumFractionDigits: amount >= 100_000_000 ? 1 : 2,
    minimumFractionDigits: 0
  }).format(amount / 1_000_000)} Mn`;
}

function StatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={cx("relative inline-flex items-center gap-2 text-[10px] font-mono font-bold tracking-wider uppercase", statusTone[status])}>
      <span className="before:block before:h-1.5 before:w-1.5 before:rounded-full" />
      {status}
    </span>
  );
}

function SourceBadge({ source }: { source: ProjectSource }) {
  return (
    <span className={cx("inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-mono font-bold tracking-wider uppercase", sourceTone[source])}>
      {source}
    </span>
  );
}

function BackendSyncPill({ state }: { state: BackendSyncState }) {
  const copy: Record<BackendSyncState, { label: string; detail: string; className: string }> = {
    idle: {
      label: "Yerel çalışma",
      detail: "Veri çekirdeği bağlı değil",
      className: "border-white/12 bg-white/6 text-white/48"
    },
    syncing: {
      label: "Veri çekirdeği okunuyor",
      detail: "Backend proje kartları kontrol ediliyor",
      className: "border-snow-cyan/25 bg-snow-cyan/10 text-snow-cyan"
    },
    synced: {
      label: "Veri çekirdeği bağlı",
      detail: "Backend kartları salt okunur",
      className: "border-snow-green/25 bg-snow-green/10 text-snow-green"
    },
    unavailable: {
      label: "Yerel kayıtlarla devam",
      detail: "Veri çekirdeği şu an okunamadı",
      className: "border-[#ffd56a]/25 bg-[#ffd56a]/10 text-[#ffd56a]"
    }
  };
  const stateCopy = copy[state];

  return (
    <div className={cx("inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase", stateCopy.className)}>
      <span className={cx("h-1.5 w-1.5 rounded-full", state === "syncing" ? "snow-status-pulse bg-current" : "bg-current")} />
      <span>{stateCopy.label}</span>
      <span className="hidden text-xs font-sans font-normal opacity-65 lowercase first-letter:uppercase sm:inline">({stateCopy.detail})</span>
    </div>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow?: string; title: string }) {
  return (
    <div className="min-w-0">
      {eyebrow ? <div className="mb-1 text-xs text-white/40">{eyebrow}</div> : null}
      <h2 className="truncate text-sm font-semibold text-white">{title}</h2>
    </div>
  );
}

function SearchInput({
  onChange,
  value
}: {
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div className="flex h-11 items-center gap-3 rounded-lg border border-snow-line bg-white px-4 text-white/35 shadow-[0_8px_22px_rgba(22,34,65,.04)]">
      <Search size={16} />
      <input
        aria-label="Ara"
        className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Proje, parsel, dosya ara..."
        value={value}
      />
      <span className="text-xs">Ctrl K</span>
    </div>
  );
}

function MetricBar({ compact = false, value }: { compact?: boolean; value: number }) {
  const safe = Math.max(0, Math.min(100, value));

  return (
    <div
      aria-label="İlerleme"
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={safe}
      className={cx("min-w-[120px]", compact ? "w-[150px]" : "w-full")}
      role="progressbar"
    >
      <div className="flex items-center justify-between text-xs text-white/38">
        <span>İlerleme</span>
        <span>%{safe}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/10">
        <div className="snow-progress-fill h-full rounded-full bg-snow-violet" style={{ width: `${safe}%` }} />
      </div>
    </div>
  );
}

function Donut({ value = 68 }: { value?: number }) {
  const safe = Math.max(0, Math.min(100, value));
  return (
    <div
      className="relative h-32 w-32 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)] transition-transform duration-300 hover:scale-105"
      style={{ background: `conic-gradient(#6558ff 0 ${safe}%, #21b47b ${safe}% 86%, #ff7a1a 86% 100%)` }}
    >
      <div className="absolute inset-5 rounded-full bg-snow-panel shadow-sm flex flex-col items-center justify-center" />
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-white leading-none">%{safe}</span>
        <span className="text-[9px] uppercase tracking-wider text-white/44 font-semibold mt-0.5">Uyumlu</span>
      </div>
    </div>
  );
}

function PlanPreview({ compact = false }: { compact?: boolean }) {
  return (
    <div className={cx("relative overflow-hidden rounded-card border border-snow-line bg-[#f7faff]", compact ? "aspect-[1.2]" : "min-h-[260px]")}>
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(39,58,96,.08)_1px,transparent_1px),linear-gradient(rgba(39,58,96,.08)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <svg className="relative z-10 h-full min-h-[240px] w-full p-5" viewBox="0 0 420 300" role="img" aria-label="Mimari plan önizlemesi">
        <rect x="36" y="30" width="340" height="236" rx="6" fill="#ffffff" stroke="#294266" strokeOpacity=".3" strokeWidth="2" />
        <rect x="54" y="48" width="118" height="82" fill="#e7f1ff" opacity=".96" rx="4" />
        <rect x="180" y="48" width="176" height="118" fill="#ece9ff" opacity=".95" rx="4" />
        <rect x="54" y="138" width="86" height="108" fill="#d9f2e6" opacity=".95" rx="4" />
        <rect x="148" y="174" width="96" height="72" fill="#d8f5fb" opacity=".94" rx="4" />
        <rect x="252" y="174" width="104" height="72" fill="#f0f4f8" opacity=".98" rx="4" />
        <path d="M172 130h36M244 166v32M140 190h32" stroke="#294266" strokeLinecap="round" strokeWidth="4" />
        <text x="78" y="92" fill="#101936" fontSize="13" fontWeight="700">Parsel</text>
        <text x="230" y="110" fill="#101936" fontSize="13" fontWeight="700">Tip kat</text>
        <text x="75" y="197" fill="#101936" fontSize="13" fontWeight="700">Çekirdek</text>
        <text x="168" y="216" fill="#101936" fontSize="13" fontWeight="700">2+1</text>
        <text x="284" y="216" fill="#101936" fontSize="13" fontWeight="700">3+1</text>
      </svg>
    </div>
  );
}

function LegendLine({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-white/78">
        <span className={cx("h-1.5 w-1.5 rounded-full", color)} />
        {label}
      </span>
      <span>{value}</span>
    </div>
  );
}

function SidebarButton({
  active,
  badge,
  collapsed = false,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  badge?: string;
  collapsed?: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      className={cx(
        "snow-nav-button snow-sidebar-item snow-focus-ring",
        active ? "is-active" : "",
        collapsed ? "is-collapsed" : ""
      )}
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      title={label}
      type="button"
    >
      <span className="snow-sidebar-icon">
        <Icon size={17} strokeWidth={1.85} />
      </span>
      <span className="snow-sidebar-label">{label}</span>
      {badge ? <span className="snow-sidebar-badge">{badge}</span> : null}
    </button>
  );
}

function getSidebarBadge(view: ArchitectPlatformView, projects: Project[]) {
  if (view === "projects" && projects.length) return String(projects.length);
  if (view === "ai-floor-plan") return "AI";
  return undefined;
}

function Toast({ children }: { children: ReactNode }) {
  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-card border border-snow-line bg-snow-panel px-4 py-3 text-sm text-white shadow-snow">
      {children}
    </div>
  );
}

function Logo({ centered = false, compact = false }: { centered?: boolean; compact?: boolean }) {
  return (
    <div className={cx("flex items-center transition-all duration-300", compact ? "gap-0" : "gap-3", centered ? "justify-center" : "")}>
      <span className="block h-9 w-9 shrink-0 bg-[url('/brand/archiflow-gradient-mark.svg')] bg-contain bg-center bg-no-repeat" aria-hidden="true" />
      <div className={cx("leading-none transition-all duration-300", compact ? "pointer-events-none w-0 overflow-hidden opacity-0" : "w-auto opacity-100")}>
        <span className="block text-[18px] font-extrabold tracking-[0.02em] text-[#081042]">ARCHIFLOW</span>
        <span className="mt-1 block text-[11px] font-medium text-[#596381]">Architect Operating System</span>
      </div>
    </div>
  );
}

function mergeProjectsById(current: Project[], incoming: Project[]) {
  const incomingIds = new Set(incoming.map((project) => project.id));
  return [...incoming, ...current.filter((project) => !incomingIds.has(project.id))];
}

function getBackendParcelKey(project: Project) {
  if (!isBackendProject(project)) return null;
  return project.neighborhood === "Veri çekirdeği" ? null : project.neighborhood;
}

function isBackendProject(project: Project) {
  return project.source === "Backend" || (project.district === "Backend" && project.id.startsWith("INPUT-"));
}

function getProjectDisplaySource(project: Project): ProjectSource {
  if (project.locked) return "Arşiv";
  if (isBackendProject(project)) return "Backend";
  return project.source ?? "Gerçek";
}

function isBlockedByBackendReview(insight?: KentselAutomationProjectInsight) {
  if (!insight) return false;
  return insight.reviewRequired || insight.reviewTaskCount > 0 || insight.openWarningCount > 0;
}

function createModuleMetrics(
  activeProject: Project | null,
  definition: ModuleDefinition
): ModuleDefinition["metrics"] {
  if (!activeProject) {
    return [
      { label: "Bağlı proje", value: "Yok", tone: "dark" },
      { label: "Veri durumu", value: "Bekliyor", tone: "ice" },
      { label: "Kurulum", value: "Sihirbaz", tone: "violet" }
    ];
  }

  return [
    { label: "Aktif proje", value: activeProject.ada ? `${activeProject.ada}/${activeProject.parsel}` : "Seçili", tone: "blue" },
    { label: "İlerleme", value: `%${activeProject.progress}`, tone: "violet" },
    {
      label: definition.title.includes("Dosya") ? "Kaynak" : "Teklif",
      value: definition.title.includes("Dosya")
        ? String(activeProject.files.length)
        : getOfferReadiness(activeProject).finalOfferReady
          ? "Hazır"
          : "Bekliyor",
      tone: getOfferReadiness(activeProject).finalOfferReady ? "green" : "ice"
    }
  ];
}

function createModuleRows(project: Project): string[][] {
  const currentStep = workflowSteps[Math.min(project.stepIndex, workflowSteps.length - 1)];
  const readiness = getOfferReadiness(project);

  return [
    ["Proje gerçekliği", getProjectDisplaySource(project), project.locked ? "Kilitli" : "Açık"],
    ["Aktif akış adımı", currentStep.title, currentStep.group],
    ["Kaynak dosya", `${project.files.length} kayıt`, project.files.length ? "Kayda alındı" : "Bekliyor"],
    ["Teklif kapısı", readiness.finalOfferReady ? "Final hazır" : "Ön koşul bekliyor", project.status],
    ["Mimar notu", project.notes === "Mimar notu eklenmedi." ? "Eksik" : "Var", "Proje kaydı"]
  ];
}

function applyMixPreferenceToNotes(notes: string, preference: string): string {
  const preferencePrefix = "Daire karması tercihi:";
  const preferenceLine = `${preferencePrefix} ${preference}`;
  const retainedLines = notes
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith(preferencePrefix));

  return [...retainedLines, preferenceLine].join("\n");
}

function formatInsightScore(score: number | null) {
  return score == null ? "Yok" : `%${Math.round(score)}`;
}

function displayFileStatus(status: ProjectFile["status"]) {
  return status === "Yüklendi" ? "Kayda alındı" : status;
}

function downloadOffer(project: Project) {
  const lines = [
    "ARCHIFLOW KENTSEL DÖNÜŞÜM TEKLİF PAKETİ",
    "",
    `Proje: ${project.name}`,
    `Müşteri: ${project.client}`,
    `Sorumlu mimar: ${project.architect}`,
    `Parsel: ${project.district} / ${project.neighborhood} - Ada ${project.ada} Parsel ${project.parsel}`,
    `İmar: ${project.zoning}`,
    `Daire hedefi: ${project.units}`,
    `Kat karşılığı: ${project.ratio}`,
    `Durum: ${project.status}`,
    "",
    "Akış özeti:",
    ...workflowSteps.map((step, index) => `${index + 1}. ${step.title} - ${index < project.stepIndex ? "tamamlandı" : "bekliyor"}`),
    "",
    `Not: ${project.notes}`
  ];

  const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${project.id}-teklif-paketi.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}

function isModuleView(view: string): view is ModuleView {
  return view in moduleDefinitions;
}

function uniqueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
