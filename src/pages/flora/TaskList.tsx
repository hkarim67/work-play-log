import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Clock, Calendar as CalendarIcon, Trash2, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddTaskDialog } from "@/components/flora/AddTaskDialog";
import { EditTaskDialog } from "@/components/flora/EditTaskDialog";
import { format } from "date-fns";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
}

interface ListInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const TaskList = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchListAndTasks();
  }, [listId, showCompleted]);

  const fetchListAndTasks = async () => {
    try {
      setLoading(true);
      
      const { data: list, error: listError } = await supabase
        .from("flora_lists")
        .select("*")
        .eq("id", listId)
        .single();

      if (listError) throw listError;
      setListInfo(list);

      let query = supabase
        .from("flora_tasks")
        .select("*")
        .eq("list_id", listId)
        .order("sort_order");

      if (!showCompleted) {
        query = query.is("completed_at", null);
      }

      const { data: tasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;

      setTasks(tasks || []);
    } catch (error) {
      toast({
        title: "Error loading tasks",
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
        description: currentCompleted ? "" : "Great work!",
      });

      fetchListAndTasks();
    } catch (error) {
      toast({
        title: "Error updating task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("flora_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Task deleted",
      });

      fetchListAndTasks();
    } catch (error) {
      toast({
        title: "Error deleting task",
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

  const openEditDialog = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsEditDialogOpen(true);
  };

  if (loading || !listInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const outstandingTasks = tasks.filter((t) => !t.completed_at);
  const completedTasks = tasks.filter((t) => t.completed_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-peach/10">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate("/flora")}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-3xl">{listInfo.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{listInfo.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {outstandingTasks.length} outstanding
                </p>
              </div>
            </div>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Task
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
            />
            <label htmlFor="show-completed" className="text-sm text-muted-foreground cursor-pointer">
              Show completed tasks
            </label>
          </div>
        </div>

        {outstandingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌸</div>
            <p className="text-muted-foreground mb-4">No tasks yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first task
            </Button>
          </div>
        )}

        <div className="space-y-2">
          {outstandingTasks.map((task) => (
            <Card
              key={task.id}
              className="group hover:shadow-md transition-all animate-fade-in"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Checkbox
                    checked={false}
                    onCheckedChange={() => toggleTaskComplete(task.id, task.completed_at)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground mb-1">{task.title}</h3>
                    {task.notes && (
                      <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {task.estimated_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatEstimatedTime(task.estimated_minutes)}
                        </div>
                      )}
                      {task.due_date && (
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-3 w-3" />
                          {format(new Date(task.due_date), "MMM d")}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(task.id)}
                    >
                      <Pencil className="h-4 w-4 text-flora-sage" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteTask(task.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {showCompleted && completedTasks.length > 0 && (
            <>
              <div className="mt-8 mb-3 text-sm font-medium text-muted-foreground">
                Completed ({completedTasks.length})
              </div>
              {completedTasks.map((task) => (
                <Card
                  key={task.id}
                  className="group opacity-60 hover:opacity-100 transition-opacity animate-fade-in"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTaskComplete(task.id, task.completed_at)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-foreground line-through mb-1">
                          {task.title}
                        </h3>
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(task.id)}
                        >
                          <Pencil className="h-4 w-4 text-flora-sage" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </>
          )}
        </div>
      </main>

      <AddTaskDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        listId={listId!}
        onTaskAdded={fetchListAndTasks}
      />

      {editingTaskId && (
        <EditTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          taskId={editingTaskId}
          onTaskUpdated={fetchListAndTasks}
        />
      )}
    </div>
  );
};

export default TaskList;
