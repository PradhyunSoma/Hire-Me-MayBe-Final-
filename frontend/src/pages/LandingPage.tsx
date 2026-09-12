import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BrainCircuit, ClipboardList, FileSearch, Play, Sparkles, Target, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { screeningsApi } from "@/api/screenings";
import { Separator } from "@/components/ui/separator";

const METHOD_STEPS = [
  { icon: ClipboardList, title: "Job Description", desc: "Upload the JD to drive the shortlist." },
  { icon: Target, title: "Requirement Atoms", desc: "Broken into must-have, preferred, nice-to-have." },
  { icon: BrainCircuit, title: "Keyword + Semantic", desc: "BM25 + MiniLM with weighted fusion." },
  { icon: FileSearch, title: "Evidence", desc: "Resume chunks with page references." },
  { icon: Sparkles, title: "Explainable Ranking", desc: "Know why every candidate ranks." },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { data: screenings = [] } = useQuery({
    queryKey: ["screenings"],
    queryFn: () => screeningsApi.list(),
  });

  const totals = screenings.reduce(
    (acc, s) => {
      acc.candidates += s.candidateCount;
      if (s.status === "completed") acc.completed++;
      return acc;
    },
    { candidates: 0, completed: 0 }
  );

  return (
    <div className="space-y-16">
      <section className="relative">
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-32 left-1/2 h-72 w-[60rem] -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute -bottom-24 right-10 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center pt-6">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Hackathon-ready · BM25 + MiniLM · Evidence-backed
            </div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
              Find the right hire.
              <br />
              <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Know why.
              </span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              An explainable resume ranking engine that combines keyword retrieval, semantic matching,
              and evidence-backed scoring to build better shortlists — no black-box scores, no LLM guesswork.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="xl" variant="gradient" onClick={() => navigate("/screening/new")}>
                <Play className="mr-2 h-5 w-5" />
                Start Screening
              </Button>
              <Button size="xl" variant="outline" onClick={() => navigate("/screening/demo/results")}>
                View Demo Results
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground pt-2">
              <Badge variant="outline" className="gap-1">
                <Zap className="h-3 w-3" /> Deterministic matching
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Target className="h-3 w-3" /> Must-have handling
              </Badge>
              <Badge variant="outline" className="gap-1">
                <FileSearch className="h-3 w-3" /> Evidence snippets
              </Badge>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border/60 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
              <div className="border-b bg-muted/40 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BrainCircuit className="h-5 w-5 text-primary" />
                  <span className="font-semibold text-sm">Screening · Senior Frontend Engineer</span>
                </div>
                <Badge variant="success">18 candidates · 12 requirements</Badge>
              </div>
              <div className="p-5 space-y-3">
                {[
                  { name: "Alex Johnson", score: 91, rank: 1, mh: "5/5", status: "Strong Match" },
                  { name: "Priya Patel", score: 86, rank: 2, mh: "5/5", status: "Good Match" },
                  { name: "Jordan Lee", score: 83, rank: 3, mh: "4/5", status: "Good Match" },
                ].map((c) => (
                  <div key={c.rank} className="flex items-center gap-3 rounded-xl border bg-background/60 p-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                      {c.rank}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium truncate">{c.name}</span>
                        <span className="font-bold tabular-nums text-primary">{c.score}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground mt-0.5">
                        <span>Must-Haves: {c.mh}</span>
                        <Badge variant="muted" className="text-[10px]">{c.status}</Badge>
                      </div>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-primary/5 p-3">
                    <div className="text-muted-foreground">BM25 Keyword</div>
                    <div className="font-bold text-sm mt-0.5">46% of final score</div>
                  </div>
                  <div className="rounded-lg bg-accent/10 p-3">
                    <div className="text-muted-foreground">MiniLM Semantic</div>
                    <div className="font-bold text-sm mt-0.5">54% of final score</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="text-center space-y-2 max-w-2xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
          <p className="text-muted-foreground">
            A transparent, multi-stage matching pipeline — not an opaque LLM score.
          </p>
        </div>

        <div className="relative grid grid-cols-1 md:grid-cols-5 gap-4">
          {METHOD_STEPS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="relative">
                <Card className="h-full border-border/60 hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/15 to-accent/15 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <Badge variant="outline" className="font-mono">0{i + 1}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-1">
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                  </CardContent>
                </Card>
                {i < METHOD_STEPS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 z-10">
                    <ArrowRight className="h-5 w-5 text-border" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-primary to-accent text-white border-0 shadow-xl shadow-primary/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-white/80 text-xs uppercase tracking-wide mb-1">
              <Users className="h-3.5 w-3.5" /> Total Screened
            </div>
            <div className="text-5xl font-bold tabular-nums">{totals.candidates || 55}</div>
            <p className="text-sm text-white/80 mt-2">Candidates evaluated across {screenings.length || 3} screening runs.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <ClipboardList className="h-3.5 w-3.5" /> Completed
            </div>
            <div className="text-5xl font-bold tabular-nums">{totals.completed || 3}</div>
            <p className="text-sm text-muted-foreground mt-2">Full screening runs with ranked, explainable results.</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-muted-foreground text-xs uppercase tracking-wide mb-1">
              <Zap className="h-3.5 w-3.5" /> Ready in
            </div>
            <div className="text-5xl font-bold tabular-nums">~90s</div>
            <p className="text-sm text-muted-foreground mt-2">Typical processing for 18 resumes on a single machine.</p>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Recent Screenings</h2>
            <p className="text-muted-foreground text-sm mt-1">Your last screening runs with ranked candidate shortlists.</p>
          </div>
          <Button asChild variant="outline">
            <Link to="/screening/new">
              Start a new screening
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {screenings.map((s) => (
            <Card key={s.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-lg truncate">{s.jobTitle || "Untitled Screening"}</CardTitle>
                    <CardDescription className="truncate">{s.jobFileName}</CardDescription>
                  </div>
                  <Badge variant={s.status === "completed" ? "success" : "info"}>
                    {s.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="text-xs text-muted-foreground">Candidates</div>
                    <div className="font-bold text-lg tabular-nums">{s.candidateCount}</div>
                  </div>
                  <div className="rounded-lg bg-muted/50 p-2.5">
                    <div className="text-xs text-muted-foreground">Requirements</div>
                    <div className="font-bold text-lg tabular-nums">{s.requirementCount}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{new Date(s.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</span>
                  {s.status === "completed" && (
                    <Button asChild size="sm" variant="default" className="h-8">
                      <Link to={`/screening/${s.id}/results`}>
                        View Results
                        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                      </Link>
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center pt-2">
          <Button asChild size="lg" variant="gradient">
            <Link to="/screening/new">
              <Play className="mr-2 h-4 w-4" />
              Quick Start Screening
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
