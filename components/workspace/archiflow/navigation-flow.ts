import type { LucideIcon } from "lucide-react";
import {
  Archive,
  BarChart3,
  Calculator,
  FileText,
  FolderKanban,
  Grid3X3,
  HardDrive,
  Home,
  Layers3,
  MapPinned,
  Ruler,
  Sparkles,
  Users
} from "lucide-react";
import type {
  KentselProjectSource as ProjectSource,
  KentselProjectStatus as ProjectStatus
} from "@/lib/domain/kentsel-project";
import type { ArchitectPlatformView, ModuleView } from "./types";

export const statusTone: Record<ProjectStatus, string> = {
  Hazırlık: "text-snow-cyan before:bg-snow-cyan",
  İnceleme: "text-snow-violet before:bg-snow-violet",
  Teklif: "text-snow-green before:bg-snow-green",
  Kilitli: "text-white/45 before:bg-white/35"
};

export const sourceTone: Record<ProjectSource, string> = {
  Demo: "border-[#ffd56a]/25 bg-[#ffd56a]/10 text-[#ffd56a]",
  Taslak: "border-snow-cyan/25 bg-snow-cyan/10 text-snow-cyan",
  Gerçek: "border-snow-green/25 bg-snow-green/10 text-snow-green",
  Backend: "border-snow-violet/25 bg-snow-violet/10 text-snow-violet",
  Arşiv: "border-white/15 bg-white/8 text-white/58"
};

export const mainNav: Array<{ view: ArchitectPlatformView; label: string; icon: LucideIcon }> = [
  { view: "dashboard", label: "Genel Bakış", icon: Home },
  { view: "projects", label: "Projeler", icon: FolderKanban },
  { view: "site-analysis", label: "Parseller", icon: MapPinned },
  { view: "regulation-analysis", label: "İmar Analizi", icon: BarChart3 },
  { view: "zoning-rules", label: "Derinlik & Hmax", icon: Ruler },
  { view: "plans", label: "Eski Planlar", icon: FileText }
];

export const moduleNav: Array<{ view: ModuleView; label: string; icon: LucideIcon }> = [
  { view: "calculations", label: "Metraj", icon: Calculator },
  { view: "models", label: "Çekirdek Kütüphanesi", icon: Grid3X3 },
  { view: "apartment-mix", label: "Daire Karması", icon: Layers3 },
  { view: "comparisons", label: "Paylaşım & Hesap", icon: Users },
  { view: "reports", label: "Teklif & Raporlar", icon: FileText },
  { view: "files", label: "Dosyalar", icon: HardDrive },
  { view: "team", label: "Ekip ve Onaylar", icon: Users },
  { view: "archive", label: "Arşiv", icon: Archive },
  { view: "ai-floor-plan", label: "AI Asistan", icon: Sparkles }
];

export const wizardSteps = ["Proje", "Parsel", "Dosyalar", "Karma", "Kontrol"];
export const intakeWorkflowPhases = [
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
