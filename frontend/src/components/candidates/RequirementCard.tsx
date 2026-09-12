import type { RequirementMatch, RequirementImportance } from "@/types";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, FileText, MinusCircle, XCircle } from "lucide-react";
import { cn, scoreToPercent } from "@/lib/utils";

const importanceLabel: Record<RequirementImportance, { label: string; variant: "default" | "secondary" | "muted" | "outline" }> = {
  must_have: { label: "Must-Have", variant: "default" },
  preferred: { label: "Preferred", variant: "info" as any },
  nice_to_have: { label: "Nice-to-Have", variant: "muted" },
};

const typeLabel: Record<string, string> = {
  technical: "Technical",
  experience: "Experience",
  domain: "Domain",
  soft_skill: "Soft Skill",
  certification: "Certification",
};

export function RequirementCard({ match }: { match: RequirementMatch }) {
  const statusCfg =
    match.status === "matched"
      ? {
          label: "Matched",
          cls: "text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-500/10",
          Icon: Check,
        }
      : match.status === "partial"
      ? {
          label: "Partial",
          cls: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-500/10",
          Icon: MinusCircle,
        }
      : {
          label: "Missing",
          cls: "text-rose-600 bg-rose-50 dark:text-rose-400 dark:bg-rose-500/10",
          Icon: XCircle,
        };
  const Icon = statusCfg.Icon;
  const imp = importanceLabel[match.importance];
  const kw = scoreToPercent(match.keywordScore);
  const sm = scoreToPercent(match.semanticScore);
  const cmb = scoreToPercent(match.combinedScore);

  return (
    <Card className={cn("overflow-hidden transition-all hover:shadow-md")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <h4 className="font-semibold tracking-tight truncate">{match.requirementText}</h4>
            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant={imp.variant as any} className="text-[10px] uppercase tracking-wide">
                {imp.label}
              </Badge>
              <Badge variant="muted" className="text-[10px] uppercase tracking-wide">
                {typeLabel[match.type] || match.type}
              </Badge>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                  statusCfg.cls
                )}
              >
                <Icon className="h-3 w-3" /> {statusCfg.label}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold tabular-nums">{cmb}</div>
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Combined</div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-sky-50 dark:bg-sky-500/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-sky-700 dark:text-sky-400">Keyword</div>
            <div className="font-bold text-sky-700 dark:text-sky-300 tabular-nums">{kw}</div>
          </div>
          <div className="rounded-lg bg-violet-50 dark:bg-violet-500/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-violet-700 dark:text-violet-400">Semantic</div>
            <div className="font-bold text-violet-700 dark:text-violet-300 tabular-nums">{sm}</div>
          </div>
          <div className="rounded-lg bg-emerald-50 dark:bg-emerald-500/10 p-2">
            <div className="text-[10px] uppercase tracking-wide text-emerald-700 dark:text-emerald-400">Combined</div>
            <div className="font-bold text-emerald-700 dark:text-emerald-300 tabular-nums">{cmb}</div>
          </div>
        </div>

        {match.evidence ? (
          <div className="rounded-lg border border-border/60 bg-muted/30 overflow-hidden">
            <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/60 bg-muted/40">
              <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5" /> Evidence
              </div>
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {match.evidence.section && (
                  <span className="rounded bg-secondary px-1.5 py-0.5">{match.evidence.section}</span>
                )}
                <span>p. {match.evidence.pageNumber}</span>
              </div>
            </div>
            <p className="px-3 py-2.5 text-sm leading-relaxed text-foreground/90">
              <span className="text-[11px] text-muted-foreground italic mr-1">“</span>
              {match.evidence.text}
              <span className="text-[11px] text-muted-foreground italic ml-1">”</span>
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border/80 bg-muted/20 px-3 py-3 text-xs text-muted-foreground italic text-center">
            No strong supporting evidence found in the resume.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RequirementList({ matches }: { matches: RequirementMatch[] }) {
  const sorted = [...matches].sort((a, b) => {
    const impOrder = { must_have: 0, preferred: 1, nice_to_have: 2 };
    return impOrder[a.importance] - impOrder[b.importance] || b.combinedScore - a.combinedScore;
  });
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {sorted.map((m) => (
        <RequirementCard key={m.requirementId} match={m} />
      ))}
    </div>
  );
}
