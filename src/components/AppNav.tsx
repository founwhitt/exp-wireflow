import { NavLink } from "@/components/NavLink";
import { Send, LayoutDashboard, Shield, LogOut, User, FileText, Sun, Moon } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/NotificationBell";

export function AppNav() {
  const { user, isAdmin, displayName, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg" style={{ background: 'linear-gradient(135deg, #00245D 0%, #0056D2 100%)' }}>
            <Send className="h-4 w-4 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight" style={{ color: '#00245D' }}>
            eXp WireFlow
          </span>
        </div>

        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="bg-[#F1F5F9] text-[#00245D] border-b-2 border-[#0056D2]"
          >
            <Send className="h-4 w-4" />
            Send Wire Instructions
          </NavLink>
          <NavLink
            to="/dashboard"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            activeClassName="bg-[#F1F5F9] text-[#00245D] border-b-2 border-[#0056D2]"
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </NavLink>
          {isAdmin && (
            <>
              <NavLink
                to="/admin/users"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-[#F1F5F9] text-[#00245D] border-b-2 border-[#0056D2]"
              >
                <Shield className="h-4 w-4" />
                Users
              </NavLink>
              <NavLink
                to="/admin/wire-instructions"
                className="flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                activeClassName="bg-[#F1F5F9] text-[#00245D] border-b-2 border-[#0056D2]"
              >
                <FileText className="h-4 w-4" />
                Wire Inst.
              </NavLink>
            </>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="h-9 w-9">
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>
          <NotificationBell />
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground">{displayName || user.email}</span>
            {isAdmin && (
              <Badge variant="default" className="text-xs">Admin</Badge>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-1 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </header>
  );
}
