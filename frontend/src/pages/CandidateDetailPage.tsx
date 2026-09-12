import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { candidatesApi, counterfactualApi, screeningsApi } from "@/api/screenings";
import { Avatar, ScoreRing, StatusBadge, ScoreBar } from "@/components/shared/Visualization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { CandidateRadarChart } from "@/components/charts/ScoreCharts";
import { RequirementList } from "@/components/candidates/RequirementCard";
import {
  ArrowLeft,
  ArrowRight,
  GitCompare,
  Loader2,
  Sparkles,
  TrendingUp,
  Wand2,
} from "lucide-react";
import type { Candidate, RequirementImportance } from "@/types";
import { scoreToPercent } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CandidateDetailPage() {
  const { id = "screening-demo-1", candidateId = "candidate-1" } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [cfScenario, setCfScenario] = useState<"add_skill" | "remove_missing" | "boost_experience">("add_skill");
  const [cfOpen, setCfOpen] = useState(false);

  const { data: candidate, isLoading } = useQuery({
    queryKey: ["candidate", id, candidateId],
    queryFn: async () => {
      const [c, results] = await Promise.all([
        candidatesApi.detail(id, candidateId),
        qc.ensureQueryData({
          queryKey: ["screening-results", id],
          queryFn: () => screeningsApi.results(id),
        }),
      ]);
      if (c) return c;
      return results.candidates.find((x) => x.id === candidateId) || results.candidates[0];
    },
    staleTime: 60_000,
  });

  const { data: cf, refetch: runCf } = useQuery({
    queryKey: ["cf", id, candidateId, cfScenario, cfOpen],
    queryFn: () => counterfactualApi.analyze(id, candidateId, cfScenario),
    enabled: false,
  });

  if (isLoading || !candidate) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Loading candidate analysis…
        </div>
      </div>
    );
  }

  const mh = candidate.matches.filter((m) => m.importance === "must_have" as RequirementImportance);
  const mhMet = mh.filter((m) => m.status === "matched").length;
  const matched = candidate.matches.filter((m) => m.status === "matched");
  const partial = candidate.matches.filter((m) => m.status === "partial");
  const missing = candidate.matches.filter((m) => m.status === "missing");

  const cat = (t: string) => candidate.matches.filter((m) => m.type === t);
  const avg = (arr: number[]) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
  const cats = ["technical", "experience", "domain", "soft_skill"] as const;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <Link to={`/screening/${id}/results`} className="text-xs text-muted-foreground hover:text-foreground">
          Results
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs font-medium">{candidate.name}</span>
      </div>

      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b border-border/60">
          <CardContent className="pt-6 pb-6">
            <div className="flex flex-col md:flex-row md:items-center gap-6 justify-between">
              <div className="flex items-start gap-5">
                <div className="relative">
                  <Avatar name={candidate.name} size="xl" />
                  <div className="absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full bg-card border text-xs font-bold shadow">
                    #{candidate.rank}
                  </div>
                </div>
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-3xl font-bold tracking-tight">{candidate.name}</h1>
                    <StatusBadge status={candidate.status} />
                  </div>
                  {candidate.email && (
                    <div className="text-sm text-muted-foreground">{candidate.email}</div>
                  )}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="outline" className="gap-1">
                      <Sparkles className="h-3 w-3" /> Rank #{candidate.rank}
                    </Badge>
                    <Badge variant="success" className="gap-1">
                      Must-Haves {mhMet}/{mh.length}
                    </Badge>
                    {candidate.fileName && (
                      <Badge variant="muted" className="max-w-[240px] truncate">
                        {candidate.fileName}
                      </Badge>
                    )}
                  </div>
                  {candidate.topReason && (
                    <div className="text-sm text-muted-foreground italic border-l-2 border-primary/40 pl-3 mt-2 max-w-xl leading-relaxed">
                      "{candidate.topReason}"
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <ScoreRing score={candidate.overallScore} size={120} stroke={10} label="OVERALL" />
                <div className="grid grid-cols-2 gap-3 min-w-[240px]">
                  <StatScore label="Technical" value={candidate.technicalScore} />
                  <StatScore label="Experience" value={candidate.experienceScore} />
                  <StatScore label="Domain" value={candidate.domainScore} />
                  <StatScore label="Soft Skills" value={candidate.softSkillScore} />
                  <StatScore label="Keyword" value={candidate.keywordScore} />
                  <StatScore label="Semantic" value={candidate.semanticScore} />
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild variant="outline" size="sm">
                <Link to={`/screening/${id}/compare?c=${candidate.id}`}>
                  <GitCompare className="mr-2 h-4 w-4" /> Compare this candidate
                </Link>
              </Button>
              <Dialog open={cfOpen} onOpenChange={setCfOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" variant="default">
                    <Wand2 className="mr-2 h-4 w-4" /> Counterfactual: “What if…”
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Wand2 className="h-5 w-5 text-primary" /> Counterfactual Analysis
                    </DialogTitle>
                    <DialogDescription>
                      How much would this candidate improve if a gap were closed?
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3 py-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium">Scenario</label>
                      <Select value={cfScenario} onValueChange={(v: any) => setCfScenario(v)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add_skill">Add a missing key skill</SelectItem>
                          <SelectItem value="remove_missing">Address all missing must-haves</SelectItem>
                          <SelectItem value="boost_experience">Strengthen experience evidence</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={() => runCf()} disabled={cf?.originalScore !== undefined && false}>
                      <TrendingUp className="mr-2 h-4 w-4" />
                      Run scenario
                    </Button>
                    {cf && (
                      <div className="rounded-xl border bg-muted/30 p-4 space-y-2 text-sm">
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Original</span>
                          <span className="font-bold tabular-nums">{cf.originalScore}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Projected</span>
                          <span className="font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                            {cf.newScore} (+{cf.delta})
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">Rank impact</span>
                          <span className="font-bold tabular-nums">
                            #{cf.originalRank} → #{cf.newRank}
                          </span>
                        </div>
                        <Separator />
                        <p className="text-xs text-muted-foreground leading-relaxed">{cf.explanation}</p>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCfOpen(false)}>Close</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Score Breakdown</CardTitle>
            <CardDescription>How this candidate scores per dimension.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CandidateRadarChart candidate={candidate} />
              <div className="space-y-3">
                {cats.map((c) => {
                  const arr = cat(c);
                  const kw = avg(arr.map((x) => x.keywordScore));
                  const sm = avg(arr.map((x) => x.semanticScore));
                  const cmb = avg(arr.map((x) => x.combinedScore));
                  return (
                    <div key={c}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium capitalize">
                          {c.replace("_", " ")} <span className="text-muted-foreground font-normal">({arr.length})</span>
                        </span>
                        <span className="tabular-nums font-bold">{scoreToPercent(cmb)}</span>
                      </div>
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-secondary">
                        <div className="h-full bg-sky-500" style={{ width: `${Math.round(kw * 100 * 0.55)}%` }} />
                        <div className="h-full bg-violet-500" style={{ width: `${Math.round(sm * 100 * 0.45)}%` }} />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground mt-0.5">
                        <span>KW {scoreToPercent(kw)}</span>
                        <span>SM {scoreToPercent(sm)}</span>
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <div className="rounded-lg bg-muted/40 p-3 text-xs space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Must-have coverage</span>
                    <span className="font-semibold">{candidate.mustHaveCoverage}%</span>
                  </div>
                  <ScoreBar value={candidate.mustHaveCoverage} max={100} />
                  <div className="flex justify-between pt-1">
                    <span className="text-muted-foreground">Preferred coverage</span>
                    <span className="font-semibold">{candidate.preferredCoverage}%</span>
                  </div>
                  <ScoreBar value={candidate.preferredCoverage} max={100} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Requirement Summary</CardTitle>
            <CardDescription>{candidate.matches.length} total requirements</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat count={matched.length} label="Matched" variant="success" />
              <Stat count={partial.length} label="Partial" variant="warning" />
              <Stat count={missing.length} label="Missing" variant="destructive" />
            </div>
            <Separator />
            <div>
              <div className="text-xs font-medium mb-2">Top matched</div>
              <div className="flex flex-wrap gap-1.5">
                {matched.slice(0, 8).map((m) => (
                  <Badge key={m.requirementId} variant="success" className="text-[11px]">
                    {m.requirementText}
                  </Badge>
                ))}
                {matched.length === 0 && (
                  <span className="text-xs text-muted-foreground">None</span>
                )}
              </div>
            </div>
            {missing.length > 0 && (
              <div>
                <div className="text-xs font-medium mb-2 text-rose-600 dark:text-rose-400">Missing</div>
                <div className="flex flex-wrap gap-1.5">
                  {missing.slice(0, 8).map((m) => (
                    <Badge key={m.requirementId} variant="destructive" className="text-[11px]">
                      {m.requirementText}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            <Separator />
            <Button asChild variant="outline" size="sm" className="w-full">
              <Link to={`/screening/${id}/compare?c=${candidate.id}`}>
                <GitCompare className="mr-2 h-4 w-4" />
                Compare with others
                <ArrowRight className="ml-auto h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-primary to-accent" />
          <h2 className="text-xl font-bold">Requirement Analysis</h2>
          <Badge variant="muted">Evidence-backed</Badge>
        </div>
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">All ({candidate.matches.length})</TabsTrigger>
            <TabsTrigger value="matched">Matched ({matched.length})</TabsTrigger>
            <TabsTrigger value="partial">Partial ({partial.length})</TabsTrigger>
            <TabsTrigger value="missing">Missing ({missing.length})</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="mt-5">
            <RequirementList matches={candidate.matches} />
          </TabsContent>
          <TabsContent value="matched" className="mt-5">
            <RequirementList matches={matched} />
          </TabsContent>
          <TabsContent value="partial" className="mt-5">
            <RequirementList matches={partial} />
          </TabsContent>
          <TabsContent value="missing" className="mt-5">
            <RequirementList matches={missing} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function StatScore({ label, value }: { label: string; value: number }) {
  const color =
    value >= 80 ? "text-emerald-500" : value >= 60 ? "text-amber-500" : "text-rose-500";
  return (
    <div className="rounded-xl bg-muted/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-xl font-bold tabular-nums", color)}>{value}</div>
    </div>
  );
}

function Stat({
  count,
  label,
  variant,
}: {
  count: number;
  label: string;
  variant: "success" | "warning" | "destructive";
}) {
  const cls =
    variant === "success"
      ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : variant === "warning"
      ? "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
      : "bg-rose-100 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400";
  return (
    <div className={cn("rounded-xl p-3", cls)}>
      <div className="text-2xl font-bold tabular-nums">{count}</div>
      <div className="text-[10px] uppercase tracking-wide font-medium opacity-80">{label}</div>
    </div>
  );
}

import { cn } from "@/lib/utils";
