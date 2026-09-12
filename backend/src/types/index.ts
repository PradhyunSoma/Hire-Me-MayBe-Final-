export type RequirementImportance = "must_have" | "preferred" | "nice_to_have";

export type RequirementStatus = "matched" | "partial" | "missing";

export type CandidateStatus =
  | "strong_match"
  | "good_match"
  | "partial_match"
  | "missing_must_have";

export type ScreeningStatus = "queued" | "processing" | "completed" | "failed";

export type ProcessingStage =
  | "uploading"
  | "extracting_text"
  | "decomposing_requirements"
  | "keyword_matching"
  | "semantic_matching"
  | "calculating_scores"
  | "ranking_candidates"
  | "collecting_evidence"
  | "finalizing_results";

export interface RequirementEvidence {
  text: string;
  pageNumber: number;
  section?: string;
}

export interface RequirementMatch {
  requirementId: string;
  requirementText: string;
  type: "technical" | "experience" | "domain" | "soft_skill" | "certification";
  importance: RequirementImportance;
  keywordScore: number;
  semanticScore: number;
  combinedScore: number;
  status: RequirementStatus;
  evidence?: RequirementEvidence;
}

export interface Candidate {
  id: string;
  screeningId: string;
  name: string;
  email?: string;
  fileName?: string;
  overallScore: number;
  rank: number;
  status: CandidateStatus;
  technicalScore: number;
  experienceScore: number;
  domainScore: number;
  softSkillScore: number;
  keywordScore: number;
  semanticScore: number;
  mustHaveCoverage: number;
  preferredCoverage: number;
  matches: RequirementMatch[];
  topReason?: string;
}

export interface ScreeningSummary {
  id: string;
  jobTitle?: string;
  jobFileName?: string;
  candidateCount: number;
  requirementCount: number;
  status: ScreeningStatus;
  createdAt: string;
  completedAt?: string;
}

export interface ScreeningResults {
  screeningId: string;
  jobTitle?: string;
  jobDescription?: string;
  requirementsCount: number;
  candidatesCount: number;
  candidates: Candidate[];
  requirements: RequirementMatch["requirementText"][];
  requirementCoverage: Record<string, { matched: number; total: number }>;
  matchComposition: {
    keywordContribution: number;
    semanticContribution: number;
  };
  generatedAt: string;
}

export interface ProcessingStatus {
  status: ScreeningStatus;
  progress: number;
  stage: ProcessingStage;
  candidateCount: number;
  requirementCount: number;
  error?: string;
}

export interface BiasInsight {
  id: string;
  type: "gender" | "age" | "ability" | "ethnicity" | "length" | "structure";
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  suggestion: string;
  excerpt?: string;
}

export interface BiasReport {
  screeningId: string;
  insights: BiasInsight[];
  overallBiasScore: number;
  suggestions: string[];
}

export interface CounterfactualInput {
  candidateId: string;
  scenario: "add_skill" | "remove_missing" | "boost_experience";
  requirementId?: string;
}

export interface CounterfactualResult {
  originalScore: number;
  newScore: number;
  originalRank: number;
  newRank: number;
  delta: number;
  rankDelta: number;
  explanation: string;
}

export interface Screening {
  id: string;
  jobTitle?: string;
  jobFileName?: string;
  jobDescription?: string;
  jobDescriptionFile?: {
    name: string;
    size: number;
    data: Buffer;
  };
  candidates: Array<{
    id: string;
    name?: string;
    email?: string;
    fileName?: string;
    file?: {
      name: string;
      size: number;
      data: Buffer;
    };
  }>;
  status: ScreeningStatus;
  processingStatus: ProcessingStatus;
  createdAt: string;
  completedAt?: string;
  results?: ScreeningResults;
  biasReport?: BiasReport;
}
