import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FloorPlanCanvas } from "@/components/floor-plan/FloorPlanCanvas";
import { floorPlanToPlanDraft } from "@/lib/floor-plan/draft";
import { threePlusOneFixture } from "@/lib/floor-plan/fixtures";
import { generateFloorPlanLayout } from "@/lib/layout-engine/generate-layout";
import { createSvgViewport } from "@/lib/render/canvas-renderer";
import { createFloorPlanRenderModel } from "@/lib/render/render-model";

const generatedPlan = generateFloorPlanLayout({
  draft: floorPlanToPlanDraft(threePlusOneFixture),
  planId: "plan_render_test",
  projectId: "project_render_test",
  promptSummary: "3+1 render model test"
}).plan;

describe("floor plan render model", () => {
  it("generates a render model from a valid FloorPlan", () => {
    const model = createFloorPlanRenderModel(generatedPlan, {
      selectedRoomId: "room_living"
    });

    expect(model.planId).toBe("plan_render_test");
    expect(model.title).toBe(generatedPlan.title);
    expect(model.bounds.width).toBeGreaterThan(0);
    expect(model.viewport.width).toBeGreaterThan(model.bounds.width);
    expect(model.validationStatus).toBe("valid");
  });

  it("converts rooms into render primitives", () => {
    const model = createFloorPlanRenderModel(generatedPlan, {
      selectedRoomId: "room_living"
    });
    const living = model.rooms.find((room) => room.id === "room_living");

    expect(model.rooms).toHaveLength(generatedPlan.rooms.length);
    expect(living).toMatchObject({
      label: "Living Room",
      selected: true
    });
    expect(living?.rect.width).toBeGreaterThan(0);
    expect(living?.areaLabel).toContain("m2");
    expect(model.walls.length).toBe(generatedPlan.rooms.length * 4);
  });

  it("converts doors and windows when present", () => {
    const model = createFloorPlanRenderModel(generatedPlan);

    expect(model.doors.length).toBeGreaterThan(0);
    expect(model.windows.length).toBeGreaterThan(0);
    expect(model.doors[0]).toMatchObject({
      fromRoomId: expect.any(String),
      label: expect.stringContaining("door")
    });
    expect(model.windows[0].label).toContain("window");
  });

  it("produces stable render primitive output", () => {
    const first = createFloorPlanRenderModel(generatedPlan);
    const second = createFloorPlanRenderModel(generatedPlan);

    expect(second).toEqual(first);
    expect(createSvgViewport(first, 1.25).viewBox).toBe(createSvgViewport(second, 1.25).viewBox);
  });

  it("server-renders the FloorPlanCanvas component as an SVG smoke test", () => {
    const markup = renderToStaticMarkup(
      createElement(FloorPlanCanvas, {
        plan: generatedPlan,
        selectedRoomId: "room_living"
      })
    );

    expect(markup).toContain("<svg");
    expect(markup).toContain("data-render-layer=\"rooms\"");
    expect(markup).toContain("Living Room");
    expect(markup).not.toContain("Static canvas placeholder");
  });
});
