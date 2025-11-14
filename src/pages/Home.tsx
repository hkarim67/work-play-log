import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Clock, LogOut, Calendar } from "lucide-react";
import { toast } from "sonner";
import temwiseLogo from "@/assets/temwise-logo.png";

const Home = () => {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserEmail(session.user.email || "");
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <img 
              src={temwiseLogo} 
              alt="Temwise" 
              className="h-12 w-auto object-contain"
            />
            <h1 className="text-2xl font-dazzle text-foreground whitespace-nowrap tracking-wider">
              Daily Planner
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">Your Apps</h2>
          <p className="text-muted-foreground">Select an app to get started</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-500 group bg-gradient-to-br from-blue-50/30 to-blue-100/10 dark:from-blue-950/20 dark:to-blue-900/10 flex flex-col"
            onClick={() => navigate("/time-tracker")}
          >
            <CardHeader className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                  <Clock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <CardTitle className="text-xl">Time Tracker</CardTitle>
              <CardDescription>
                Track your time across leisure, business, and job activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Open App
              </Button>
            </CardContent>
          </Card>

          <Card 
            className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-flora-sage group bg-gradient-to-br from-flora-warm/30 to-flora-peach/10 flex flex-col"
            onClick={() => navigate("/flora")}
          >
            <CardHeader className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-3 rounded-lg bg-gradient-to-br from-flora-sage/10 to-flora-peach/10 group-hover:from-flora-sage/20 group-hover:to-flora-peach/20 transition-colors">
                  <span className="text-4xl">🌸</span>
                </div>
              </div>
              <CardTitle className="text-xl">Flora</CardTitle>
              <CardDescription>
                Your mindful task companion - track tasks with time estimates
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full bg-flora-pink hover:bg-flora-pink/90 text-white border-0">
                Open App
              </Button>
            </CardContent>
          </Card>

          {/* Placeholder for future apps */}
          <Card className="border-2 border-dashed border-border opacity-60">
            <CardHeader>
              <CardTitle className="text-xl text-muted-foreground">Coming Soon</CardTitle>
              <CardDescription>
                More apps will be added here
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Home;
