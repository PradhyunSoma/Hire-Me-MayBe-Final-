import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { screeningsApi } from "@/api/screenings";
import { ProcessingPipeline } from "@/components/screening/ProcessingPipeline";
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function ProcessingPage() {
  const { id = "screening-demo-1" } = useParams();
  const navigate = useNavigate();

  const DEMO_MODE = import.meta.env.VITE_DEMO_MODE !== "false";
  const [simStage, setSimStage] = useState(0);
  const [simProgress, setSimProgress] = useState(4);
  const [simDone, setSimDone] = useState(false);

  const stages = ["uploading","extracting_text","decomposing_requirements","keyword_matching","semantic_matching","calculating_scores","ranking_candidates","collecting_evidence","finalizing_results"] as const;

  useEffect(() => {
    if (!DEMO_MODE) return;
    if (simDone) return;
    const t = setInterval(() => {
      setSimProgress((p) => {
        const next = p + Math.random() * 7 + 2;
        return Math.min(99, next);
      });
      setSimStage((s) => {
        const targetStage = Math.min(stages.length - 1, Math.floor((simProgress / 100) * stages.length));
        return Math.min(stages.length - 1, Math.max(s, targetStage));
      });
    }, 600);
    return () => clearInterval(t);
  }, [DEMO_MODE, simDone, simProgress]);

  useEffect(() => {
    if (simProgress >= 99 && DEMO_MODE) {
      setTimeout(() => setSimDone(true), 350);
    }
  }, [simProgress, DEMO_MODE]);

  const { data: status, isError, error } = useQuery({
    queryKey: ["screening-status", id, simStage],
    queryFn: () => screeningsApi.status(id),
    refetchInterval: (q) => {
      const s = q.state.data?.status;
      if (DEMO_MODE) {
        if (simDone) return false;
        return 700;
      }
      return s === "queued" || s === "processing" ? 1500 : false;
    },
  });

  const effectiveStatus = DEMO_MODE
    ? {
        status: simDone ? "completed" as const : "processing" as const,
        progress: simDone ? 100 : simProgress,
        stage: simDone ? ("finalizing_results" as const) : stages[simStage],
        candidateCount: 18,
        requirementCount: 12,
      }
    : status;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="muted" className="uppercase tracking-wide">Step 2 of 3</Badge>
          <span>Processing pipeline</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">Screening in progress…</h1>
        <p className="text-muted-foreground max-w-2xl">
          The matching engine is extracting text, decomposing requirements, running keyword + semantic search,
          fusing scores, and collecting evidence for each candidate.
        </p>
      </div>

      {isError && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            {(error as any)?.message || "Failed to load status."}
          </CardContent>
        </Card>
      )}

      {effectiveStatus && (
        <ProcessingPipeline
          stage={effectiveStatus.stage}
          progress={effectiveStatus.progress}
          status={effectiveStatus.status}
          candidateCount={effectiveStatus.candidateCount}
          requirementCount={effectiveStatus.requirementCount}
        />
      )}

      <Card className="bg-gradient-to-br from-primary/5 via-background to-accent/5 border-primary/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">What happens during matching?</CardTitle>
          </div>
          <CardDescription>A look inside the ranking engine.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div className="rounded-xl bg-background/70 border p-4 space-y-1.5">
            <div className="font-semibold text-primary">BM25 Keyword Retrieval</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Fuzzy keyword matching of each requirement against resume chunks. Technical weight: 55%.
            </p>
          </div>
          <div className="rounded-xl bg-background/70 border p-4 space-y-1.5">
            <div className="font-semibold text-accent">MiniLM Semantic Retrieval</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              all-MiniLM-L6-v2 embeddings with cosine similarity. Experience weight: 75%.
            </p>
          </div>
          <div className="rounded-xl bg-background/70 border p-4 space-y-1.5">
            <div className="font-semibold">Score Fusion & Ranking</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Weighted combination per requirement type, then must-have coverage penalizes gaps.
            </p>
          </div>
          <div className="rounded-xl bg-background/70 border p-4 space-y-1.5">
            <div className="font-semibold">Evidence Selection</div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              Best chunk per requirement with page number + section — no score shown without a reason.
            </p>
          </div>
        </CardContent>
      </Card>

      {(effectiveStatus?.status === "completed" || simDone) && (
        <div className="flex justify-center">
          <Button size="xl" variant="gradient" onClick={() => navigate(`/screening/${id}/results`)}>
            View Screening Results
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
