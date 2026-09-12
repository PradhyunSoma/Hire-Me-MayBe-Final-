import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { comparisonApi, screeningsApi } from "@/api/screenings";
import type { Candidate } from "@/types";
import { Avatar, ScoreRing, StatusBadge } from "@/components/shared/Visualization";
import { CandidateRadarChart, TopTenBarsChart } from "@/components/charts/ScoreCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ArrowRight, GitCompare, PlusCircle } from "lucide-react";
import { scoreToPercent } from "@/lib/utils";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ComparePage() {
  const { id = "screening-demo-1" } = useParams();
  const navigate = useNavigate();
  const [sp, setSp] = useSearchParams();
  const initial = sp.getAll("c");

  const { data: results } = useQuery({
    queryKey: ["screening-results", id],
    queryFn: () => screeningsApi.results(id),
    staleTime: 60_000,
  });

  const candidatePool = results?.candidates || [];
  const [a, setA] = useState<string>(initial[0] || candidatePool[0]?.id || "candidate-1");
  const [b, setB] = useState<string>(initial[1] || candidatePool[1]?.id || "candidate-2");
  const [c, setC] = useState<string>(initial[2] || candidatePool[2]?.id || "");

  const selectedIds = [a, b, c].filter(Boolean);

  const { data: comparison } = useQuery({
    queryKey: ["comparison", id, ...selectedIds],
    queryFn: () => comparisonApi.compare(id, selectedIds),
    enabled: selectedIds.length >= 2,
  });

  const list: Candidate[] = comparison?.candidates.length
    ? comparison.candidates
    : candidatePool.filter((x) => selectedIds.includes(x.id));

  function persist(ids: string[]) {
    const p = new URLSearchParams(ids.map((x) => ["c", x]));
    setSp(p, { replace: true });
  }

  const aC = candidatePool.find((x) => x.id === a);
  const bC = candidatePool.find((x) => x.id === b);
  const cC = c ? candidatePool.find((x) => x.id === c) : undefined;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button variant="ghost" size="sm" className="h-6 px-2" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-3 w-3 mr-1" /> Back
            </Button>
            <span>·</span>
            <Link to={`/screening/${id}/results`} className="hover:text-foreground">Results</Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
            <GitCompare className="h-7 w-7 text-primary" />
            Candidate Comparison
          </h1>
          <p className="text-muted-foreground">
            Compare scores, requirement coverage, and evidence side-by-side.
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to={`/screening/${id}/candidate/${a}`}>
            View top candidate analysis
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Select Candidates</CardTitle>
          <CardDescription>Pick 2–3 candidates to compare.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Select
              value={a}
              onValueChange={(v) => {
                setA(v);
                persist([v, b, c].filter(Boolean));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Candidate A" />
              </SelectTrigger>
              <SelectContent>
                {candidatePool.map((cand) => (
                  <SelectItem key={cand.id} value={cand.id}>
                    #{cand.rank} — {cand.name} · {cand.overallScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={b}
              onValueChange={(v) => {
                setB(v);
                persist([a, v, c].filter(Boolean));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Candidate B" />
              </SelectTrigger>
              <SelectContent>
                {candidatePool.map((cand) => (
                  <SelectItem key={cand.id} value={cand.id}>
                    #{cand.rank} — {cand.name} · {cand.overallScore}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              {!cC && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 z-10 h-7"
                  onClick={() => {
                    const next = candidatePool.find((x) => ![a, b].includes(x.id));
                    if (next) {
                      setC(next.id);
                      persist([a, b, next.id]);
                    }
                  }}
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1" /> Add 3rd
                </Button>
              )}
              <Select
                value={c || ""}
                onValueChange={(v) => {
                  setC(v);
                  persist([a, b, v].filter(Boolean));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Candidate C (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">— Skip —</SelectItem>
                  {candidatePool.map((cand) => (
                    <SelectItem key={cand.id} value={cand.id}>
                      #{cand.rank} — {cand.name} · {cand.overallScore}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {list.length >= 2 && (
        <>
          <section className="space-y-4">
            <h2 className="text-xl font-bold">Overall Scores</h2>
            <div className={cC ? "grid grid-cols-1 md:grid-cols-3 gap-4" : "grid grid-cols-1 md:grid-cols-2 gap-4"}>
              {[aC, bC, cC].filter(Boolean).map((cand, i) => cand && (
                <Card key={cand.id} className={i === 0 ? "ring-2 ring-primary/30" : ""}>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <Avatar name={cand.name} size="lg" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{cand.name}</h3>
                          <Badge variant="outline">#{cand.rank}</Badge>
                        </div>
                        <StatusBadge status={cand.status} />
                      </div>
                      <ScoreRing score={cand.overallScore} size={80} stroke={7} />
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-2 gap-2 text-center text-xs">
                      <MiniStat label="Technical" v={cand.technicalScore} />
                      <MiniStat label="Experience" v={cand.experienceScore} />
                      <MiniStat label="Domain" v={cand.domainScore} />
                      <MiniStat label="Soft" v={cand.softSkillScore} />
                      <MiniStat label="Keyword" v={cand.keywordScore} />
                      <MiniStat label="Semantic" v={cand.semanticScore} />
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button asChild size="sm" variant="default" className="flex-1">
                        <Link to={`/screening/${id}/candidate/${cand.id}`}>View Analysis</Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Radar Comparison</CardTitle>
                <CardDescription>Dimension-level side-by-side.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue={list[0]?.id}>
                  <TabsList className="mb-3">
                    {list.map((cand) => (
                      <TabsTrigger key={cand.id} value={cand.id}>{cand.name.split(" ")[0]}</TabsTrigger>
                    ))}
                  </TabsList>
                  {list.map((cand) => (
                    <TabsContent key={cand.id} value={cand.id}>
                      <CandidateRadarChart candidate={cand} />
                    </TabsContent>
                  ))}
                </Tabs>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Score per dimension</h4>
                    <div className="space-y-3">
                      {(["technicalScore","experienceScore","domainScore","softSkillScore","keywordScore","semanticScore","mustHaveCoverage"] as const).map((k) => {
                        const labelMap: Record<string, string> = {
                          technicalScore: "Technical",
                          experienceScore: "Experience",
                          domainScore: "Domain",
                          softSkillScore: "Soft Skills",
                          keywordScore: "Keyword",
                          semanticScore: "Semantic",
                          mustHaveCoverage: "Must-Have Coverage",
                        };
                        const values = list.map((c) => ({ cand: c, v: scoreToPercent(c[k] as number) }));
                        const max = Math.max(...values.map((x) => x.v), 1);
                        return (
                          <div key={k}>
                            <div className="text-xs font-medium mb-1 flex justify-between">
                              <span>{labelMap[k]}</span>
                              <span className="text-muted-foreground tabular-nums">
                                {values.map((x) => `${x.cand.name.split(" ")[0]} ${x.v}`).join(" · ")}
                              </span>
                            </div>
                            <div className="space-y-1">
                              {values.map(({ cand, v }) => (
                                <div key={cand.id} className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground w-14 truncate">
                                    {cand.name.split(" ")[0]}
                                  </span>
                                  <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{
                                        width: `${(v / max) * 100}%`,
                                        background:
                                          cand.id === list[0].id
                                            ? "#3b82f6"
                                            : cand.id === list[1].id
                                            ? "#8b5cf6"
                                            : "#10b981",
                                      }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold mb-3">Requirement coverage counts</h4>
                    <div className="space-y-2 text-sm">
                      {list.map((cand) => {
                        const m = cand.matches.filter((x) => x.status === "matched").length;
                        const p = cand.matches.filter((x) => x.status === "partial").length;
                        const miss = cand.matches.filter((x) => x.status === "missing").length;
                        return (
                          <div key={cand.id} className="rounded-xl border bg-card p-3">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{cand.name}</span>
                              <Badge variant="outline">#{cand.rank} · {cand.overallScore}</Badge>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-center text-xs">
                              <div className="rounded-md bg-emerald-50 dark:bg-emerald-500/10 py-1.5">
                                <div className="font-bold text-emerald-600 dark:text-emerald-400">{m}</div>
                                <div className="text-[10px] opacity-80 uppercase">Matched</div>
                              </div>
                              <div className="rounded-md bg-amber-50 dark:bg-amber-500/10 py-1.5">
                                <div className="font-bold text-amber-600 dark:text-amber-400">{p}</div>
                                <div className="text-[10px] opacity-80 uppercase">Partial</div>
                              </div>
                              <div className="rounded-md bg-rose-50 dark:bg-rose-500/10 py-1.5">
                                <div className="font-bold text-rose-600 dark:text-rose-400">{miss}</div>
                                <div className="text-[10px] opacity-80 uppercase">Missing</div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 rounded-xl bg-muted/40 p-3 text-xs text-muted-foreground leading-relaxed">
                      Use this view to trade off candidates: is a technical gap worth a stronger
                      experience fit? The evidence on the candidate analysis page supports your call.
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          <TopTenBarsChart candidates={candidatePool} />
        </>
      )}
    </div>
  );
}

function MiniStat({ label, v }: { label: string; v: number }) {
  return (
    <div className="rounded-lg bg-muted/40 py-2">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="font-bold tabular-nums">{v}</div>
    </div>
  );
}
