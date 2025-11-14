import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Stopwatch } from "@/components/Stopwatch";
import { CalendarView } from "@/components/CalendarView";
import { Timesheet } from "@/components/Timesheet";
import { TimerManager } from "@/components/TimerManager";
import { Button } from "@/components/ui/button";
import { Clock, Plus, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { logout, setupLogoutListener } from "@/lib/auth";

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

const Index = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session && !isLoggingOut) {
          // Only redirect if we're not in the middle of logging out
          // (logout function handles its own redirect)
          navigate("/auth", { replace: true });
        } else if (session) {
          setTimeout(() => {
            fetchTimers();
          }, 0);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        fetchTimers();
      }
    });

    // Set up multi-tab logout listener
    const cleanupLogoutListener = setupLogoutListener(() => {
      // Another tab logged out - redirect this tab too
      window.location.href = "/auth";
    });

    return () => {
      subscription.unsubscribe();
      cleanupLogoutListener();
    };
  }, [navigate, isLoggingOut]);

  const fetchTimers = async () => {
    try {
      const { data, error } = await supabase
        .from("timers")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTimers(data || []);
    } catch (error) {
      console.error("Error fetching timers:", error);
    }
  };

  const handleTimeUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleTimersChange = () => {
    fetchTimers();
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleLogout = async () => {
    if (isLoggingOut) return; // Prevent double-clicks
    setIsLoggingOut(true);
    await logout();
    // Note: logout() handles navigation, no need to navigate here
  };

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-3">
              <Clock className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(270,70%,65%)] via-[hsl(210,80%,55%)] to-[hsl(165,70%,50%)] bg-clip-text text-transparent">
                TimeTracker
              </h1>
            </div>
          </div>
          <div className="flex justify-end -mt-10">
            <Button
              onClick={handleLogout} 
              variant="ghost" 
              size="sm"
              disabled={isLoggingOut}
              aria-label="Log out"
            >
              <LogOut className="mr-2 h-4 w-4" />
              {isLoggingOut ? "Logging out..." : "Logout"}
            </Button>
          </div>
          <p className="text-center text-muted-foreground mt-2">
            Track your time across your custom timers
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate("/custom-entry")} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Entry
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Timer Management */}
        <section className="text-center">
          <TimerManager timers={timers} onTimersChange={handleTimersChange} />
        </section>

        {/* Stopwatches Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">Active Timers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {timers.map((timer) => (
              <Stopwatch
                key={timer.id}
                category={timer.category}
                title={timer.name}
                onTimeUpdate={handleTimeUpdate}
              />
            ))}
          </div>
        </section>

        {/* Calendar and Timesheet Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 flex flex-col">
            <CalendarView
              onDateSelect={setSelectedDate}
              selectedDate={selectedDate}
              refreshTrigger={refreshTrigger}
              timers={timers}
            />
          </div>
          <div className="lg:col-span-2 flex flex-col">
            <Timesheet 
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              refreshTrigger={refreshTrigger}
              timers={timers}
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
