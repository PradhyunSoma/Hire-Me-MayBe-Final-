import type {
  Candidate,
  ScreeningResults,
  ProcessingStatus,
  ScreeningSummary,
  CounterfactualInput,
  CounterfactualResult,
  BiasReport,
} from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";

async function request<T>(
  path: string,
  options: RequestInit = {},
  demoFallback?: () => T
): Promise<T> {
  if (DEMO_MODE) {
    await new Promise((r) => setTimeout(r, 250));
    return demoFallback!();
  }
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

export const screeningsApi = {
  create: () =>
    request<{ screeningId: string }>(
      "/api/screenings",
      { method: "POST" },
      () => ({ screeningId: "screening-demo-1" })
    ),

  uploadJD: (screeningId: string, _file: File) =>
    request<{ success: boolean }>(
      `/api/screenings/${screeningId}/job-description`,
      { method: "POST" },
      () => ({ success: true })
    ),

  uploadResume: (screeningId: string, _file: File, _fileId: string) =>
    request<{ success: boolean; candidateId: string }>(
      `/api/screenings/${screeningId}/resumes`,
      { method: "POST" },
      () => ({
        success: true,
        candidateId: `candidate-${Math.random().toString(36).slice(2, 8)}`,
      })
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
  detail: (screeningId: string, candidateId: string) =>
    request<Candidate>(
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
    request<{ screeningId: string; candidates: Candidate[] }>(
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
  analyze: (screeningId: string, input: CounterfactualInput) =>
    request<CounterfactualResult>(
      `/api/screenings/${screeningId}/counterfactual`,
      { method: "POST", body: JSON.stringify(input) },
      () => {
        const r = getDemoResults(screeningId);
        const c = r.candidates.find((x) => x.id === input.candidateId) || r.candidates[0];
        const boost = 8;
        return {
          originalScore: c.overallScore,
          newScore: Math.min(100, c.overallScore + boost),
          originalRank: c.rank,
          newRank: Math.max(1, c.rank - 1),
          delta: boost,
          rankDelta: 1,
          explanation:
            input.scenario === "add_skill"
              ? "Adding the missing skill materially closes the gap against must-have requirements, pushing the combined score up."
              : input.scenario === "remove_missing"
              ? "If the candidate addressed all missing must-have items, their ranking would improve meaningfully."
              : "More demonstrated experience on the listed requirements would lift semantic coverage and overall ranking.",
        };
      }
    ),
};

export const biasApi = {
  get: (screeningId: string) =>
    request<BiasReport>(
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
            description: "Some adjectives ('aggressive', 'assertive', 'rockstar') lean masculine.",
            suggestion: "Swap for neutral wording: 'results-oriented', 'high-performing'.",
            excerpt: "Seeking an aggressive, rockstar engineer.",
          },
          {
            id: "b2",
            type: "age",
            severity: "low",
            title: "Tenor: recent grads preferred",
            description: "Phrases like 'new grad' or '0-3 years' can deter older applicants.",
            suggestion: "Write: '0+ years of production experience' and evaluate impact.",
            excerpt: "New grads strongly encouraged.",
          },
          {
            id: "b3",
            type: "length",
            severity: "medium",
            title: "Very long requirement list",
            description: "12 listed items likely filters out qualified women and neurodiverse applicants.",
            suggestion: "Trim to 5–7 must-haves; make the rest preferred/nice-to-have.",
          },
          {
            id: "b4",
            type: "structure",
            severity: "low",
            title: "Missing EEO statement",
            description: "No visible equal-opportunity or accessibility statement.",
            suggestion: "Append a short EEO and accommodations line.",
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

/* --------------------------- DEMO DATA GENERATOR --------------------------- */

function getDemoResults(screeningId: string): ScreeningResults {
  const reqs = [
    { text: "React", type: "technical" as const, importance: "must_have" as const },
    { text: "TypeScript", type: "technical" as const, importance: "must_have" as const },
    { text: "REST APIs", type: "technical" as const, importance: "must_have" as const },
    { text: "PostgreSQL", type: "technical" as const, importance: "preferred" as const },
    { text: "AWS", type: "technical" as const, importance: "preferred" as const },
    { text: "At least 4 years of professional experience", type: "experience" as const, importance: "must_have" as const },
    { text: "Frontend architecture or system design", type: "experience" as const, importance: "preferred" as const },
    { text: "SaaS or B2B products", type: "domain" as const, importance: "nice_to_have" as const },
    { text: "Communication and collaboration", type: "soft_skill" as const, importance: "must_have" as const },
    { text: "Mentorship or leading projects", type: "soft_skill" as const, importance: "preferred" as const },
    { text: "Testing (Jest / Playwright / Cypress)", type: "technical" as const, importance: "nice_to_have" as const },
    { text: "CI/CD pipelines", type: "technical" as const, importance: "nice_to_have" as const },
  ];

  const firstNames = ["Alex", "Priya", "Jordan", "Sara", "Marcus", "Chen", "Elena", "Noah", "Aisha", "Liam", "Mia", "Hiro", "Olivia", "Kai", "Zara", "Ivan", "Nora", "Theo"];
  const lastNames = ["Johnson", "Patel", "Lee", "Garcia", "Williams", "Wang", "Silva", "Brown", "Khan", "Nguyen", "Chen", "Tanaka", "Rodriguez", "Kim", "Hassan", "Volkov", "Moreau", "Papadopoulos"];

  const candidates: Candidate[] = [];

  for (let i = 0; i < 18; i++) {
    const rank = i + 1;
    const baseScore = 92 - i * 2.2 + (Math.sin(i * 1.3) * 3);
    const overallScore = Math.max(24, Math.min(95, baseScore));
    const status: Candidate["status"] =
      rank <= 3 ? "strong_match" : rank <= 8 ? "good_match" : overallScore > 55 ? "partial_match" : "missing_must_have";

    const matches = reqs.map((r, idx) => {
      const reqSkill = r.text.toLowerCase();
      const hitsTop = rank <= 5 && idx < 6;
      const hitsMid = rank <= 10 && (idx % 3 !== 2);
      const hasEvidence = hitsTop || hitsMid || Math.random() < 0.55;
      const kwSeed = hasEvidence ? 0.6 + Math.random() * 0.4 : Math.random() * 0.5;
      const semSeed = hasEvidence ? 0.55 + Math.random() * 0.42 : Math.random() * 0.55;
      const kwW = r.type === "technical" ? 0.55 : 0.25;
      const semW = 1 - kwW;
      const combined = kwW * kwSeed + semW * semSeed;
      const st: "matched" | "partial" | "missing" =
        combined >= 0.7 ? "matched" : combined >= 0.4 ? "partial" : "missing";
      return {
        requirementId: `req-${idx + 1}`,
        requirementText: r.text,
        type: r.type,
        importance: r.importance,
        keywordScore: +kwSeed.toFixed(3),
        semanticScore: +semSeed.toFixed(3),
        combinedScore: +combined.toFixed(3),
        status: st,
        evidence: hasEvidence && st !== "missing"
          ? {
              text: `Built scalable ${reqSkill} applications with a focus on performance, accessibility, and maintainable architecture across 4+ years of production delivery.`,
              pageNumber: 1 + (idx % 2),
              section: idx % 2 === 0 ? "Experience" : "Projects",
            }
          : undefined,
      };
    });

    const mustHaves = matches.filter((m) => m.importance === "must_have");
    const pref = matches.filter((m) => m.importance === "preferred");

    candidates.push({
      id: `candidate-${i + 1}`,
      screeningId,
      name: `${firstNames[i]} ${lastNames[i]}`,
      email: `${firstNames[i].toLowerCase()}.${lastNames[i].toLowerCase()}@example.com`,
      fileName: `Resume_${firstNames[i]}_${lastNames[i]}.pdf`,
      overallScore: Math.round(overallScore),
      rank,
      status,
      technicalScore: Math.round(
        matches.filter((m) => m.type === "technical").reduce((s, m) => s + m.combinedScore, 0) /
          Math.max(1, matches.filter((m) => m.type === "technical").length) * 100
      ),
      experienceScore: Math.round(
        matches.filter((m) => m.type === "experience").reduce((s, m) => s + m.combinedScore, 0) /
          Math.max(1, matches.filter((m) => m.type === "experience").length) * 100
      ),
      domainScore: Math.round(
        matches.filter((m) => m.type === "domain").reduce((s, m) => s + m.combinedScore, 0) /
          Math.max(1, matches.filter((m) => m.type === "domain").length) * 100
      ),
      softSkillScore: Math.round(
        matches.filter((m) => m.type === "soft_skill").reduce((s, m) => s + m.combinedScore, 0) /
          Math.max(1, matches.filter((m) => m.type === "soft_skill").length) * 100
      ),
      keywordScore: Math.round(matches.reduce((s, m) => s + m.keywordScore, 0) / matches.length * 100),
      semanticScore: Math.round(matches.reduce((s, m) => s + m.semanticScore, 0) / matches.length * 100),
      mustHaveCoverage: Math.round(
        (mustHaves.filter((m) => m.status === "matched").length / Math.max(1, mustHaves.length)) * 100
      ),
      preferredCoverage: Math.round(
        (pref.filter((m) => m.status === "matched").length / Math.max(1, pref.length)) * 100
      ),
      matches,
      topReason:
        rank === 1
          ? "Strong technical and experience match across every must-have, with evidence-backed semantic coverage on architecture and systems design."
          : rank === 2
          ? "Excellent technical coverage; minor gap on cloud exposure but strong frontend systems design evidence."
          : rank === 3
          ? "Solid all-around candidate with strong experience signaling and good collaboration evidence."
          : undefined,
    });
  }

  const requirementCoverage: Record<string, { matched: number; total: number }> = {};
  reqs.forEach((r, i) => {
    const matched = candidates.filter((c) => c.matches[i].status === "matched").length;
    requirementCoverage[r.text] = { matched, total: candidates.length };
  });

  return {
    screeningId,
    jobTitle: "Senior Frontend Engineer",
    jobDescription:
      "Hire Me Maybe is seeking a Senior Frontend Engineer to build the next generation of explainable recruiting intelligence products.",
    requirementsCount: reqs.length,
    candidatesCount: candidates.length,
    candidates,
    requirements: reqs.map((r) => r.text),
    requirementCoverage,
    matchComposition: {
      keywordContribution: 0.46,
      semanticContribution: 0.54,
    },
    generatedAt: new Date().toISOString(),
  };
}

export { getDemoResults };
