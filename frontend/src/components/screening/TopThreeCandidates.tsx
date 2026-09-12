import { Link } from "react-router-dom";
import type { Candidate, RequirementImportance } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, ScoreRing, StatusBadge } from "@/components/shared/Visualization";
import { ArrowRight, Award, Check, Minus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

function requirem(m: Candidate["matches"][number]) {
  if (m.status === "matched") return { icon: Check, cls: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10" };
  if (m.status === "partial") return { icon: Minus, cls: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10" };
  return { icon: Minus, cls: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10" };
}

const rankStyles = [
  "from-amber-400 via-yellow-500 to-orange-500 text-amber-950",
  "from-slate-300 via-slate-400 to-slate-500 text-slate-900",
  "from-orange-300 via-orange-400 to-amber-600 text-amber-950",
];

export function TopThreeCandidates({
  screeningId,
  candidates,
}: {
  screeningId: string;
  candidates: Candidate[];
}) {
  const top3 = candidates.slice(0, 3);
  if (top3.length === 0) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
      {top3.map((c, i) => {
        const rs = rankStyles[i];
        const mustHaves = c.matches.filter((m) => m.importance === "must_have" as RequirementImportance);
        const mhMet = mustHaves.filter((m) => m.status === "matched").length;
        const topMatched = c.matches
          .filter((m) => m.status === "matched")
          .slice(0, 5);

        return (
          <Card
            key={c.id}
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl",
              i === 0 && "ring-2 ring-primary/30 shadow-lg shadow-primary/10"
            )}
          >
            <div className={cn("absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r", rs.split(" text-")[0])} />
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar name={c.name} size="lg" />
                    <div
                      className={cn(
                        "absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold shadow bg-gradient-to-br",
                        rs
                      )}
                    >
                      <Award className="h-3.5 w-3.5" />
                      <span className="sr-only">#{c.rank}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">#{c.rank}</span>
                      <span className="font-semibold leading-tight">{c.name}</span>
                    </div>
                    <StatusBadge status={c.status} />
                  </div>
                </div>
                <ScoreRing score={c.overallScore} size={64} stroke={6} />
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="flex items-center justify-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <ShieldCheck className="h-3 w-3" /> Must-Haves
                  </div>
                  <div className="font-bold mt-0.5">
                    {mhMet}<span className="text-muted-foreground text-xs font-medium"> / {mustHaves.length}</span>
                  </div>
                </div>
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Technical</div>
                  <div className="font-bold mt-0.5">{c.technicalScore}</div>
                </div>
                <div className="rounded-lg bg-secondary/40 p-2.5">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Experience</div>
                  <div className="font-bold mt-0.5">{c.experienceScore}</div>
                </div>
              </div>

              <div>
                <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-2">
                  Key Requirements
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {topMatched.map((m) => {
                    const ic = requirem(m);
                    const Icon = ic.icon;
                    return (
                      <span
                        key={m.requirementId}
                        className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", ic.cls)}
                      >
                        <Icon className="h-3 w-3" />
                        {m.requirementText}
                      </span>
                    );
                  })}
                  {topMatched.length === 0 && (
                    <span className="text-xs text-muted-foreground">No matched requirements</span>
                  )}
                </div>
              </div>

              {c.topReason && (
                <div className="text-xs text-muted-foreground italic border-l-2 border-primary/40 pl-3">
                  "{c.topReason}"
                </div>
              )}

              <Button asChild variant="default" className="w-full">
                <Link to={`/screening/${screeningId}/candidate/${c.id}`}>
                  View Analysis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
