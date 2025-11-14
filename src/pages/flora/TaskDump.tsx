import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ArrowRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DumpedTask {
  id: string;
  title: string;
  created_at: string;
}

interface List {
  id: string;
  name: string;
  icon: string;
  color: string;
}

const TaskDump = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [dumpedTasks, setDumpedTasks] = useState<DumpedTask[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  useEffect(() => {
    checkAuth();
    fetchDumpedTasks();
    fetchLists();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
    }
  };

  const fetchDumpedTasks = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("flora_dumped_tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setDumpedTasks(data || []);
    } catch (error) {
      toast({
        title: "Error loading tasks",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from("flora_lists")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error("Error fetching lists:", error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newTaskTitle.trim()) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("flora_dumped_tasks")
        .insert({
          user_id: user.id,
          title: newTaskTitle.trim(),
        });

      if (error) throw error;

      toast({
        title: "Task captured! 💭",
        description: "Added to your brain dump",
      });

      setNewTaskTitle("");
      fetchDumpedTasks();
    } catch (error) {
      toast({
        title: "Error adding task",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("flora_dumped_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Task removed! 🗑️",
      });

      fetchDumpedTasks();
    } catch (error) {
      toast({
        title: "Error deleting task",
        variant: "destructive",
      });
    }
  };

  const handleOpenMoveDialog = (taskId: string) => {
    setSelectedTaskId(taskId);
    setMoveDialogOpen(true);
  };

  const handleMoveTask = async (listId: string) => {
    if (!selectedTaskId) return;

    try {
      const task = dumpedTasks.find((t) => t.id === selectedTaskId);
      if (!task) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Add task to the selected list
      const { error: insertError } = await supabase
        .from("flora_tasks")
        .insert({
          user_id: user.id,
          list_id: listId,
          title: task.title,
        });

      if (insertError) throw insertError;

      // Delete from dumped tasks
      const { error: deleteError } = await supabase
        .from("flora_dumped_tasks")
        .delete()
        .eq("id", selectedTaskId);

      if (deleteError) throw deleteError;

      toast({
        title: "Task moved! ✨",
        description: "Task has been organized into a list",
      });

      setMoveDialogOpen(false);
      setSelectedTaskId(null);
      fetchDumpedTasks();
    } catch (error) {
      toast({
        title: "Error moving task",
        variant: "destructive",
      });
    }
  };

  const getTimeAgo = (timestamp: string) => {
    return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-lavender/10 flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-lavender/10">
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="h-8 w-8 text-flora-sage" />
            <h1 className="text-3xl font-bold text-foreground">Task Dump</h1>
          </div>
          <p className="text-muted-foreground">
            Quickly capture any thoughts, ideas, or tasks. Organize them later! 🌸
          </p>
        </div>

        {/* Input Area */}
        <Card className="mb-8 border-2 border-flora-sage/30 shadow-lg">
          <CardContent className="pt-6">
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <Input
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Write anything here… brain dump, ideas, tasks, reminders."
                  className="text-lg h-14 border-flora-sage/40 focus:border-flora-sage"
                  maxLength={200}
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-flora-sage hover:bg-flora-sage/90 text-white"
                disabled={!newTaskTitle.trim()}
              >
                Add to Dump
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Task List */}
        {dumpedTasks.length === 0 ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="text-6xl mb-4">🧠✨</div>
            <p className="text-xl text-muted-foreground mb-2">
              Your mind is clear!
            </p>
            <p className="text-sm text-muted-foreground">
              Add a task whenever one pops into your head.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-muted-foreground mb-4">
              Captured Tasks ({dumpedTasks.length})
            </h2>
            {dumpedTasks.map((task) => (
              <Card
                key={task.id}
                className="group hover:shadow-md transition-all duration-200 animate-fade-in border-l-4 border-l-flora-peach"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="text-base font-medium text-foreground mb-1">
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Added {getTimeAgo(task.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenMoveDialog(task.id)}
                        className="hover:bg-flora-sage/10 hover:text-flora-sage"
                      >
                        <ArrowRight className="h-4 w-4 mr-1" />
                        Move
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteTask(task.id)}
                        className="hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Move Task Dialog */}
      <Dialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Move to List</DialogTitle>
            <DialogDescription>
              Choose which list to organize this task into
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {lists.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <p className="mb-4">No lists yet!</p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/flora")}
                >
                  Create Your First List
                </Button>
              </div>
            ) : (
              lists.map((list) => (
                <Button
                  key={list.id}
                  variant="outline"
                  className="w-full justify-start h-auto py-3 hover:bg-flora-sage/10 hover:border-flora-sage transition-all"
                  onClick={() => handleMoveTask(list.id)}
                >
                  <span className="text-2xl mr-3">{list.icon}</span>
                  <span className="font-medium">{list.name}</span>
                </Button>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDump;
