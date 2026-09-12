import env from "../config/env";
import type {
  Screening,
  ScreeningSummary,
  ScreeningResults,
  ProcessingStatus,
  Candidate,
  BiasReport,
  CandidateStatus,
  RequirementMatch,
  ProcessingStage,
  CounterfactualInput,
  CounterfactualResult,
} from "../types";

class InMemoryStore {
  private screenings: Map<string, Screening> = new Map();
  private progressTimers: Map<string, NodeJS.Timeout> = new Map();

  createScreening(): Screening {
    const id = `screening-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const now = new Date().toISOString();
    const screening: Screening = {
      id,
      candidates: [],
      status: "queued",
      processingStatus: {
        status: "queued",
        progress: 0,
        stage: "uploading",
        candidateCount: 0,
        requirementCount: 0,
      },
      createdAt: now,
    };
    this.screenings.set(id, screening);
    return screening;
  }

  getScreening(id: string): Screening | undefined {
    return this.screenings.get(id);
  }

  listScreenings(): ScreeningSummary[] {
    return Array.from(this.screenings.values())
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map((s) => ({
        id: s.id,
        jobTitle: s.jobTitle,
        jobFileName: s.jobFileName,
        candidateCount: s.candidates.length,
        requirementCount: s.results?.requirementsCount || 0,
        status: s.status,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));
  }

  updateScreening(id: string, updates: Partial<Screening>): Screening | undefined {
    const screening = this.screenings.get(id);
    if (!screening) return undefined;
    const updated = { ...screening, ...updates };
    this.screenings.set(id, updated);
    return updated;
  }

  attachJobDescription(
    screeningId: string,
    file: { name: string; size: number; data: Buffer },
    description?: string
  ): Screening | undefined {
    const s = this.screenings.get(screeningId);
    if (!s) return undefined;
    const updated = {
      ...s,
      jobFileName: file.name,
      jobDescriptionFile: file,
      jobDescription: description || s.jobDescription || extractTitleFromName(file.name),
      jobTitle: s.jobTitle || extractTitleFromName(file.name),
    };
    this.screenings.set(screeningId, updated);
    return updated;
  }

  attachResume(
    screeningId: string,
    file: { name: string; size: number; data: Buffer },
    candidateName?: string,
    candidateEmail?: string
  ): { screening: Screening | undefined; candidateId: string } {
    const s = this.screenings.get(screeningId);
    const candidateId = `candidate-${Math.random().toString(36).slice(2, 8)}`;
    if (!s) return { screening: undefined, candidateId };
    const candidate = {
      id: candidateId,
      fileName: file.name,
      name: candidateName || deriveNameFromFilename(file.name),
      email: candidateEmail,
      file,
    };
    const updated = { ...s, candidates: [...s.candidates, candidate] };
    this.screenings.set(screeningId, updated);
    return { screening: updated, candidateId };
  }

  startProcessing(screeningId: string): Screening | undefined {
    const s = this.screenings.get(screeningId);
    if (!s) return undefined;

    const stages: ProcessingStage[] = [
      "extracting_text",
      "decomposing_requirements",
      "keyword_matching",
      "semantic_matching",
      "calculating_scores",
      "ranking_candidates",
      "collecting_evidence",
      "finalizing_results",
    ];

    const candidateCount = s.candidates.length;
    const requirementCount = 12;
    let progress = 5;
    let stageIdx = 0;

    const updated: Screening = {
      ...s,
      status: "processing",
      processingStatus: {
        status: "processing",
        progress,
        stage: stages[0],
        candidateCount,
        requirementCount,
      },
    };
    this.screenings.set(screeningId, updated);

    if (this.progressTimers.has(screeningId)) {
      clearInterval(this.progressTimers.get(screeningId)!);
    }

    const interval = setInterval(() => {
      const current = this.screenings.get(screeningId);
      if (!current) {
        clearInterval(interval);
        this.progressTimers.delete(screeningId);
        return;
      }

      progress += Math.random() * 8 + 4;

      if (progress >= 100) {
        progress = 100;
        const results = generateDemoResults(screeningId, candidateCount);
        const biasReport = generateDemoBiasReport(screeningId);
        const final: Screening = {
          ...current,
          status: "completed",
          processingStatus: {
            status: "completed",
            progress: 100,
            stage: "finalizing_results",
            candidateCount,
            requirementCount,
          },
          completedAt: new Date().toISOString(),
          results,
          biasReport,
          requirementCount,
        } as Screening;
        this.screenings.set(screeningId, final);
        clearInterval(interval);
        this.progressTimers.delete(screeningId);
      } else {
        const newStageIdx = Math.min(stages.length - 1, Math.floor((progress / 100) * stages.length));
        if (newStageIdx !== stageIdx) stageIdx = newStageIdx;
        const updatedProgress: Screening = {
          ...current,
          status: "processing",
          processingStatus: {
            status: "processing",
            progress: Math.round(progress),
            stage: stages[stageIdx],
            candidateCount,
            requirementCount,
          },
        };
        this.screenings.set(screeningId, updatedProgress);
      }
    }, 500);

    this.progressTimers.set(screeningId, interval);
    return this.screenings.get(screeningId);
  }

  getProgress(screeningId: string): ProcessingStatus | undefined {
    return this.screenings.get(screeningId)?.processingStatus;
  }

  getResults(screeningId: string): ScreeningResults | undefined {
    return this.screenings.get(screeningId)?.results;
  }

  getCandidate(screeningId: string, candidateId: string): Candidate | undefined {
    return this.screenings.get(screeningId)?.results?.candidates.find((c) => c.id === candidateId);
  }

  getBiasReport(screeningId: string): BiasReport | undefined {
    const s = this.screenings.get(screeningId);
    if (!s?.biasReport) {
      s && (s.biasReport = generateDemoBiasReport(screeningId));
    }
    return this.screenings.get(screeningId)?.biasReport;
  }
}

function extractTitleFromName(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  return base.replace(/\b\w/g, (c) => c.toUpperCase()).trim() || "Untitled Position";
}

function deriveNameFromFilename(filename: string): string {
  const base = filename.replace(/\.[^/.]+$/, "").replace(/[_-]/g, " ");
  const words = base.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    return words
      .slice(0, 2)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }
  return base || "Unknown Candidate";
}

export class SupabaseService {
  private useStub: boolean;
  private store: InMemoryStore;

  constructor() {
    this.useStub = !env.supabaseUrl || !env.supabaseServiceRoleKey;
    this.store = new InMemoryStore();
    if (this.useStub) {
      console.warn("[SupabaseService] SUPABASE credentials not set, using in-memory store as fallback.");
    }
  }

  createScreening() {
    return this.store.createScreening();
  }

  getScreening(id: string) {
    return this.store.getScreening(id);
  }

  listScreenings() {
    return this.store.listScreenings();
  }

  updateScreening(id: string, updates: Partial<Screening>) {
    return this.store.updateScreening(id, updates);
  }

  attachJobDescription(
    screeningId: string,
    file: { name: string; size: number; data: Buffer },
    description?: string
  ) {
    return this.store.attachJobDescription(screeningId, file, description);
  }

  attachResume(
    screeningId: string,
    file: { name: string; size: number; data: Buffer },
    candidateName?: string,
    candidateEmail?: string
  ) {
    return this.store.attachResume(screeningId, file, candidateName, candidateEmail);
  }

  startProcessing(screeningId: string) {
    return this.store.startProcessing(screeningId);
  }

  getProgress(screeningId: string) {
    return this.store.getProgress(screeningId);
  }

  getResults(screeningId: string) {
    return this.store.getResults(screeningId);
  }

  getCandidate(screeningId: string, candidateId: string) {
    return this.store.getCandidate(screeningId, candidateId);
  }

  getBiasReport(screeningId: string) {
    return this.store.getBiasReport(screeningId);
  }
}

/* --------------------------- DEMO DATA GENERATOR --------------------------- */

export function generateDemoResults(screeningId: string, count: number = 18): ScreeningResults {
  const candidateCount = Math.max(5, Math.min(count, 30));

  const reqs: Array<{
    text: string;
    type: RequirementMatch["type"];
    importance: RequirementMatch["importance"];
  }> = [
    { text: "React", type: "technical", importance: "must_have" },
    { text: "TypeScript", type: "technical", importance: "must_have" },
    { text: "REST APIs", type: "technical", importance: "must_have" },
    { text: "PostgreSQL", type: "technical", importance: "preferred" },
    { text: "AWS", type: "technical", importance: "preferred" },
    { text: "At least 4 years of professional experience", type: "experience", importance: "must_have" },
    { text: "Frontend architecture or system design", type: "experience", importance: "preferred" },
    { text: "SaaS or B2B products", type: "domain", importance: "nice_to_have" },
    { text: "Communication and collaboration", type: "soft_skill", importance: "must_have" },
    { text: "Mentorship or leading projects", type: "soft_skill", importance: "preferred" },
    { text: "Testing (Jest / Playwright / Cypress)", type: "technical", importance: "nice_to_have" },
    { text: "CI/CD pipelines", type: "technical", importance: "nice_to_have" },
  ];

  const firstNames = [
    "Alex", "Priya", "Jordan", "Sara", "Marcus", "Chen", "Elena", "Noah",
    "Aisha", "Liam", "Mia", "Hiro", "Olivia", "Kai", "Zara", "Ivan", "Nora", "Theo",
    "Sophia", "Lucas", "Amelia", "Ethan", "Isabella", "Mason",
  ];
  const lastNames = [
    "Johnson", "Patel", "Lee", "Garcia", "Williams", "Wang", "Silva", "Brown",
    "Khan", "Nguyen", "Chen", "Tanaka", "Rodriguez", "Kim", "Hassan", "Volkov",
    "Moreau", "Papadopoulos", "Smith", "Andersen", "Ibrahim", "Okafor",
  ];

  const candidates: Candidate[] = [];

  for (let i = 0; i < candidateCount; i++) {
    const rank = i + 1;
    const baseScore = 92 - i * 2.2 + Math.sin(i * 1.3) * 3;
    const overallScore = Math.max(24, Math.min(95, baseScore));
    const status: CandidateStatus =
      rank <= 3
        ? "strong_match"
        : rank <= 8
        ? "good_match"
        : overallScore > 55
        ? "partial_match"
        : "missing_must_have";

    const matches = reqs.map((r, idx) => {
      const reqSkill = r.text.toLowerCase();
      const hitsTop = rank <= 5 && idx < 6;
      const hitsMid = rank <= 10 && idx % 3 !== 2;
      const hasEvidence = hitsTop || hitsMid || Math.random() < 0.55;
      const kwSeed = hasEvidence ? 0.6 + Math.random() * 0.4 : Math.random() * 0.5;
      const semSeed = hasEvidence ? 0.55 + Math.random() * 0.42 : Math.random() * 0.55;
      const kwW = r.type === "technical" ? 0.55 : 0.25;
      const semW = 1 - kwW;
      const combined = kwW * kwSeed + semW * semSeed;
      const st: RequirementMatch["status"] =
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
        evidence:
          hasEvidence && st !== "missing"
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

    const technicalMatches = matches.filter((m) => m.type === "technical");
    const experienceMatches = matches.filter((m) => m.type === "experience");
    const domainMatches = matches.filter((m) => m.type === "domain");
    const softSkillMatches = matches.filter((m) => m.type === "soft_skill");

    const avg = (arr: RequirementMatch[]) =>
      arr.length ? arr.reduce((s, m) => s + m.combinedScore, 0) / arr.length : 0;

    const fi = i % firstNames.length;
    const li = (i * 3 + 1) % lastNames.length;
    const firstName = firstNames[fi];
    const lastName = lastNames[li];

    candidates.push({
      id: `candidate-${i + 1}`,
      screeningId,
      name: `${firstName} ${lastName}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      fileName: `Resume_${firstName}_${lastName}.pdf`,
      overallScore: Math.round(overallScore),
      rank,
      status,
      technicalScore: Math.round(avg(technicalMatches) * 100),
      experienceScore: Math.round(avg(experienceMatches) * 100),
      domainScore: Math.round(avg(domainMatches) * 100),
      softSkillScore: Math.round(avg(softSkillMatches) * 100),
      keywordScore: Math.round((matches.reduce((s, m) => s + m.keywordScore, 0) / matches.length) * 100),
      semanticScore: Math.round((matches.reduce((s, m) => s + m.semanticScore, 0) / matches.length) * 100),
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

export function generateDemoBiasReport(screeningId: string): BiasReport {
  return {
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
  };
}

export function generateCounterfactual(
  results: ScreeningResults,
  input: CounterfactualInput
): CounterfactualResult {
  const c = results.candidates.find((x) => x.id === input.candidateId) || results.candidates[0];
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

export const supabaseService = new SupabaseService();
