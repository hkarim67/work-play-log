import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, Calendar, Sparkles, Target } from "lucide-react";
import temwiseLogo from "@/assets/temwise-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-6 sm:py-8 md:py-12">
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl sm:text-2xl font-semibold mb-2">Your Apps</h2>
          <p className="text-sm sm:text-base text-muted-foreground">Select an app to get started</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card 
            className="hover:shadow-lg active:scale-95 transition-all cursor-pointer border-2 hover:border-blue-500 group bg-gradient-to-br from-blue-50/30 to-blue-100/10 dark:from-blue-950/20 dark:to-blue-900/10 flex flex-col"
            onClick={() => navigate("/time-tracker")}
          >
            <CardHeader className="flex-1 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 sm:p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-lg sm:text-xl">Time Tracker</CardTitle>
              <CardDescription className="text-sm">
                Track your time across leisure, business, and job activities
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white min-h-[44px]">
                Open App
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg active:scale-95 transition-all cursor-pointer border-2 hover:border-flora-sage group bg-gradient-to-br from-flora-warm/30 to-flora-peach/10 flex flex-col"
            onClick={() => navigate("/flora")}
          >
            <CardHeader className="flex-1 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-flora-sage/10 to-flora-peach/10 group-hover:from-flora-sage/20 group-hover:to-flora-peach/20 transition-colors">
                  <span className="text-3xl sm:text-4xl">🌸</span>
                </div>
              </div>
              <CardTitle className="text-lg sm:text-xl">Flora</CardTitle>
              <CardDescription className="text-sm">
                Your mindful task companion - track tasks with time estimates
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Button className="w-full bg-flora-pink hover:bg-flora-pink/90 text-white border-0 min-h-[44px]">
                Open App
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg active:scale-95 transition-all cursor-pointer border-2 hover:border-[hsl(var(--objectives-primary))] group bg-gradient-to-br from-[hsl(var(--objectives-light))]/20 to-[hsl(var(--objectives-secondary))]/5 flex flex-col"
            onClick={() => navigate("/objectives")}
          >
            <CardHeader className="flex-1 p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 sm:p-3 rounded-lg bg-[hsl(var(--objectives-primary))]/10 group-hover:bg-[hsl(var(--objectives-primary))]/20 transition-colors">
                  <Target className="h-6 w-6 sm:h-8 sm:w-8 text-[hsl(var(--objectives-primary))]" />
                </div>
              </div>
              <CardTitle className="text-lg sm:text-xl">Objectives</CardTitle>
              <CardDescription className="text-sm">
                Track your bigger goals and make progress on what matters most
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 sm:p-6 pt-0">
              <Button className="w-full bg-[hsl(var(--objectives-primary))] hover:bg-[hsl(var(--objectives-dark))] text-white border-0 min-h-[44px]">
                Open App
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
