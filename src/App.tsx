import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppNav } from "@/components/AppNav";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { ThemeProvider } from "@/hooks/useTheme";
import NewWire from "./pages/NewWire";
import Dashboard from "./pages/Dashboard";
import OutstandingWires from "./pages/OutstandingWires";
import Auth from "./pages/Auth";
import AdminUsers from "./pages/AdminUsers";
import AdminWireInstructions from "./pages/AdminWireInstructions";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function ProtectedRoutes() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <AppNav />
      <main className="relative h-[calc(100vh-3.5rem)] overflow-auto">
        {/* eXp watermark — fixed so it floats above page backgrounds */}
        <div className="pointer-events-none fixed inset-0 flex items-center justify-center select-none z-[60]" aria-hidden="true">
          <span className="text-[12rem] sm:text-[18rem] font-black tracking-tighter text-foreground/[0.05]">eXp</span>
        </div>
        <Routes>
          <Route path="/" element={<NewWire />} />
          <Route path="/expected-wires" element={<Dashboard />} />
          <Route path="/outstanding-wires" element={<OutstandingWires />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/wire-instructions" element={<AdminWireInstructions />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/*" element={<ProtectedRoutes />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
