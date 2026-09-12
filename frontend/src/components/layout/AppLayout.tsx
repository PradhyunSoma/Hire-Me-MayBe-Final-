import { Outlet } from "react-router-dom";
import { SiteHeader } from "./SiteHeader";
import { TooltipProvider } from "@/components/ui/tooltip";

export function AppLayout() {
  return (
    <TooltipProvider delayDuration={150}>
      <div className="relative flex min-h-screen flex-col bg-background">
        <SiteHeader />
        <main className="flex-1 container py-8">
          <Outlet />
        </main>
        <footer className="border-t border-border/60 py-6">
          <div className="container flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>© {new Date().getFullYear()} Hire Me Maybe — Built for hackathons.</span>
            <span className="inline-flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              BM25 + MiniLM • Score Fusion • Evidence-backed
            </span>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
