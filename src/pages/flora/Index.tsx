import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, ListTodo } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";

interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  task_count: number;
}

const FloraIndex = () => {
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    fetchLists();
  };

  const fetchLists = async () => {
    try {
      setLoading(true);
      // Placeholder - will implement lists table in next phase
      setLists([
        { id: "1", name: "Work", icon: "💼", color: "flora-sage", task_count: 5 },
        { id: "2", name: "Personal", icon: "🏠", color: "flora-peach", task_count: 3 },
        { id: "3", name: "Health", icon: "💪", color: "flora-lavender", task_count: 2 },
      ]);
    } catch (error) {
      toast({
        title: "Error loading lists",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading Flora...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-peach/10">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🌸</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-flora-sage via-flora-peach to-flora-lavender bg-clip-text text-transparent">
                Flora
              </h1>
              <p className="text-xs text-muted-foreground">Your mindful task companion</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Welcome Section */}
        <div className="mb-8 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            What shall we nurture today?
          </h2>
          <p className="text-sm text-muted-foreground">
            Select a list to view your tasks
          </p>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 border-2 hover:border-flora-sage/50 bg-card/50 backdrop-blur-sm"
              onClick={() => toast({ title: "Coming soon!", description: "Task lists will be implemented next" })}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-4xl transform group-hover:scale-110 transition-transform duration-300">
                    {list.icon}
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-flora-sage/10 text-flora-sage text-xs font-medium">
                    <ListTodo className="h-3 w-3" />
                    {list.task_count}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-foreground group-hover:text-flora-sage transition-colors">
                  {list.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {list.task_count} {list.task_count === 1 ? "task" : "tasks"} outstanding
                </p>
              </CardContent>
            </Card>
          ))}

          {/* Add New List Card */}
          <Card
            className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 border-2 border-dashed border-flora-lavender/30 hover:border-flora-lavender bg-card/30 backdrop-blur-sm"
            onClick={() => toast({ title: "Coming soon!", description: "Adding custom lists will be available soon" })}
          >
            <CardContent className="p-6 flex flex-col items-center justify-center h-full min-h-[140px]">
              <div className="w-12 h-12 rounded-full bg-flora-lavender/10 flex items-center justify-center mb-3 group-hover:bg-flora-lavender/20 transition-colors">
                <Plus className="h-6 w-6 text-flora-lavender" />
              </div>
              <p className="text-sm font-medium text-muted-foreground group-hover:text-flora-lavender transition-colors">
                Add New List
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4 mt-8">
          <Card className="bg-gradient-to-br from-flora-sage/10 to-flora-sage/5 border-flora-sage/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-flora-sage mb-1">10</div>
              <div className="text-xs text-muted-foreground">Tasks this week</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-flora-peach/10 to-flora-peach/5 border-flora-peach/20">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-flora-peach mb-1">3.5h</div>
              <div className="text-xs text-muted-foreground">Estimated time</div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default FloraIndex;
