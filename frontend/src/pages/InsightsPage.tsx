import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { biasApi } from "@/api/screenings";
import type { BiasInsight } from "@/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  FileCheck2,
  Gauge,
  Lightbulb,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import { ScoreRing } from "@/components/shared/Visualization";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const severityBadge: Record<BiasInsight["severity"], { label: string; variant: "success" | "warning" | "destructive" | "info" }> = {
  low: { label: "Low", variant: "info" },
  medium: { label: "Medium", variant: "warning" },
  high: { label: "High", variant: "destructive" },
};

const typeMeta: Record<BiasInsight["type"], { icon: any; label: string; color: string }> = {
  gender: { icon: Users, label: "Gender-coded", color: "text-rose-500 bg-rose-50 dark:bg-rose-500/10" },
  age: { icon: Eye, label: "Age signaling", color: "text-amber-500 bg-amber-50 dark:bg-amber-500/10" },
  ability: { icon: ShieldCheck, label: "Accessibility", color: "text-sky-500 bg-sky-50 dark:bg-sky-500/10" },
  ethnicity: { icon: Users, label: "Ethnicity cues", color: "text-fuchsia-500 bg-fuchsia-50 dark:bg-fuchsia-500/10" },
  length: { icon: FileCheck2, label: "JD length", color: "text-violet-500 bg-violet-50 dark:bg-violet-500/10" },
  structure: { icon: ShieldAlert, label: "Structure", color: "text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10" },
};

