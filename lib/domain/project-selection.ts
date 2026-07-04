export type ProjectIdentity = {
  id: string;
};

export type ActiveProjectSelection<Project extends ProjectIdentity> = {
  missingProjectId: string | null;
  project: Project | null;
};

export function selectActiveProject<Project extends ProjectIdentity>(
  projects: Project[],
  activeProjectId: string | null | undefined
): ActiveProjectSelection<Project> {
  if (activeProjectId) {
    const project = projects.find((item) => item.id === activeProjectId) ?? null;

    return {
      missingProjectId: project ? null : activeProjectId,
      project
    };
  }

  return {
    missingProjectId: null,
    project: null
  };
}
