import { cn } from "@/lib/utils";
import type { ProcessingStage } from "@/types";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

const STAGES: { stage: ProcessingStage; label: string; icon: string }[] = [
  { stage: "uploading", label: "Documents uploaded", icon: "📤" },
  { stage: "extracting_text", label: "Extracting text", icon: "📝" },
  { stage: "decomposing_requirements", label: "Decomposing requirements", icon: "🧩" },
  { stage: "keyword_matching", label: "Running keyword matching", icon: "🔎" },
  { stage: "semantic_matching", label: "Running semantic matching", icon: "🧠" },
  { stage: "calculating_scores", label: "Calculating scores", icon: "🧮" },
  { stage: "ranking_candidates", label: "Ranking candidates", icon: "🏆" },
  { stage: "collecting_evidence", label: "Collecting evidence", icon: "📄" },
  { stage: "finalizing_results", label: "Finalizing results", icon: "✅" },
];

function stageIndex(stage?: ProcessingStage) {
  if (!stage) return -1;
  return STAGES.findIndex((s) => s.stage === stage);
}

export function ProcessingPipeline({
  stage,
  progress,
  status,
  candidateCount,
  requirementCount,
  error,
}: {
  stage: ProcessingStage;
  progress: number;
  status: "queued" | "processing" | "completed" | "failed";
  candidateCount?: number;
  requirementCount?: number;
  error?: string;
}) {
  const current = stageIndex(stage);

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Stat label="Candidates" value={candidateCount?.toString() || "–"} accent />
          <Stat label="Requirements" value={requirementCount?.toString() || "–"} />
          <Stat
            label="Progress"
            value={`${Math.round(progress)}%`}
            statusColor={
              status === "failed" ? "text-destructive" : status === "completed" ? "text-emerald-500" : "text-primary"
            }
          />
          <Stat
            label="Status"
            valueNode={
              <Badge
                variant={
                  status === "completed"
                    ? "success"
                    : status === "failed"
                    ? "destructive"
                    : status === "queued"
                    ? "warning"
                    : "info"
                }
                className="text-xs uppercase tracking-wide"
              >
                {status}
              </Badge>
            }
          />
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="capitalize font-medium">
              {status === "failed" ? "Processing failed" : status === "completed" ? "Processing complete" : STAGES[current]?.label || "Initializing…"}
            </span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        {error && (
          <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
      </div>

      <div className="rounded-2xl border bg-card p-6 shadow-sm">
        <h3 className="font-semibold mb-5 flex items-center gap-2">
          <Loader2 className={cn("h-4 w-4", status === "processing" && "animate-spin")} />
          Pipeline Stages
        </h3>
        <ol className="relative border-l-2 border-border/60 ml-3 space-y-6">
          {STAGES.map((s, i) => {
            const done = i < current || status === "completed";
            const active = i === current && status === "processing";
            return (
              <li key={s.stage} className="ml-6">
                <span
                  className={cn(
                    "absolute -left-[13px] flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                    done
                      ? "bg-emerald-500 text-white border-emerald-500"
                      : active
                      ? "bg-primary text-white border-primary animate-pulse"
                      : "bg-background text-muted-foreground border-border"
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  ) : active ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </span>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{s.icon}</span>
                    <span
                      className={cn(
                        "text-sm font-medium transition-colors",
                        done ? "text-foreground" : active ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "text-[10px] uppercase tracking-wide font-semibold",
                      done
                        ? "text-emerald-600 dark:text-emerald-400"
                        : active
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {done ? "Done" : active ? "Active" : "Pending"}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  valueNode,
  accent,
  statusColor,
}: {
  label: string;
  value?: string;
  valueNode?: React.ReactNode;
  accent?: boolean;
  statusColor?: string;
}) {
  return (
    <div className="rounded-xl bg-muted/40 p-4">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium mb-1">{label}</div>
      <div className={cn("text-2xl font-bold tabular-nums", accent && "text-primary", statusColor)}>
        {valueNode || value}
      </div>
    </div>
  );
}
