import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, LogOut, ListTodo, CheckCircle2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { AddListDialog } from "@/components/flora/AddListDialog";

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
  const [isAddListDialogOpen, setIsAddListDialogOpen] = useState(false);
  const [totalTasks, setTotalTasks] = useState(0);
  const [completedToday, setCompletedToday] = useState(0);
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
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch lists with task counts
      const { data: listsData, error: listsError } = await supabase
        .from("flora_lists")
        .select("*")
        .order("sort_order");

      if (listsError) throw listsError;

      // Fetch task counts for each list
      const listsWithCounts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { count } = await supabase
            .from("flora_tasks")
            .select("*", { count: "exact", head: true })
            .eq("list_id", list.id)
            .is("completed_at", null);

          return {
            ...list,
            task_count: count || 0,
          };
        })
      );

      setLists(listsWithCounts);

      // Get total outstanding tasks
      const { count: totalCount } = await supabase
        .from("flora_tasks")
        .select("*", { count: "exact", head: true })
        .is("completed_at", null);

      setTotalTasks(totalCount || 0);

      // Get completed today count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const { count: completedCount } = await supabase
        .from("flora_tasks")
        .select("*", { count: "exact", head: true })
        .gte("completed_at", today.toISOString());

      setCompletedToday(completedCount || 0);
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
        <div className="container mx-auto px-4 py-4 flex items-center justify-between max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="text-3xl">🌸</div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-flora-sage via-flora-peach to-flora-lavender bg-clip-text text-transparent">
                Flora
              </h1>
              <p className="text-xs text-muted-foreground">Your mindful task companion</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/flora/completed")}>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Completed
            </Button>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-6xl">
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-105 hover:-translate-y-1 border-2 hover:border-flora-sage/50 bg-card/50 backdrop-blur-sm"
              onClick={() => navigate(`/flora/list/${list.id}`)}
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
            onClick={() => setIsAddListDialogOpen(true)}
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
        <div className="grid grid-cols-3 gap-4 mt-8">
          <Card className="bg-gradient-to-br from-flora-sage/10 to-flora-sage/5 border-flora-sage/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <ListTodo className="h-5 w-5 text-flora-sage" />
                <div className="text-2xl font-bold text-flora-sage">{totalTasks}</div>
              </div>
              <div className="text-xs text-muted-foreground">Outstanding tasks</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-flora-peach/10 to-flora-peach/5 border-flora-peach/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <CheckCircle2 className="h-5 w-5 text-flora-peach" />
                <div className="text-2xl font-bold text-flora-peach">{completedToday}</div>
              </div>
              <div className="text-xs text-muted-foreground">Completed today</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-flora-lavender/10 to-flora-lavender/5 border-flora-lavender/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-1">
                <Calendar className="h-5 w-5 text-flora-lavender" />
                <div className="text-2xl font-bold text-flora-lavender">{lists.length}</div>
              </div>
              <div className="text-xs text-muted-foreground">Active lists</div>
            </CardContent>
          </Card>
        </div>
      </main>

      <AddListDialog
        open={isAddListDialogOpen}
        onOpenChange={setIsAddListDialogOpen}
        onListAdded={fetchLists}
      />
    </div>
  );
};

export default FloraIndex;
