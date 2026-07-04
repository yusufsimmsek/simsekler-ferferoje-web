import { describe, expect, it } from "vitest";
import {
  fetchKentselAutomationProjectInsight,
  fetchKentselAutomationProjects,
  mapKentselAutomationProject,
  mapKentselAutomationProjectInsight,
  type KentselAutomationFetch
} from "@/lib/platform/kentsel-automation-api-repository";
import { offerPackageStepIndex } from "@/lib/domain/kentsel-workflow";

describe("kentsel automation api repository", () => {
  it("maps backend input projects into ArchiFlow project cards", () => {
    const project = mapKentselAutomationProject({
      project_key: "INPUT-4300-2-demo",
      project_name: "Kadıköy 4300/2 otomasyon",
      company_key: "ilkbahar",
      parcel_key: "4300-2",
      status: "floor_plan_ready",
      latest_run_status: "completed",
      parcel_area_m2: 684,
      taks: 0.4,
      kaks_or_emsal: 1.8,
      max_floor_count: 5,
      existing_area_input_count: 12,
      manual_notes: "Backend notu"
    });

    expect(project).toMatchObject({
      id: "INPUT-4300-2-demo",
      name: "Kadıköy 4300/2 otomasyon",
      client: "ilkbahar",
      ada: "4300",
      parsel: "2",
      area: "684 m²",
      zoning: "TAKS 0.4 / Emsal 1.8 / 5 kat",
      units: "12",
      stepIndex: 14,
      offerReady: false,
      locked: false,
      source: "Backend"
    });
  });

  it("maps ready offer data packages into offer-ready workflow state", () => {
    const project = mapKentselAutomationProject({
      project_key: "INPUT-101-9-ready",
      project_name: "Teklif hazır proje",
      zoning_input: { ada: 101, parsel: 9 },
      offer_data_packages: [
        {
          package_status: "draft_ready",
          offer_ready_score: 88,
          review_required: 0
        }
      ]
    });

    expect(project).toMatchObject({
      stepIndex: offerPackageStepIndex,
      offerReady: true,
      status: "Teklif"
    });
  });

  it("fetches backend projects with limit and query parameters", async () => {
    let requestedUrl = "";
    const fetcher: KentselAutomationFetch = async (input) => {
      requestedUrl = String(input);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          total: 1,
          data: [
            {
              project_key: "INPUT-1-2",
              project_name: "Backend proje",
              parcel_key: "1-2"
            }
          ]
        })
      };
    };

    const result = await fetchKentselAutomationProjects({
      baseUrl: "http://127.0.0.1:8765",
      fetcher,
      limit: 12,
      query: "4300"
    });

    expect(requestedUrl).toBe("http://127.0.0.1:8765/api/input-projects?limit=12&q=4300");
    expect(result.total).toBe(1);
    expect(result.projects[0]?.id).toBe("INPUT-1-2");
  });

  it("throws a public error when the backend rejects a request", async () => {
    const fetcher: KentselAutomationFetch = async () => ({
      ok: false,
      status: 503,
      json: async () => ({ detail: "backend offline" })
    });

    await expect(
      fetchKentselAutomationProjects({
        baseUrl: "http://127.0.0.1:8765",
        fetcher
      })
    ).rejects.toThrow("backend offline");
  });

  it("fetches active project automation insight through read-only endpoints", async () => {
    const requests: string[] = [];
    const fetcher: KentselAutomationFetch = async (input, init) => {
      requests.push(`${init?.method ?? "GET"} ${String(input)}`);
      const url = String(input);

      if (url.includes("/api/input-projects/INPUT-4300-2-demo")) {
        return jsonResponse({
          project_key: "INPUT-4300-2-demo",
          parcel_key: "4300-2",
          engine_runs: [{ run_key: "RUN-1", project_key: "INPUT-4300-2-demo", status: "completed" }],
          sharing_payment_options: [
            {
              project_key: "INPUT-4300-2-demo",
              option_name: "Dengeli paylaşım",
              offer_ready_score: 125,
              review_required: "0"
            }
          ],
          sharing_unit_allocations: [{ project_key: "INPUT-4300-2-demo", role: "owner" }],
          offer_data_packages: [
            {
              project_key: "INPUT-4300-2-demo",
              package_status: "draft_ready",
              offer_ready_score: 92,
              review_required: 0
            }
          ]
        });
      }

      if (url.includes("/api/review-tasks")) {
        return jsonResponse({
          data: [
            {
              id: 7,
              status: "open",
              priority: 90,
              title: "Otopark hesabı kontrol edilmeli"
            }
          ]
        });
      }

      if (url.includes("/api/warnings")) {
        return jsonResponse({
          data: [{ id: 3, status: "open", code: "parking_review" }]
        });
      }

      return jsonResponse({}, false, 404);
    };

    const insight = await fetchKentselAutomationProjectInsight({
      baseUrl: "http://127.0.0.1:8765",
      fetcher,
      parcelKey: "4300-2",
      projectKey: "INPUT-4300-2-demo"
    });

    expect(requests).toEqual([
      "GET http://127.0.0.1:8765/api/input-projects/INPUT-4300-2-demo",
      "GET http://127.0.0.1:8765/api/review-tasks?status=open&limit=25&parcel_key=4300-2",
      "GET http://127.0.0.1:8765/api/warnings?status=open&limit=25&parcel_key=4300-2"
    ]);
    expect(insight).toMatchObject({
      allocationCount: 1,
      bestSharingOption: "Dengeli paylaşım",
      highestPriorityReviewTask: "Otopark hesabı kontrol edilmeli",
      offerPackageStatus: "draft_ready",
      offerReadyScore: 92,
      openWarningCount: 1,
      reviewRequired: true,
      reviewTaskCount: 1,
      warningCodes: ["parking_review"]
    });
  });

  it("does not make unscoped review reads when parcel key is missing", async () => {
    const requests: string[] = [];
    const fetcher: KentselAutomationFetch = async (input) => {
      requests.push(String(input));
      return jsonResponse({});
    };

    const insight = await fetchKentselAutomationProjectInsight({
      baseUrl: "http://127.0.0.1:8765",
      fetcher,
      projectKey: "INPUT-local-like"
    });

    expect(requests).toEqual([]);
    expect(insight).toMatchObject({
      offerPackageStatus: "doğrulanamadı",
      reviewRequired: true
    });
  });

  it("fails closed when backend readiness endpoints cannot be verified", async () => {
    const fetcher: KentselAutomationFetch = async () => jsonResponse({ detail: "offline" }, false, 503);

    const insight = await fetchKentselAutomationProjectInsight({
      baseUrl: "http://127.0.0.1:8765",
      fetcher,
      parcelKey: "4300-2",
      projectKey: "INPUT-4300-2"
    });

    expect(insight).toMatchObject({
      highestPriorityReviewTask: "Backend inceleme özeti doğrulanamadı.",
      offerPackageStatus: "doğrulanamadı",
      reviewRequired: true
    });
  });

  it("keeps malformed insight payloads conservative", () => {
    const insight = mapKentselAutomationProjectInsight({
      detail: {
        sharing_payment_options: [
          {
            project_key: "INPUT-1-2",
            strategy_key: "dataset",
            offer_ready_score: "not-a-number",
            review_required: "false"
          }
        ],
        offer_data_packages: [
          {
            project_key: "INPUT-1-2",
            package_status: "draft_ready",
            offer_ready_score: -20,
            review_required: "1"
          }
        ]
      },
      parcelKey: "1-2",
      projectKey: "INPUT-1-2",
      reviewTasks: [],
      warnings: []
    });

    expect(insight).toMatchObject({
      offerReadyScore: 0,
      reviewRequired: true
    });
  });
});

function jsonResponse(body: unknown, ok = true, status = 200): Awaited<ReturnType<KentselAutomationFetch>> {
  return {
    ok,
    status,
    json: async () => body
  };
}
