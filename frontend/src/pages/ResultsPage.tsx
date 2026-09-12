import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { screeningsApi } from "@/api/screenings";
import { TopThreeCandidates } from "@/components/screening/TopThreeCandidates";
import { RankingTable } from "@/components/screening/RankingTable";
import {
  MatchCompositionChart,
  RequirementCoverageChart,
  ScoreDistributionChart,
  TopTenBarsChart,
} from "@/components/charts/ScoreCharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BrainCircuit,
  GitCompare,
  Lightbulb,
  Loader2,
  ShieldAlert,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ResultsPage() {
  const { id = "screening-demo-1" } = useParams();
  const navigate = useNavigate();

  const { data: results, isLoading } = useQuery({
    queryKey: ["screening-results", id],
    queryFn: () => screeningsApi.results(id),
    staleTime: 60_000,
  });

  if (isLoading || !results) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Loading results…
        </div>
      </div>
    );
  }

  const onCompare = (ids: string[]) => {
    const params = new URLSearchParams(ids.map((i) => ["c", i]));
    navigate(`/screening/${id}/compare?${params.toString()}`);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="muted" className="uppercase tracking-wide">Step 3 of 3</Badge>
            <Badge variant="outline" className="gap-1">
              <BrainCircuit className="h-3 w-3" /> BM25 + MiniLM · Evidence-backed
            </Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Screening Results
            <span className="text-muted-foreground font-normal text-xl ml-2">· {results.jobTitle || id}</span>
          </h1>
          <p className="text-muted-foreground flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              <strong className="text-foreground">{results.candidatesCount}</strong> candidates
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              <strong className="text-foreground">{results.requirementsCount}</strong> requirements
            </span>
            <span className="text-xs">· Generated {new Date(results.generatedAt).toLocaleString()}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to={`/screening/${id}/insights`}>
              <Lightbulb className="mr-2 h-4 w-4" />
              JD Insights
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/screening/${id}/compare`}>
              <GitCompare className="mr-2 h-4 w-4" />
              Compare
            </Link>
          </Button>
          <Button asChild size="sm" variant="default">
            <Link to="/screening/new">
              New Screening
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <div className="h-6 w-1 rounded-full bg-gradient-to-b from-amber-400 to-orange-500" />
          <h2 className="text-xl font-bold">Top 3 Candidates</h2>
          <Badge variant="warning" className="ml-1">Explainable rankings</Badge>
        </div>
        <TopThreeCandidates screeningId={id} candidates={results.candidates} />
      </section>

      <Tabs defaultValue="ranking" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ranking">Ranking Table</TabsTrigger>
          <TabsTrigger value="charts">Score Analytics</TabsTrigger>
          <TabsTrigger value="coverage">Requirement Coverage</TabsTrigger>
        </TabsList>

        <TabsContent value="ranking" className="space-y-5">
          <RankingTable
            screeningId={id}
            candidates={results.candidates}
            onCompare={onCompare}
          />
        </TabsContent>

        <TabsContent value="charts" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <ScoreDistributionChart candidates={results.candidates} />
            <MatchCompositionChart results={results} />
          </div>
          <TopTenBarsChart candidates={results.candidates} />
        </TabsContent>

        <TabsContent value="coverage" className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <RequirementCoverageChart results={results} />
            </div>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Coverage Snapshot
                </CardTitle>
                <CardDescription>Requirement hits at a glance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(results.requirementCoverage).slice(0, 6).map(([name, v]) => {
                  const pct = Math.round((v.matched / v.total) * 100);
                  return (
                    <div key={name}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium truncate">{name}</span>
                        <span className="tabular-nums">{pct}%</span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-primary to-accent"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
                <Separator />
                <div className="rounded-xl bg-muted/40 p-3 space-y-1 text-xs">
                  <p className="text-muted-foreground">Tip:</p>
                  <p className="leading-relaxed">
                    Requirements under 40% coverage are good candidates to review — they may be unrealistic,
                    or candidates need clearer signalling on the JD.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <div className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Methodology — Know Why</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Every score you see is the weighted combination of <strong>BM25 keyword retrieval</strong> and{" "}
              <strong>all-MiniLM-L6-v2 semantic similarity</strong>, with per-requirement evidence from the resume
              text (including page numbers). Technical requirements lean keyword-heavy (55/45), experience and
              soft-skill requirements lean semantic-heavy (25/75). Must-have gaps reduce the final score
              directly. No LLM ranking. No opaque numbers.
            </p>
            <div className="pt-2 flex flex-wrap gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to={`/screening/${id}/insights`}>
                  <Lightbulb className="mr-2 h-4 w-4" />
                  Check JD Quality / Bias
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
