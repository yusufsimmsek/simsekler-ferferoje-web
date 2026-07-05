import type { KentselProjectDraft as ProjectDraft } from "@/lib/domain/kentsel-project";

export const emptyDraft: ProjectDraft = {
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
