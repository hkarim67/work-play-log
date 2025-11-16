import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, ArrowRight, Sparkles, Edit, Check, X, Clock } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
  estimated_minutes: number | null;
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
  const [newTaskHours, setNewTaskHours] = useState("");
  const [newTaskMinutes, setNewTaskMinutes] = useState("");
  const [dumpedTasks, setDumpedTasks] = useState<DumpedTask[]>([]);
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(true);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedPriority, setSelectedPriority] = useState<"high" | "medium" | "low">("medium");
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editHours, setEditHours] = useState("");
  const [editMinutes, setEditMinutes] = useState("");

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

      const totalMinutes = (parseInt(newTaskHours) || 0) * 60 + (parseInt(newTaskMinutes) || 0);

      const { error } = await supabase
        .from("flora_dumped_tasks")
        .insert({
          user_id: user.id,
          title: newTaskTitle.trim(),
          estimated_minutes: totalMinutes > 0 ? totalMinutes : null,
        });

      if (error) throw error;

      toast({
        title: "Task captured! 💭",
        description: "Added to your brain dump",
      });

      setNewTaskTitle("");
      setNewTaskHours("");
      setNewTaskMinutes("");
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

  const handleStartEdit = (task: DumpedTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    const totalMins = task.estimated_minutes || 0;
    setEditHours(totalMins > 0 ? String(Math.floor(totalMins / 60)) : "");
    setEditMinutes(totalMins > 0 ? String(totalMins % 60) : "");
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditHours("");
    setEditMinutes("");
  };

  const handleSaveEdit = async (taskId: string) => {
    if (!editTitle.trim()) {
      toast({
        title: "Title required",
        variant: "destructive",
      });
      return;
    }

    try {
      const totalMinutes = (parseInt(editHours) || 0) * 60 + (parseInt(editMinutes) || 0);

      const { error } = await supabase
        .from("flora_dumped_tasks")
        .update({
          title: editTitle.trim(),
          estimated_minutes: totalMinutes > 0 ? totalMinutes : null,
        })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Task updated! ✨",
      });

      handleCancelEdit();
      fetchDumpedTasks();
    } catch (error) {
      toast({
        title: "Error updating task",
        variant: "destructive",
      });
    }
  };

  const handleOpenMoveDialog = (taskId: string) => {
    setSelectedTaskId(taskId);
    setSelectedPriority("medium"); // Reset to default
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
          estimated_minutes: task.estimated_minutes,
          priority: selectedPriority,
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
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    value={newTaskHours}
                    onChange={(e) => setNewTaskHours(e.target.value)}
                    placeholder="Hours"
                    className="flex-1"
                  />
                  <span className="text-muted-foreground">:</span>
                  <Input
                    type="number"
                    min="0"
                    max="59"
                    value={newTaskMinutes}
                    onChange={(e) => setNewTaskMinutes(e.target.value)}
                    placeholder="Minutes"
                    className="flex-1"
                  />
                </div>
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
                  {editingTaskId === task.id ? (
                    // Edit Mode
                    <div className="space-y-3">
                      <Input
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        placeholder="Task title"
                        maxLength={200}
                        className="text-base"
                      />
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 flex-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            min="0"
                            max="99"
                            value={editHours}
                            onChange={(e) => setEditHours(e.target.value)}
                            placeholder="Hours"
                            className="flex-1"
                          />
                          <span className="text-muted-foreground">:</span>
                          <Input
                            type="number"
                            min="0"
                            max="59"
                            value={editMinutes}
                            onChange={(e) => setEditMinutes(e.target.value)}
                            placeholder="Min"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleSaveEdit(task.id)}
                          className="bg-flora-sage hover:bg-flora-sage/90 flex-1"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Save
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancelEdit}
                          className="flex-1"
                        >
                          <X className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-base font-medium text-foreground mb-1">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>Added {getTimeAgo(task.created_at)}</span>
                          {task.estimated_minutes && task.estimated_minutes > 0 && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {Math.floor(task.estimated_minutes / 60)}h {task.estimated_minutes % 60}m
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStartEdit(task)}
                          className="hover:bg-flora-sage/10 hover:text-flora-sage"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenMoveDialog(task.id)}
                          className="hover:bg-flora-sage/10 hover:text-flora-sage"
                        >
                          <ArrowRight className="h-4 w-4" />
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
                  )}
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
              Choose which list to organize this task into and set its priority
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* Priority Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Priority</Label>
              <RadioGroup
                value={selectedPriority}
                onValueChange={(value) => setSelectedPriority(value as "high" | "medium" | "low")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="cursor-pointer font-normal">
                    High
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="cursor-pointer font-normal">
                    Medium
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="cursor-pointer font-normal">
                    Low
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* List Selection */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Select List</Label>
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
                <div className="space-y-2">
                  {lists.map((list) => (
                    <Button
                      key={list.id}
                      variant="outline"
                      className="w-full justify-start h-auto py-3 hover:bg-flora-sage/10 hover:border-flora-sage transition-all"
                      onClick={() => handleMoveTask(list.id)}
                    >
                      <span className="text-2xl mr-3">{list.icon}</span>
                      <span className="font-medium">{list.name}</span>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TaskDump;
