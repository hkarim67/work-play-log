import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { IndividualUtilizationTracker } from "@/components/IndividualUtilizationTracker";
import { MultiSelectUtilizationTracker } from "@/components/MultiSelectUtilizationTracker";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { Target } from "lucide-react";

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

const Utilization = () => {
  const navigate = useNavigate();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth", { replace: true });
        } else {
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

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

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

  // Refresh data every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTrigger((prev) => prev + 1);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <Target className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(270,70%,65%)] via-[hsl(210,80%,55%)] to-[hsl(165,70%,50%)] bg-clip-text text-transparent">
              Utilization Tracking
            </h1>
          </div>
          <p className="text-center text-muted-foreground mt-2">
            Monitor your time utilization across timers
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Individual Utilization Trackers */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Individual Timer Utilization</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {timers.map((timer) => (
              <IndividualUtilizationTracker
                key={timer.id}
                timer={timer}
                refreshTrigger={refreshTrigger}
              />
            ))}
          </div>
        </section>

        {/* Multi-Select Utilization */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Multi-Timer Utilization</h2>
          <div className="max-w-3xl mx-auto">
            <MultiSelectUtilizationTracker timers={timers} refreshTrigger={refreshTrigger} />
          </div>
        </section>
      </main>
    </div>
  );
};

export default Utilization;
