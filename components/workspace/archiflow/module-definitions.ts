import {
  Archive,
  BarChart3,
  Building2,
  Calculator,
  ClipboardCheck,
  FileText,
  Grid3X3,
  HardDrive,
  Layers3,
  MapPinned,
  Ruler,
  ShieldCheck,
  Users,
  Wand2
} from "lucide-react";
import type { ModuleDefinition, ModuleView } from "./types";

export const moduleDefinitions: Record<ModuleView, ModuleDefinition> = {
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
