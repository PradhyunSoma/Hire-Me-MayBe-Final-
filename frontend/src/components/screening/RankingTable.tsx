import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Candidate, CandidateStatus, RequirementImportance } from "@/types";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, ScoreBar, StatusBadge } from "@/components/shared/Visualization";
import { ArrowUpDown, ChevronDown, GitCompare, MoreHorizontal, Search, UserCog } from "lucide-react";
import { scoreToPercent } from "@/lib/utils";

type SortKey =
  | "overall"
  | "mustHave"
  | "technical"
  | "experience"
  | "semantic"
  | "keyword"
  | "rank";

type FilterKey = "all" | CandidateStatus;

export function RankingTable({
  screeningId,
  candidates,
  onCompare,
}: {
  screeningId: string;
  candidates: Candidate[];
  onCompare?: (ids: string[]) => void;
}) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [sort, setSort] = useState<SortKey>("rank");
  const [asc, setAsc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const visible = useMemo(() => {
    let r = [...candidates];
    if (q.trim()) {
      const qq = q.toLowerCase();
      r = r.filter((c) => c.name.toLowerCase().includes(qq) || c.email?.toLowerCase().includes(qq));
    }
    if (filter !== "all") r = r.filter((c) => c.status === filter);
    const dir = asc ? 1 : -1;
    r.sort((a, b) => {
      switch (sort) {
        case "overall":
          return (b.overallScore - a.overallScore) * dir;
        case "mustHave":
          return (b.mustHaveCoverage - a.mustHaveCoverage) * dir;
        case "technical":
          return (b.technicalScore - a.technicalScore) * dir;
        case "experience":
          return (b.experienceScore - a.experienceScore) * dir;
        case "semantic":
          return (b.semanticScore - a.semanticScore) * dir;
        case "keyword":
          return (b.keywordScore - a.keywordScore) * dir;
        default:
          return (a.rank - b.rank) * dir;
      }
    });
    return r;
  }, [candidates, q, filter, sort, asc]);

  function toggleSort(k: SortKey) {
    if (sort === k) setAsc(!asc);
    else {
      setSort(k);
      setAsc(k === "rank");
    }
  }

  function toggleSel(id: string) {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  }

  function statusCounts() {
    const c: Record<FilterKey, number> = { all: candidates.length, strong_match: 0, good_match: 0, partial_match: 0, missing_must_have: 0 };
    for (const cand of candidates) c[cand.status]++;
    return c;
  }
  const counts = statusCounts();
  const filterOptions: { key: FilterKey; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "strong_match", label: `Strong (${counts.strong_match})` },
    { key: "good_match", label: `Good (${counts.good_match})` },
    { key: "partial_match", label: `Partial (${counts.partial_match})` },
    { key: "missing_must_have", label: `Missing MH (${counts.missing_must_have})` },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 justify-between">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search candidates…"
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="muted" className="text-xs">
            {visible.length} of {candidates.length} candidates
          </Badge>
          {onCompare && (
            <Button
              size="sm"
              variant="outline"
              disabled={selected.size < 2}
              onClick={() => onCompare(Array.from(selected))}
            >
              <GitCompare className="mr-2 h-4 w-4" />
              Compare ({selected.size})
            </Button>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10"></TableHead>
              <SortableHead label="Rank" k="rank" sort={sort} asc={asc} onClick={toggleSort} />
              <TableHead>Candidate</TableHead>
              <SortableHead label="Score" k="overall" sort={sort} asc={asc} onClick={toggleSort} />
              <SortableHead label="Must-Haves" k="mustHave" sort={sort} asc={asc} onClick={toggleSort} />
              <SortableHead label="Technical" k="technical" sort={sort} asc={asc} onClick={toggleSort} />
              <SortableHead label="Experience" k="experience" sort={sort} asc={asc} onClick={toggleSort} />
              <TableHead>Status</TableHead>
              <TableHead className="w-[88px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-10">
                  No candidates match your filters.
                </TableCell>
              </TableRow>
            )}
            {visible.map((c) => {
              const mh = c.matches.filter((m) => m.importance === "must_have" as RequirementImportance);
              const mhPct = mh.length ? Math.round(mh.filter((m) => m.status === "matched").length / mh.length * 100) : 0;
              const checked = selected.has(c.id);
              return (
                <TableRow
                  key={c.id}
                  className="cursor-pointer group"
                  onClick={() => navigate(`/screening/${screeningId}/candidate/${c.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                      checked={checked}
                      onChange={() => toggleSel(c.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-muted font-semibold text-xs">
                      {c.rank}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar name={c.name} size="sm" />
                      <div className="min-w-0">
                        <div className="font-medium leading-tight truncate max-w-[220px]">{c.name}</div>
                        {c.email && <div className="text-xs text-muted-foreground truncate max-w-[220px]">{c.email}</div>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums w-10">{scoreToPercent(c.overallScore)}</span>
                      <ScoreBar value={c.overallScore} max={100} className="w-24" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums w-10 text-xs">{mhPct}%</span>
                      <ScoreBar value={mhPct} max={100} className="w-20" />
                    </div>
                  </TableCell>
                  <TableCell className="tabular-nums font-medium">{c.technicalScore}</TableCell>
                  <TableCell className="tabular-nums font-medium">{c.experienceScore}</TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 opacity-70 group-hover:opacity-100">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => navigate(`/screening/${screeningId}/candidate/${c.id}`)}>
                          <UserCog className="mr-2 h-4 w-4" /> View Analysis
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => toggleSel(c.id)}>
                          <GitCompare className="mr-2 h-4 w-4" />
                          {checked ? "Remove from Compare" : "Add to Compare"}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="inline-flex items-center gap-1.5">
          <ChevronDown className="h-3.5 w-3.5" />
          Click any row to open candidate analysis.
        </div>
        <Link to={`/screening/${screeningId}/compare`} className="text-primary hover:underline">
          Open comparison view →
        </Link>
      </div>
    </div>
  );
}

function SortableHead({
  label,
  k,
  sort,
  asc,
  onClick,
}: {
  label: string;
  k: SortKey;
  sort: SortKey;
  asc: boolean;
  onClick: (k: SortKey) => void;
}) {
  return (
    <TableHead>
      <button
        className="inline-flex items-center gap-1 font-medium hover:text-foreground text-muted-foreground"
        onClick={() => onClick(k)}
      >
        {label}
        <ArrowUpDown className={sort === k ? "text-foreground" : "opacity-40"} />
      </button>
    </TableHead>
  );
}
