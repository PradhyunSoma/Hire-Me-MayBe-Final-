import React from "react";
import { cn } from "@/lib/utils";
import { initials, scoreToPercent } from "@/lib/utils";
import type { CandidateStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

export function Avatar({
  name,
  className,
  size = "md",
}: {
  name: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-20 w-20 text-2xl",
  };
  const colors = [
    "from-sky-500 to-indigo-500",
    "from-emerald-500 to-teal-500",
    "from-amber-500 to-orange-500",
    "from-fuchsia-500 to-purple-500",
    "from-rose-500 to-pink-500",
    "from-violet-500 to-blue-500",
    "from-lime-500 to-green-500",
    "from-cyan-500 to-sky-500",
  ];
  const idx = name.charCodeAt(0) % colors.length;
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-background shadow",
        sizes[size],
        colors[idx],
        className
      )}
    >
      {initials(name)}
    </div>
  );
}

export function ScoreRing({
  score,
  size = 72,
  stroke = 8,
  showLabel = true,
  label,
}: {
  score: number;
  size?: number;
  stroke?: number;
  showLabel?: boolean;
  label?: string;
}) {
  const pct = Math.min(100, Math.max(0, scoreToPercent(score)));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  const color =
    pct >= 80 ? "#10b981" : pct >= 60 ? "#f59e0b" : pct >= 40 ? "#f97316" : "#ef4444";

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="-rotate-90" width={size} height={size}>
        <circle
          strokeWidth={stroke}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          className="text-secondary"
        />
        <circle
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke={color}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
            transition: "stroke-dashoffset 0.6s ease",
          }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
          <span className="font-bold" style={{ color, fontSize: size * 0.28 }}>
            {pct}
          </span>
          {label && <span className="text-[9px] text-muted-foreground mt-1">{label}</span>}
        </div>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status: CandidateStatus }) {
  const map: Record<CandidateStatus, { label: string; variant: "success" | "info" | "warning" | "destructive" }> = {
    strong_match: { label: "Strong Match", variant: "success" },
    good_match: { label: "Good Match", variant: "info" },
    partial_match: { label: "Partial Match", variant: "warning" },
    missing_must_have: { label: "Missing Must-Have", variant: "destructive" },
  };
  const cfg = map[status];
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

export function ScoreBar({
  value,
  max = 1,
  className,
  color,
}: {
  value: number;
  max?: number;
  className?: string;
  color?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  const defaultColor =
    pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-rose-500";
  return (
    <div className={cn("h-2 w-full rounded-full bg-secondary overflow-hidden", className)}>
      <div
        className={cn("h-full rounded-full transition-all", color || defaultColor)}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
