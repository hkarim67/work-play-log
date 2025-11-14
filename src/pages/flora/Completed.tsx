import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format, startOfToday, startOfWeek } from "date-fns";

interface CompletedTask {
  id: string;
  title: string;
  notes: string | null;
  estimated_minutes: number | null;
  completed_at: string;
  list_name: string;
  list_icon: string;
}

const Completed = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCompletedTasks();
  }, []);

  const fetchCompletedTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flora_tasks")
        .select(`
          id,
          title,
          notes,
          estimated_minutes,
          completed_at,
          flora_lists (
            name,
            icon
          )
        `)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false });

      if (error) throw error;

      const formattedTasks = data.map((task: any) => ({
        id: task.id,
        title: task.title,
        notes: task.notes,
        estimated_minutes: task.estimated_minutes,
        completed_at: task.completed_at,
        list_name: task.flora_lists.name,
        list_icon: task.flora_lists.icon,
      }));

      setTasks(formattedTasks);
    } catch (error) {
      toast({
        title: "Error loading completed tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const today = startOfToday();
  const thisWeek = startOfWeek(today, { weekStartsOn: 1 });

  const todayTasks = tasks.filter(
    (t) => format(new Date(t.completed_at), "yyyy-MM-dd") === format(today, "yyyy-MM-dd")
  );

  const thisWeekTasks = tasks.filter(
    (t) => new Date(t.completed_at) >= thisWeek && new Date(t.completed_at) < today
  );

  const olderTasks = tasks.filter((t) => new Date(t.completed_at) < thisWeek);

  const totalMinutesToday = todayTasks.reduce((sum, t) => sum + (t.estimated_minutes || 0), 0);

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-lavender/10">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Completed Tasks</h1>
          <p className="text-xs text-muted-foreground">Your accomplishments</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-gradient-to-br from-flora-sage/10 to-flora-sage/5 border-flora-sage/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-flora-sage" />
                <div className="text-2xl font-bold text-flora-sage">{todayTasks.length}</div>
              </div>
              <div className="text-xs text-muted-foreground">Completed today</div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-flora-peach/10 to-flora-peach/5 border-flora-peach/20">
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Clock className="h-5 w-5 text-flora-peach" />
                <div className="text-2xl font-bold text-flora-peach">
                  {formatTime(totalMinutesToday)}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">Time today</div>
            </CardContent>
          </Card>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌸</div>
            <p className="text-muted-foreground">No completed tasks yet</p>
          </div>
        )}

        {/* Today */}
        {todayTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-foreground">Today</h2>
            <div className="space-y-2">
              {todayTasks.map((task) => (
                <Card key={task.id} className="animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-flora-sage mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{task.list_icon}</span>
                          <span className="text-xs text-muted-foreground">{task.list_name}</span>
                        </div>
                        <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.estimated_minutes && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(task.estimated_minutes)}
                            </div>
                          )}
                          <span>{format(new Date(task.completed_at), "h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* This Week */}
        {thisWeekTasks.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-foreground">This Week</h2>
            <div className="space-y-2">
              {thisWeekTasks.map((task) => (
                <Card key={task.id} className="animate-fade-in opacity-80">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-flora-sage mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{task.list_icon}</span>
                          <span className="text-xs text-muted-foreground">{task.list_name}</span>
                        </div>
                        <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(new Date(task.completed_at), "MMM d, h:mm a")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Older */}
        {olderTasks.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold mb-3 text-foreground">Older</h2>
            <div className="space-y-2">
              {olderTasks.map((task) => (
                <Card key={task.id} className="animate-fade-in opacity-60">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-flora-sage mt-0.5" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{task.list_icon}</span>
                          <span className="text-xs text-muted-foreground">{task.list_name}</span>
                        </div>
                        <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{format(new Date(task.completed_at), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Completed;
