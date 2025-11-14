import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import Utilization from "./pages/Utilization";
import CustomEntry from "./pages/CustomEntry";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import FloraIndex from "./pages/flora/Index";
import FloraTaskList from "./pages/flora/TaskList";
import FloraCompleted from "./pages/flora/Completed";
import FloraCalendar from "./pages/flora/CalendarView";
import { FloraSidebar } from "./components/flora/FloraSidebar";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const isFloraRoute = location.pathname.startsWith("/flora");
  const isTimeTrackerRoute = location.pathname.startsWith("/time-tracker");
  const isAuthRoute = location.pathname === "/auth";
  const isAppRoute = location.pathname === "/" || 
                     location.pathname === "/custom-entry";

  if (isAuthRoute) {
    return (
      <Routes>
        <Route path="/auth" element={<Auth />} />
      </Routes>
    );
  }

  if (isFloraRoute || isTimeTrackerRoute || isAppRoute) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <FloraSidebar />
          <div className="flex-1 flex flex-col w-full">
            <header className="h-12 flex items-center border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
              <SidebarTrigger className="ml-2" />
            </header>
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/time-tracker" element={<Index />} />
                <Route path="/time-tracker/utilization" element={<Utilization />} />
                <Route path="/custom-entry" element={<CustomEntry />} />
                <Route path="/flora" element={<FloraIndex />} />
                <Route path="/flora/list/:listId" element={<FloraTaskList />} />
                <Route path="/flora/calendar" element={<FloraCalendar />} />
                <Route path="/flora/completed" element={<FloraCompleted />} />
              </Routes>
            </main>
          </div>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <Routes>
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
