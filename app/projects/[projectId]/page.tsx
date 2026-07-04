import { SnowArchitectPlatform } from "@/components/workspace/SnowArchitectPlatform";

type ProjectEditorPageProps = {
  params: Promise<{
    projectId: string;
  }>;
};

export default async function ProjectEditorPage({ params }: ProjectEditorPageProps) {
  const { projectId } = await params;

  return <SnowArchitectPlatform initialProjectId={projectId} initialView="project" />;
}
