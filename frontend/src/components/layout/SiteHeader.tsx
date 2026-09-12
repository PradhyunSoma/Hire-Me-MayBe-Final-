import { Link, NavLink } from "react-router-dom";
import { BrainCircuit, PlusCircle, Home, LineChart, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const navItems = [
    { to: "/", label: "Dashboard", icon: Home },
    { to: "/screening/new", label: "New Screening", icon: PlusCircle },
    { to: "/screening/demo/results", label: "Demo Results", icon: LineChart },
    { to: "/screening/demo/insights", label: "JD Insights", icon: Settings2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white shadow-md shadow-primary/20">
            <BrainCircuit className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-bold tracking-tight">Hire Me Maybe</span>
            <span className="text-[10px] text-muted-foreground hidden sm:block">
              Find the right hire. Know why.
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                className={({ isActive }) =>
                  cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Button asChild size="sm" variant="gradient">
            <Link to="/screening/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              Start Screening
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
