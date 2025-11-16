import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/components/ui/sidebar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { initializePushNotifications } from "@/lib/pushNotifications";
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
import FloraTaskDump from "./pages/flora/TaskDump";
import ObjectivesIndex from "./pages/objectives/Index";
import ObjectivesCategoryDetail from "./pages/objectives/CategoryDetail";
import ObjectivesLifetime from "./pages/objectives/Lifetime";
import ObjectivesTimeline from "./pages/objectives/Timeline";
import { FloraSidebar } from "./components/flora/FloraSidebar";

const queryClient = new QueryClient();

function AppContent() {
  const location = useLocation();
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    // Initialize push notifications on app load
    initializePushNotifications();
  }, []);

  const isFloraRoute = location.pathname.startsWith("/flora");
  const isTimeTrackerRoute = location.pathname.startsWith("/time-tracker");
  const isObjectivesRoute = location.pathname.startsWith("/objectives");
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

  if (isFloraRoute || isTimeTrackerRoute || isObjectivesRoute || isAppRoute) {
    return (
      <SidebarProvider defaultOpen={!isMobile}>
        <div className="min-h-screen flex w-full">
          <FloraSidebar />
          <div className="flex-1 flex flex-col w-full">
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/time-tracker" element={<Index />} />
                <Route path="/time-tracker/utilization" element={<Utilization />} />
                <Route path="/custom-entry" element={<CustomEntry />} />
                <Route path="/flora" element={<FloraIndex />} />
                <Route path="/flora/list/:listId" element={<FloraTaskList />} />
                <Route path="/flora/calendar" element={<FloraCalendar />} />
                <Route path="/flora/task-dump" element={<FloraTaskDump />} />
                <Route path="/flora/completed" element={<FloraCompleted />} />
                <Route path="/objectives" element={<ObjectivesIndex />} />
                <Route path="/objectives/category/:categoryId" element={<ObjectivesCategoryDetail />} />
                <Route path="/objectives/lifetime" element={<ObjectivesLifetime />} />
                <Route path="/objectives/timeline" element={<ObjectivesTimeline />} />
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
