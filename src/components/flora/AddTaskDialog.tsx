import { useState } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listId: string;
  onTaskAdded: () => void;
}

export const AddTaskDialog = ({
  open,
  onOpenChange,
  listId,
  onTaskAdded,
}: AddTaskDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleTask, setScheduleTask] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      toast({
        title: "Task title required",
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
          estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
          due_date: dueDate || null,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If scheduling is enabled, create the scheduled task
      if (scheduleTask && scheduledDate && scheduledTime && estimatedMinutes) {
        const startTime = scheduledTime;
        const estimatedMins = parseInt(estimatedMinutes);
        
        // Calculate end time
        const [hours, minutes] = startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + estimatedMins;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

        const { error: scheduleError } = await supabase
          .from("flora_scheduled_tasks")
          .insert({
            task_id: newTask.id,
            scheduled_date: scheduledDate,
            start_time: startTime,
            end_time: endTime,
          });

        if (scheduleError) throw scheduleError;
      }

      toast({
        title: "Task added! 🌸",
        description: scheduleTask ? "Your task has been created and scheduled" : "Your task has been created",
      });

      setTitle("");
      setNotes("");
      setEstimatedMinutes("");
      setDueDate("");
      setScheduleTask(false);
      setScheduledDate("");
      setScheduledTime("");
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
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
            <DialogDescription>
              Create a new task with time estimate and optional due date
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Task Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What needs to be done?"
                maxLength={200}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any additional details..."
                maxLength={500}
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="estimated-time">Estimated Time</Label>
                <Select value={estimatedMinutes} onValueChange={setEstimatedMinutes}>
                  <SelectTrigger id="estimated-time">
                    <SelectValue placeholder="Select time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                    <SelectItem value="180">3 hours</SelectItem>
                    <SelectItem value="240">4 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="due-date">Due Date</Label>
                <Input
                  id="due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>
            
            {/* Schedule Task Section */}
            <div className="grid gap-3 p-4 rounded-lg bg-flora-sage/5 border border-flora-sage/20">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="schedule-task"
                  checked={scheduleTask}
                  onCheckedChange={(checked) => setScheduleTask(checked as boolean)}
                />
                <Label htmlFor="schedule-task" className="cursor-pointer font-medium">
                  Schedule this task on calendar
                </Label>
              </div>
              
              {scheduleTask && (
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div className="grid gap-2">
                    <Label htmlFor="scheduled-date">Date</Label>
                    <Input
                      id="scheduled-date"
                      type="date"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      required={scheduleTask}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="scheduled-time">Time</Label>
                    <Input
                      id="scheduled-time"
                      type="time"
                      value={scheduledTime}
                      onChange={(e) => setScheduledTime(e.target.value)}
                      required={scheduleTask}
                    />
                  </div>
                </div>
              )}
              
              {scheduleTask && !estimatedMinutes && (
                <p className="text-xs text-muted-foreground">
                  Please set an estimated time to schedule this task
                </p>
              )}
            </div>
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
