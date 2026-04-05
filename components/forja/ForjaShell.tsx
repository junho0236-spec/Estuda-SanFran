import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Routes } from "react-router-dom";
import { useMemo } from "react";
import { ForjaSessionProvider } from "@forja/ForjaSessionContext";
import { NotificationProvider } from "@forja/contexts/NotificationContext";
import { ThemeProvider } from "@forja/contexts/ThemeContext";
import { Toaster } from "@forja/components/ui/sonner";
import { TooltipProvider } from "@forja/components/ui/tooltip";
import Dashboard from "@forja/pages/Dashboard";
import Finance from "@forja/pages/Finance";
import Focus from "@forja/pages/Focus";
import Goals from "@forja/pages/Goals";
import Habits from "@forja/pages/Habits";
import NotFound from "@forja/pages/NotFound";
import Profile from "@forja/pages/Profile";
import Tasks from "@forja/pages/Tasks";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export type ForjaShellProps = {
  userId: string;
  email: string | null;
  displayName: string | null;
  onLeaveForja: () => void;
};

export default function ForjaShell({ userId, email, displayName, onLeaveForja }: ForjaShellProps) {
  const sessionValue = useMemo(
    () => ({ userId, email, displayName, onLeaveForja }),
    [userId, email, displayName, onLeaveForja]
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ForjaSessionProvider value={sessionValue}>
        <ThemeProvider defaultTheme="dark" switchable={false} applyToDocument={false}>
          <TooltipProvider>
            <div className="forja-root dark min-h-[min(85dvh,900px)] h-full w-full bg-[#0D0D0D] text-white">
              <NotificationProvider>
                <Toaster />
                <Routes>
                  <Route index element={<Dashboard />} />
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="habits" element={<Habits />} />
                  <Route path="tasks" element={<Tasks />} />
                  <Route path="goals" element={<Goals />} />
                  <Route path="finance" element={<Finance />} />
                  <Route path="focus" element={<Focus />} />
                  <Route path="profile" element={<Profile />} />
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </NotificationProvider>
            </div>
          </TooltipProvider>
        </ThemeProvider>
      </ForjaSessionProvider>
    </QueryClientProvider>
  );
}
