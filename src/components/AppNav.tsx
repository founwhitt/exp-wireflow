import { NavLink } from "@/components/NavLink";
import { Send, LayoutDashboard } from "lucide-react";

export function AppNav() {
  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Send className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            WireTrack
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="bg-secondary text-foreground"
          >
            <Send className="h-4 w-4" />
            New Wire
          </NavLink>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="bg-secondary text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
        </nav>
      </div>
    </header>
  );
}
