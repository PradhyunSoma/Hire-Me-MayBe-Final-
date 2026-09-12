import type {
  Candidate,
  ProcessingStatus,
  ScreeningResults,
  ScreeningSummary,
} from "@/types";
import { getDemoResults } from "./client";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

async function request<T>(path: string, options: RequestInit = {}, demo?: () => T): Promise<T> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 200));
    return demo!();
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}

export const screeningsApi = {
  create: () =>
    request<{ screeningId: string }>(
      "/api/screenings",
      { method: "POST" },
      () => ({ screeningId: "screening-demo-1" })
    ),

  uploadJD: (_screeningId: string, _file: File) =>
    request<{ success: boolean }>(
      "/",
      { method: "POST" },
      () => ({ success: true })
    ),

  uploadResume: (_screeningId: string, _file: File) =>
    request<{ success: boolean; candidateId: string }>(
      "/",
      { method: "POST" },
      () => ({ success: true, candidateId: `candidate-${Math.random().toString(36).slice(2, 8)}` })
    ),

  run: (screeningId: string) =>
    request<{ screeningId: string; status: ProcessingStatus["status"] }>(
      `/api/screenings/${screeningId}/run`,
      { method: "POST" },
      () => ({ screeningId, status: "processing" as const })
    ),

  status: (screeningId: string) =>
    request<ProcessingStatus>(
      `/api/screenings/${screeningId}/status`,
      { method: "GET" },
      () => ({
        status: "completed" as const,
        progress: 100,
        stage: "finalizing_results" as const,
        candidateCount: 18,
        requirementCount: 12,
      })
    ),

  results: (screeningId: string) =>
    request<ScreeningResults>(
      `/api/screenings/${screeningId}/results`,
      { method: "GET" },
      () => getDemoResults(screeningId)
    ),

  list: () =>
    request<ScreeningSummary[]>(
      "/api/screenings",
      { method: "GET" },
      () => [
        {
          id: "screening-demo-1",
          jobTitle: "Senior Frontend Engineer",
          jobFileName: "Frontend_Engineer_JD.pdf",
          candidateCount: 18,
          requirementCount: 12,
          status: "completed",
          createdAt: "2026-09-12T09:30:00Z",
          completedAt: "2026-09-12T09:35:22Z",
        },
        {
          id: "screening-demo-2",
          jobTitle: "Product Manager",
          jobFileName: "PM_JD.pdf",
          candidateCount: 15,
          requirementCount: 9,
          status: "completed",
          createdAt: "2026-09-10T14:10:00Z",
          completedAt: "2026-09-10T14:14:05Z",
        },
        {
          id: "screening-demo-3",
          jobTitle: "Data Scientist",
          jobFileName: "DS_JD.pdf",
          candidateCount: 22,
          requirementCount: 14,
          status: "completed",
          createdAt: "2026-09-08T11:00:00Z",
          completedAt: "2026-09-08T11:06:40Z",
        },
      ]
    ),
};

export const candidatesApi = {
  detail: (screeningId: string, candidateId: string): Promise<Candidate> =>
    request(
      `/api/screenings/${screeningId}/candidates/${candidateId}`,
      { method: "GET" },
      () => {
        const r = getDemoResults(screeningId);
        const c = r.candidates.find((x) => x.id === candidateId);
        return c || r.candidates[0];
      }
    ),
};

export const comparisonApi = {
  compare: (screeningId: string, candidateIds: string[]) =>
    request(
      `/api/screenings/${screeningId}/compare`,
      { method: "POST", body: JSON.stringify({ candidateIds }) },
      () => {
        const r = getDemoResults(screeningId);
        const picked = r.candidates.filter((c) => candidateIds.includes(c.id));
        return { screeningId, candidates: picked.length ? picked : r.candidates.slice(0, 3) };
      }
    ),
};

export const counterfactualApi = {
  analyze: (screeningId: string, candidateId: string, scenario: "add_skill" | "remove_missing" | "boost_experience", _requirementId?: string) =>
    request(
      `/api/screenings/${screeningId}/counterfactual`,
      { method: "POST", body: JSON.stringify({ candidateId, scenario }) },
      () => {
        const r = getDemoResults(screeningId);
        const c = r.candidates.find((x) => x.id === candidateId) || r.candidates[0];
        const boost = 8;
        return {
          originalScore: c.overallScore,
          newScore: Math.min(100, c.overallScore + boost),
          originalRank: c.rank,
          newRank: Math.max(1, c.rank - 1),
          delta: boost,
          rankDelta: 1,
          explanation:
            scenario === "add_skill"
              ? "Adding the missing skill materially closes the gap against must-have requirements, pushing the combined score up."
              : scenario === "remove_missing"
              ? "If the candidate addressed all missing must-have items, their ranking would improve meaningfully."
              : "More demonstrated experience on the listed requirements would lift semantic coverage and overall ranking.",
        };
      }
    ),
};

export const biasApi = {
  get: (screeningId: string) =>
    request(
      `/api/screenings/${screeningId}/bias`,
      { method: "GET" },
      () => ({
        screeningId,
        overallBiasScore: 31,
        insights: [
          {
            id: "b1",
            type: "gender",
            severity: "medium",
            title: "Gender-coded language",
            description: "Adjectives ('aggressive', 'rockstar') lean masculine.",
            suggestion: "Swap for neutral: 'results-oriented', 'high-performing'.",
            excerpt: "Seeking an aggressive, rockstar engineer.",
          },
          {
            id: "b2",
            type: "age",
            severity: "low",
            title: "Recent-grads framing",
            description: "Encouraging only new grads can deter senior diversity.",
            suggestion: "Write: '0+ years of production experience'.",
            excerpt: "New grads strongly encouraged.",
          },
          {
            id: "b3",
            type: "length",
            severity: "medium",
            title: "Long requirement list",
            description: "12 items filters women and neurodiverse applicants.",
            suggestion: "Trim to 5–7 must-haves.",
          },
          {
            id: "b4",
            type: "structure",
            severity: "low",
            title: "Missing EEO statement",
            description: "No equal-opportunity or accessibility statement.",
            suggestion: "Append a short EEO line.",
          },
        ],
        suggestions: [
          "Trim must-haves to 5–7.",
          "Neutralize gender-coded adjectives.",
          "State salary range.",
          "Add EEO + accessibility statement.",
        ],
      })
    ),
};

export const chatApi = {
  send: (_screeningId: string, _message: string) =>
    request(
      "/",
      { method: "POST" },
      () => ({
        reply:
          "This demo screens candidates against the JD using BM25 + MiniLM with score fusion. Ask about a specific candidate or requirement to dive deeper.",
      })
    ),
};
