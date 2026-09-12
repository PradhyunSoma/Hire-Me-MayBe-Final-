import type { Candidate, ScreeningResults } from "@/types";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Pie,
  PieChart,
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { scoreToPercent } from "@/lib/utils";

const COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

function scoreColor(pct: number) {
  if (pct >= 70) return "#10b981";
  if (pct >= 40) return "#f59e0b";
  return "#ef4444";
}

export function ScoreDistributionChart({ candidates }: { candidates: Candidate[] }) {
  const buckets = [
    { name: "90–100", min: 90, color: "#10b981" },
    { name: "80–89", min: 80, color: "#22c55e" },
    { name: "70–79", min: 70, color: "#84cc16" },
    { name: "60–69", min: 60, color: "#f59e0b" },
    { name: "50–59", min: 50, color: "#f97316" },
    { name: "< 50", min: 0, color: "#ef4444" },
  ];
  const data = buckets
    .map((b, i) => {
      const next = i === 0 ? 101 : buckets[i - 1].min;
      return {
        name: b.name,
        count: candidates.filter((c) => c.overallScore >= b.min && c.overallScore < next).length,
        color: b.color,
      };
    })
    .reverse();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Score Distribution</CardTitle>
        <CardDescription>How candidate overall scores are distributed.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[260px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                {data.map((d, i) => (
                  <Cell key={i} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function RequirementCoverageChart({
  results,
  limit = 12,
}: {
  results: ScreeningResults;
  limit?: number;
}) {
  const entries = Object.entries(results.requirementCoverage)
    .slice(0, limit)
    .map(([name, v]) => ({
      name,
      matched: v.matched,
      total: v.total,
      pct: Math.round((v.matched / v.total) * 100),
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Requirement Coverage</CardTitle>
        <CardDescription>How many candidates meet each requirement.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {entries.map((e) => (
          <div key={e.name}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-medium truncate max-w-[60%]">{e.name}</span>
              <span className="tabular-nums text-muted-foreground text-xs">
                {e.matched} / {e.total} <span className="ml-1 font-semibold text-foreground">{e.pct}%</span>
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${e.pct}%`, background: scoreColor(e.pct) }}
              />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function MatchCompositionChart({ results }: { results: ScreeningResults }) {
  const data = [
    { name: "Keyword", value: Math.round(results.matchComposition.keywordContribution * 100) },
    { name: "Semantic", value: Math.round(results.matchComposition.semanticContribution * 100) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Match Composition</CardTitle>
        <CardDescription>Keyword vs semantic contribution to final score.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[240px] flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
                formatter={(v) => [`${v}%`, ""]}
              />
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={4}
                stroke="hsl(var(--background))"
                strokeWidth={4}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={i === 0 ? "#3b82f6" : "#8b5cf6"} />
                ))}
              </Pie>
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <Separator className="my-3" />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>Technical requirements: <span className="font-medium text-foreground">55% keyword · 45% semantic</span></p>
          <p>Experience / soft skills: <span className="font-medium text-foreground">25% keyword · 75% semantic</span></p>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateRadarChart({
  candidate,
  label = true,
}: {
  candidate: Pick<Candidate, "name" | "technicalScore" | "experienceScore" | "domainScore" | "softSkillScore" | "mustHaveCoverage" | "overallScore">;
  label?: boolean;
}) {
  const data = [
    { subject: "Technical", A: candidate.technicalScore, fullMark: 100 },
    { subject: "Experience", A: candidate.experienceScore, fullMark: 100 },
    { subject: "Domain", A: candidate.domainScore, fullMark: 100 },
    { subject: "Soft Skills", A: candidate.softSkillScore, fullMark: 100 },
    { subject: "Must-Have", A: candidate.mustHaveCoverage, fullMark: 100 },
    { subject: "Overall", A: scoreToPercent(candidate.overallScore), fullMark: 100 },
  ];
  return (
    <div className="h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={data} outerRadius="75%">
          <PolarGrid stroke="hsl(var(--border))" />
          <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
          <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
          <Radar name={candidate.name} dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopTenBarsChart({ candidates }: { candidates: Candidate[] }) {
  const top = candidates.slice(0, 10).map((c) => ({
    name: c.name.split(" ").slice(0, 2).join(" "),
    Technical: c.technicalScore,
    Experience: c.experienceScore,
    Overall: scoreToPercent(c.overallScore),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Top 10 — Score Breakdown</CardTitle>
        <CardDescription>Technical vs experience score for top-ranked candidates.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={top} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--popover))",
                  color: "hsl(var(--popover-foreground))",
                  fontSize: 12,
                }}
              />
              <Legend iconType="circle" formatter={(v) => <span className="text-xs text-muted-foreground">{v}</span>} />
              <Bar dataKey="Overall" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Technical" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Experience" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export { COLORS };
