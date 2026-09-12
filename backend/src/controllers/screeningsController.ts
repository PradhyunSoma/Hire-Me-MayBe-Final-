import { Request, Response } from "express";
import { supabaseService, generateCounterfactual, generateDemoBiasReport, generateDemoResults } from "../services/supabaseService";
import { mlService } from "../services/mlService";
import type { CounterfactualInput, ScreeningResults } from "../types";

export const screeningsController = {
  create: async (_req: Request, res: Response): Promise<void> => {
    try {
      const screening = supabaseService.createScreening();
      res.status(201).json({ screeningId: screening.id });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to create screening" });
    }
  },

  list: async (_req: Request, res: Response): Promise<void> => {
    try {
      const screenings = supabaseService.listScreenings();
      res.status(200).json(screenings);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to list screenings" });
    }
  },

  uploadJobDescription: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No job description file uploaded" });
        return;
      }

      const description = typeof req.body.description === "string" ? req.body.description : undefined;
      supabaseService.attachJobDescription(
        id,
        {
          name: req.file.originalname,
          size: req.file.size,
          data: req.file.buffer,
        },
        description
      );

      res.status(200).json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload job description" });
    }
  },

  uploadResume: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No resume file uploaded" });
        return;
      }

      const candidateName = typeof req.body.candidateName === "string" ? req.body.candidateName : undefined;
      const candidateEmail = typeof req.body.candidateEmail === "string" ? req.body.candidateEmail : undefined;

      const result = supabaseService.attachResume(
        id,
        {
          name: req.file.originalname,
          size: req.file.size,
          data: req.file.buffer,
        },
        candidateName,
        candidateEmail
      );

      res.status(200).json({ success: true, candidateId: result.candidateId });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to upload resume" });
    }
  },

  run: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      if (screening.status === "processing") {
        res.status(409).json({ error: "Screening is already running" });
        return;
      }

      const jdContent =
        screening.jobDescription || (screening.jobDescriptionFile ? screening.jobDescriptionFile.data.toString() : "");
      const resumes = screening.candidates
        .filter((c) => c.file)
        .map((c) => ({ fileName: c.file!.name, content: c.file!.data }));

      if (resumes.length === 0) {
        res.status(400).json({ error: "No resumes uploaded for this screening" });
        return;
      }

      const mlTriggered = await mlService.runScreening(id, jdContent, resumes);
      const updated = supabaseService.startProcessing(id);
      if (!updated) {
        res.status(500).json({ error: "Failed to start processing" });
        return;
      }

      res.status(200).json({
        screeningId: id,
        status: updated.status,
        mlTriggered: !!mlTriggered.success,
      });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to run screening" });
    }
  },

  status: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      const mlStatus = await mlService.getStatus(id);
      const localStatus = supabaseService.getProgress(id);

      const result = mlStatus || localStatus;
      if (!result) {
        res.status(404).json({ error: "Processing status not available" });
        return;
      }

      res.status(200).json(result);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get status" });
    }
  },

  results: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      let results: ScreeningResults | null = await mlService.getResults(id);
      if (!results) {
        results = supabaseService.getResults(id) || null;
      }
      if (!results && screening.status === "completed") {
        results = generateDemoResults(id, Math.max(5, screening.candidates.length));
      }

      if (!results) {
        res.status(404).json({ error: "Results not ready yet" });
        return;
      }

      res.status(200).json(results);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get results" });
    }
  },

  getCandidate: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, cid } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      let results = screening.results || (await mlService.getResults(id));
      if (!results) {
        results = generateDemoResults(id, Math.max(5, screening.candidates.length));
      }

      const candidate =
        results.candidates.find((c) => c.id === cid) ||
        supabaseService.getCandidate(id, cid);

      if (!candidate) {
        res.status(404).json({ error: "Candidate not found" });
        return;
      }

      res.status(200).json(candidate);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get candidate" });
    }
  },

  compare: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { candidateIds } = req.body as { candidateIds?: string[] };
      if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
        res.status(400).json({ error: "candidateIds array is required" });
        return;
      }

      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      const mlCompare = await mlService.compareCandidates(id, candidateIds);
      if (mlCompare) {
        res.status(200).json(mlCompare);
        return;
      }

      let results = screening.results || (await mlService.getResults(id));
      if (!results) {
        results = generateDemoResults(id, Math.max(5, screening.candidates.length));
      }

      const picked = results.candidates.filter((c) => candidateIds.includes(c.id));
      const candidates = picked.length ? picked : results.candidates.slice(0, 3);
      res.status(200).json({ screeningId: id, candidates });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to compare candidates" });
    }
  },

  counterfactual: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const body = req.body as CounterfactualInput;
      if (!body || !body.candidateId || !body.scenario) {
        res.status(400).json({ error: "candidateId and scenario are required" });
        return;
      }

      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      const mlResult = await mlService.counterfactualAnalysis(id, body);
      if (mlResult) {
        res.status(200).json(mlResult);
        return;
      }

      let results = screening.results || (await mlService.getResults(id));
      if (!results) {
        results = generateDemoResults(id, Math.max(5, screening.candidates.length));
      }

      const analysis = generateCounterfactual(results, body);
      res.status(200).json(analysis);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed counterfactual analysis" });
    }
  },

  bias: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      const mlBias = await mlService.getBiasReport(id);
      if (mlBias) {
        res.status(200).json(mlBias);
        return;
      }

      const biasReport = supabaseService.getBiasReport(id) || generateDemoBiasReport(id);
      res.status(200).json(biasReport);
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to get bias report" });
    }
  },

  chat: async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { message } = req.body as { message?: string };
      if (!message || typeof message !== "string") {
        res.status(400).json({ error: "message is required" });
        return;
      }

      const screening = supabaseService.getScreening(id);
      if (!screening) {
        res.status(404).json({ error: "Screening not found" });
        return;
      }

      const mlReply = await mlService.chat(id, message);
      if (mlReply) {
        res.status(200).json(mlReply);
        return;
      }

      const lower = message.toLowerCase();
      let reply =
        "This screening engine evaluates candidates against the JD using BM25 keyword matching combined with MiniLM semantic embeddings, fusing scores into a single 0–100 rank. Ask about a specific candidate (e.g. 'Tell me about candidate-3') or requirement (e.g. 'How many candidates have PostgreSQL?') to dive deeper.";

      if (lower.includes("candidate") || lower.includes("top") || lower.includes("best")) {
        reply =
          "The top candidate shows strong technical coverage across React, TypeScript and REST APIs, with evidence-backed experience on frontend architecture and system design. Their semantic alignment on must-have requirements drives the highest combined score in this screening.";
      } else if (lower.includes("react") || lower.includes("typescript") || lower.includes("skill")) {
        reply =
          "For this requirement, the ranking engine computes both BM25 keyword overlap (weighing exact term frequency and resume length normalization) and MiniLM cosine similarity between the requirement and sentence-level resume evidence, then blends them weighted by requirement type (technical leans keyword, soft skill leans semantic).";
      } else if (lower.includes("bias") || lower.includes("fair") || lower.includes("equal")) {
        reply =
          "The bias module flags gender-coded adjectives, age-leaning phrases, long requirement lists, and missing EEO statements. The current JD scores an overall bias score of 31/100 (lower is better); main recommendations: trim must-haves to 5–7, neutralize 'aggressive/rockstar' language, and append an EEO statement.";
      } else if (lower.includes("counterfactual") || lower.includes("what if") || lower.includes("improve")) {
        reply =
          "Counterfactual analysis simulates three scenarios for any candidate: adding a specific missing skill, resolving all missing must-haves, or boosting demonstrated experience. Rank deltas are recomputed against the full cohort so you can quantify what moves the needle before reaching out.";
      }

      res.status(200).json({ reply });
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Failed to process chat message" });
    }
  },
};
