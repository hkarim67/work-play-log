import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Index from "./pages/Index";
import CustomEntry from "./pages/CustomEntry";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import FloraIndex from "./pages/flora/Index";
import FloraTaskList from "./pages/flora/TaskList";
import FloraCompleted from "./pages/flora/Completed";
import FloraCalendar from "./pages/flora/CalendarView";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Home />} />
          <Route path="/time-tracker" element={<Index />} />
          <Route path="/custom-entry" element={<CustomEntry />} />
          <Route path="/flora" element={<FloraIndex />} />
          <Route path="/flora/list/:listId" element={<FloraTaskList />} />
          <Route path="/flora/calendar" element={<FloraCalendar />} />
          <Route path="/flora/completed" element={<FloraCompleted />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
