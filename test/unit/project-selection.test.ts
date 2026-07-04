import { describe, expect, it } from "vitest";
import { selectActiveProject } from "@/lib/domain/project-selection";

const projects = [
  { id: "PRJ-1", name: "First" },
  { id: "PRJ-2", name: "Second" }
];

describe("project selection domain", () => {
  it("returns no active project when no active route id is requested", () => {
    expect(selectActiveProject(projects, null)).toEqual({
      missingProjectId: null,
      project: null
    });
  });

  it("selects the requested project when the route id exists", () => {
    expect(selectActiveProject(projects, "PRJ-2")).toEqual({
      missingProjectId: null,
      project: projects[1]
    });
  });

  it("does not silently fall back to another project when the route id is missing", () => {
    expect(selectActiveProject(projects, "PRJ-404")).toEqual({
      missingProjectId: "PRJ-404",
      project: null
    });
  });
});
