import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "./const";
import Dashboard from "./pages/Dashboard";
import Habits from "./pages/Habits";
import Tasks from "./pages/Tasks";
import Goals from "./pages/Goals";
import Finance from "./pages/Finance";
import Focus from "./pages/Focus";
import Profile from "./pages/Profile";

function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-400 text-sm">Carregando Sistema Life...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0D0D0D] flex items-center justify-center p-4">
        <div className="bg-[#1a1a1a] rounded-2xl p-8 max-w-md w-full text-center border border-[#2a2a2a]">
          <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-3xl">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Sistema Life</h1>
          <p className="text-gray-400 mb-8">Organize sua vida, conquiste seus objetivos e evolua todos os dias.</p>
          <a
            href={getLoginUrl()}
            className="inline-flex items-center justify-center w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl transition text-lg"
          >
            Entrar
          </a>
          <p className="text-gray-500 text-xs mt-4">Faça login para acessar suas metas, hábitos, tarefas e muito mais.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Dashboard} />
      <Route path={"/dashboard"} component={Dashboard} />
      <Route path={"/habits"} component={Habits} />
      <Route path={"/tasks"} component={Tasks} />
      <Route path={"/goals"} component={Goals} />
      <Route path={"/finance"} component={Finance} />
      <Route path={"/focus"} component={Focus} />
      <Route path={"/profile"} component={Profile} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <AuthGate>
            <NotificationProvider>
              <Router />
            </NotificationProvider>
          </AuthGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
