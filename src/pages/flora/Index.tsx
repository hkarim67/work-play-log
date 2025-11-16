import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, LogOut, ListTodo, CheckCircle2, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { logout } from "@/lib/auth";
import { AddListDialog } from "@/components/flora/AddListDialog";

interface Task {
  id: string;
  title: string;
  estimated_minutes: number | null;
  completed_at: string | null;
  priority: "high" | "medium" | "low";
}

interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
  task_count: number;
  tasks: Task[];
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

      // Fetch lists
      const { data: listsData, error: listsError } = await supabase
        .from("flora_lists")
        .select("*")
        .order("sort_order");

      if (listsError) throw listsError;

      // Fetch tasks and counts for each list
      const listsWithTasksAndCounts = await Promise.all(
        (listsData || []).map(async (list) => {
          const { data: tasks, count } = await supabase
            .from("flora_tasks")
            .select("id, title, estimated_minutes, completed_at, priority", { count: "exact" })
            .eq("list_id", list.id)
            .is("completed_at", null)
            .order("sort_order")
            .limit(3);

          // Sort tasks by priority: high (green) first, then medium (orange), then low (red)
          const priorityOrder = { high: 1, medium: 2, low: 3 };
          const sortedTasks = (tasks || []).sort((a, b) => 
            priorityOrder[a.priority] - priorityOrder[b.priority]
          );

          return {
            ...list,
            task_count: count || 0,
            tasks: sortedTasks,
          };
        })
      );

      setLists(listsWithTasksAndCounts);

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

  const toggleTaskComplete = async (taskId: string, currentCompleted: string | null) => {
    try {
      const { error } = await supabase
        .from("flora_tasks")
        .update({ completed_at: currentCompleted ? null : new Date().toISOString() })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: currentCompleted ? "Task marked incomplete" : "Task completed! 🌸",
      });

      fetchLists();
    } catch (error) {
      toast({
        title: "Error updating task",
        variant: "destructive",
      });
    }
  };

  const formatEstimatedTime = (minutes: number | null) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-green-500";
      case "medium":
        return "border-l-4 border-l-orange-500";
      case "low":
        return "border-l-4 border-l-red-500";
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
      {/* Header - Removed since sidebar now has navigation */}
      <main className="container mx-auto px-4 py-4 sm:py-6 md:py-8 max-w-6xl">
        {/* Welcome Section */}
        <div className="mb-6 sm:mb-8 text-center">
          <h2 className="text-lg sm:text-xl font-semibold text-foreground mb-2">
            What shall we nurture today?
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Select a list to view your tasks
          </p>
        </div>

        {/* Lists Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 mb-6">
          {lists.map((list) => (
            <Card
              key={list.id}
              className="group transition-all duration-300 hover:shadow-lg active:scale-95 border-2 hover:border-flora-sage/50 bg-card/50 backdrop-blur-sm"
            >
              <CardContent className="p-4 sm:p-6">
                <div 
                  className="cursor-pointer"
                  onClick={() => navigate(`/flora/list/${list.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="text-3xl sm:text-4xl transform group-hover:scale-110 transition-transform duration-300">
                      {list.icon}
                    </div>
                    <div className="flex items-center gap-1.5 px-2 sm:px-2.5 py-1 rounded-full bg-flora-sage/10 text-flora-sage text-xs font-medium">
                      <ListTodo className="h-3 w-3" />
                      {list.task_count}
                    </div>
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-foreground group-hover:text-flora-sage transition-colors">
                    {list.name}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {list.task_count} {list.task_count === 1 ? "task" : "tasks"} outstanding
                  </p>
                </div>

                {/* Task Preview */}
                {list.tasks.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                    {list.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`flex items-start gap-2 text-sm p-2 rounded ${getPriorityColor(task.priority)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Checkbox
                          checked={false}
                          onCheckedChange={() => toggleTaskComplete(task.id, task.completed_at)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-foreground truncate">{task.title}</p>
                          {task.estimated_minutes && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatEstimatedTime(task.estimated_minutes)}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                    {list.task_count > 3 && (
                      <button
                        onClick={() => navigate(`/flora/list/${list.id}`)}
                        className="text-xs text-flora-sage hover:underline"
                      >
                        View all {list.task_count} tasks →
                      </button>
                    )}
                  </div>
                )}

                {list.tasks.length === 0 && (
                  <div className="mt-4 pt-4 border-t border-border/50 text-center">
                    <p className="text-xs text-muted-foreground">No tasks yet</p>
                  </div>
                )}
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