export default function InsightsPage() {
  const { id = "screening-demo-1" } = useParams();
  const navigate = useNavigate();

  const { data: report, isLoading } = useQuery({
    queryKey: ["bias-report", id],
    queryFn: () => biasApi.get(id),
    staleTime: 60_000,
  });

  if (isLoading || !report) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          Analyzing JD quality and bias signals…
        </div>
      </div>
    );
  }

  const scoreColor =
    report.overallBiasScore <= 20 ? "text-emerald-500" : report.overallBiasScore <= 45 ? "text-amber-500" : "text-rose-500";

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <span>·</span>
        <Link to={`/screening/${id}/results`} className="hover:text-foreground">Results</Link>
        <span>·</span>
        <span>JD Insights</span>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight flex items-center gap-2">
          <Lightbulb className="h-7 w-7 text-amber-500" />
          JD Quality & Bias Insights
        </h1>
        <p className="text-muted-foreground max-w-2xl">
          A fairer shortlist starts with a fairer job description. This scan flags wording,
          length, and structural issues that can deter qualified, diverse candidates — before
          you post.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-1 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20">
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <div className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
              Overall Bias Score
            </div>
            <ScoreRing
              score={100 - report.overallBiasScore}
              size={140}
              stroke={12}
              label={report.overallBiasScore <= 20 ? "LOW RISK" : report.overallBiasScore <= 45 ? "MODERATE" : "HIGH RISK"}
            />
            <div className={cn("text-2xl font-bold tabular-nums", scoreColor)}>
              {report.overallBiasScore} / 100
            </div>
            <p className="text-xs text-muted-foreground max-w-[260px] leading-relaxed">
              Lower is better. This score aggregates severity of all flagged issues.
            </p>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Severity Breakdown</CardTitle>
            <CardDescription>Flags grouped by impact.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <SeverityCell count={report.insights.filter((i) => i.severity === "high").length} variant="high" />
              <SeverityCell count={report.insights.filter((i) => i.severity === "medium").length} variant="medium" />
              <SeverityCell count={report.insights.filter((i) => i.severity === "low").length} variant="low" />
            </div>
            <Separator className="my-4" />
            <div>
              <div className="text-xs font-medium mb-2 flex items-center gap-1.5">
                <Gauge className="h-3.5 w-3.5" /> Severity distribution
              </div>
              <div className="flex h-3 w-full rounded-full overflow-hidden bg-secondary">
                {(["high", "medium", "low"] as const).map((sev) => {
                  const n = report.insights.filter((i) => i.severity === sev).length;
                  const total = report.insights.length || 1;
                  const pct = (n / total) * 100;
                  const bg =
                    sev === "high" ? "bg-rose-500" : sev === "medium" ? "bg-amber-500" : "bg-sky-500";
                  return <div key={sev} className={bg} style={{ width: `${pct}%` }} />;
                })}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-2 text-xs text-muted-foreground">
                {(["high", "medium", "low"] as const).map((s) => (
                  <div key={s} className="flex items-center gap-1.5">
                    <span className={cn("h-2 w-2 rounded-full",
                      s === "high" ? "bg-rose-500" : s === "medium" ? "bg-amber-500" : "bg-sky-500"
                    )} />
                    <span className="capitalize">{s}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" /> Detected Signals
          </CardTitle>
          <CardDescription>
            {report.insights.length} issue{report.insights.length === 1 ? "" : "s"} detected · review and rewrite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">All ({report.insights.length})</TabsTrigger>
              <TabsTrigger value="high">High ({report.insights.filter((i) => i.severity === "high").length})</TabsTrigger>
              <TabsTrigger value="medium">Medium ({report.insights.filter((i) => i.severity === "medium").length})</TabsTrigger>
              <TabsTrigger value="low">Low ({report.insights.filter((i) => i.severity === "low").length})</TabsTrigger>
            </TabsList>
            {(["all", "high", "medium", "low"] as const).map((tab) => {
              const items = tab === "all" ? report.insights : report.insights.filter((i) => i.severity === tab);
              return (
                <TabsContent key={tab} value={tab} className="mt-5 space-y-3">
                  {items.length === 0 && (
                    <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
                      No issues in this category.
                    </div>
                  )}
                  {items.map((ins) => {
                    const tm = typeMeta[ins.type];
                    const Icon = tm.icon;
                    const sb = severityBadge[ins.severity];
                    return (
                      <div key={ins.id} className="rounded-xl border bg-card overflow-hidden">
                        <div className="flex items-start gap-3 p-4">
                          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl shrink-0", tm.color)}>
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <h4 className="font-semibold">{ins.title}</h4>
                              <Badge variant="muted" className="gap-1">
                                <Icon className="h-3 w-3" /> {tm.label}
                              </Badge>
                              <Badge variant={sb.variant}>{sb.label}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground leading-relaxed">{ins.description}</p>
                            {ins.excerpt && (
                              <div className="rounded-lg border-l-4 border-amber-400 bg-amber-50 dark:bg-amber-500/5 dark:border-amber-500/30 p-3 text-xs italic text-foreground/90 leading-relaxed">
                                <span className="text-[10px] font-semibold not-italic uppercase tracking-wide text-amber-700 dark:text-amber-400 mr-2">Excerpt</span>
                                "{ins.excerpt}"
                              </div>
                            )}
                            <div className="rounded-xl border border-emerald-200 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/5 p-3 text-sm leading-relaxed">
                              <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold text-xs uppercase tracking-wide mb-1">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Suggested rewrite
                              </div>
                              {ins.suggestion}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </TabsContent>
              );
            })}
          </Tabs>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-br from-emerald-50 via-background to-sky-50 dark:from-emerald-500/5 dark:to-sky-500/5 border-emerald-200/60 dark:border-emerald-500/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-500" /> Top Recommendations
          </CardTitle>
          <CardDescription>Apply these to lower bias before posting.</CardDescription>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {report.suggestions.map((s, i) => (
              <li key={i} className="flex items-start gap-3 rounded-xl bg-background/70 border p-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 text-white text-xs font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed pt-0.5">{s}</span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-between">
        <Button asChild variant="outline">
          <Link to={`/screening/${id}/results`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Results
          </Link>
        </Button>
        <Button asChild variant="gradient">
          <Link to="/screening/new">
            Run a new screening
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function SeverityCell({
  count,
  variant,
}: {
  count: number;
  variant: "high" | "medium" | "low";
}) {
  const cfg = {
    high: { ring: "ring-rose-200 dark:ring-rose-500/30", txt: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", label: "High Severity" },
    medium: { ring: "ring-amber-200 dark:ring-amber-500/30", txt: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", label: "Medium Severity" },
    low: { ring: "ring-sky-200 dark:ring-sky-500/30", txt: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-500/10", label: "Low Severity" },
  }[variant];

  return (
    <div className={cn("rounded-xl p-4 ring-1", cfg.ring, cfg.bg)}>
      <div className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground">{cfg.label}</div>
      <div className={cn("text-4xl font-bold tabular-nums", cfg.txt)}>{count}</div>
    </div>
  );
}

import { cn } from "@/lib/utils";
