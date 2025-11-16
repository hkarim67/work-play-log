import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";

interface QuickAddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scheduledDate: string;
  scheduledTime: string;
  onTaskAdded: () => void;
}

interface List {
  id: string;
  name: string;
  icon: string;
}

export const QuickAddTaskDialog = ({
  open,
  onOpenChange,
  scheduledDate,
  scheduledTime,
  onTaskAdded,
}: QuickAddTaskDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [listId, setListId] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("30");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [lists, setLists] = useState<List[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchLists();
    }
  }, [open]);

  const fetchLists = async () => {
    try {
      const { data, error } = await supabase
        .from("flora_lists")
        .select("id, name, icon")
        .order("sort_order");

      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      toast({
        title: "Error loading lists",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast({
        title: "Task title required",
        variant: "destructive",
      });
      return;
    }

    if (title.trim().length > 200) {
      toast({
        title: "Title too long",
        description: "Task title must be less than 200 characters",
        variant: "destructive",
      });
      return;
    }

    if (!listId) {
      toast({
        title: "Please select a list",
        variant: "destructive",
      });
      return;
    }

    if (notes.trim().length > 1000) {
      toast({
        title: "Notes too long",
        description: "Notes must be less than 1000 characters",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Create the task
      const { data: newTask, error: taskError } = await supabase
        .from("flora_tasks")
        .insert({
          user_id: user.id,
          list_id: listId,
          title: title.trim(),
          notes: notes.trim() || null,
          estimated_minutes: parseInt(estimatedMinutes),
          priority: priority,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Calculate end time
      const estimatedMins = parseInt(estimatedMinutes);
      const [hours, minutes] = scheduledTime.split(":").map(Number);
      const totalMinutes = hours * 60 + minutes + estimatedMins;
      const endHours = Math.floor(totalMinutes / 60) % 24;
      const endMinutes = totalMinutes % 60;
      const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

      // Schedule the task
      const { error: scheduleError } = await supabase
        .from("flora_scheduled_tasks")
        .insert({
          task_id: newTask.id,
          scheduled_date: scheduledDate,
          start_time: scheduledTime,
          end_time: endTime,
        });

      if (scheduleError) throw scheduleError;

      toast({
        title: "Task added! 🌸",
        description: "Your task has been created and scheduled",
      });

      setTitle("");
      setNotes("");
      setListId("");
      setEstimatedMinutes("30");
      setPriority("medium");
      onOpenChange(false);
      onTaskAdded();
    } catch (error) {
      toast({
        title: "Error adding task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Quick Add Task</DialogTitle>
            <DialogDescription>
              Create and schedule a task for {scheduledDate} at {scheduledTime}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="quick-title">Task Title *</Label>
              <Input
                id="quick-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                maxLength={200}
                autoFocus
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-list">List / Category *</Label>
              <Select value={listId} onValueChange={setListId}>
                <SelectTrigger id="quick-list">
                  <SelectValue placeholder="Select a list" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((list) => (
                    <SelectItem key={list.id} value={list.id}>
                      {list.icon} {list.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-notes">Notes</Label>
              <Textarea
                id="quick-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                maxLength={1000}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                {notes.length}/1000 characters
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="quick-time">Estimated Time</Label>
              <Select value={estimatedMinutes} onValueChange={setEstimatedMinutes}>
                <SelectTrigger id="quick-time">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <RadioGroup value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="low" id="quick-low" />
                <Label htmlFor="quick-low" className="font-normal cursor-pointer">Low (Green)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="quick-medium" />
                <Label htmlFor="quick-medium" className="font-normal cursor-pointer">Medium (Orange)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="quick-high" />
                <Label htmlFor="quick-high" className="font-normal cursor-pointer">High (Red)</Label>
              </div>
            </RadioGroup>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Adding..." : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
