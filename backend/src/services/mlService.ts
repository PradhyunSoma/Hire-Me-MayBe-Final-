import env from "../config/env";
import type {
  ScreeningResults,
  ProcessingStatus,
  BiasReport,
  CounterfactualInput,
  CounterfactualResult,
  Candidate,
} from "../types";

export class MLService {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || env.mlServiceUrl;
  }

  async runScreening(
    screeningId: string,
    jobDescription: string,
    resumes: Array<{ fileName: string; content: Buffer }>
  ): Promise<{ success: boolean }> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          screeningId,
          jobDescription,
          resumes: resumes.map((r) => ({
            fileName: r.fileName,
            content: r.content.toString("base64"),
          })),
        }),
      });
      if (!response.ok) throw new Error(`ML service responded ${response.status}`);
      return (await response.json()) as { success: boolean };
    } catch (error) {
      console.warn("[MLService] runScreening stubbed - no Python service available:", error instanceof Error ? error.message : "unknown");
      return { success: true };
    }
  }

  async getStatus(screeningId: string): Promise<ProcessingStatus | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/status`);
      if (!response.ok) return null;
      return (await response.json()) as ProcessingStatus | null;
    } catch {
      return null;
    }
  }

  async getResults(screeningId: string): Promise<ScreeningResults | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/results`);
      if (!response.ok) return null;
      return (await response.json()) as ScreeningResults | null;
    } catch {
      return null;
    }
  }

  async compareCandidates(
    screeningId: string,
    candidateIds: string[]
  ): Promise<{ screeningId: string; candidates: Candidate[] } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidateIds }),
      });
      if (!response.ok) return null;
      return (await response.json()) as { screeningId: string; candidates: Candidate[] } | null;
    } catch {
      return null;
    }
  }

  async counterfactualAnalysis(
    screeningId: string,
    input: CounterfactualInput
  ): Promise<CounterfactualResult | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/counterfactual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) return null;
      return (await response.json()) as CounterfactualResult | null;
    } catch {
      return null;
    }
  }

  async getBiasReport(screeningId: string): Promise<BiasReport | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/bias`);
      if (!response.ok) return null;
      return (await response.json()) as BiasReport | null;
    } catch {
      return null;
    }
  }

  async chat(screeningId: string, message: string): Promise<{ reply: string } | null> {
    try {
      const response = await fetch(`${this.baseUrl}/screening/${screeningId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      if (!response.ok) return null;
      return (await response.json()) as { reply: string } | null;
    } catch {
      return null;
    }
  }
}

export const mlService = new MLService();
