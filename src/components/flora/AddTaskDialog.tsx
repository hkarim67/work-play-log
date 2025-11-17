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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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
  const [estimatedHours, setEstimatedHours] = useState<string>("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleTask, setScheduleTask] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
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

      // Calculate total minutes from hours and minutes
      const totalMinutes = (parseInt(estimatedHours) || 0) * 60 + (parseInt(estimatedMinutes) || 0);
      
      // Create the task
      const { data: newTask, error: taskError } = await supabase
        .from("flora_tasks")
        .insert({
          user_id: user.id,
          list_id: listId,
          title: title.trim(),
          notes: notes.trim() || null,
          estimated_minutes: totalMinutes > 0 ? totalMinutes : null,
          due_date: dueDate || null,
          priority: priority,
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // If scheduling is enabled, create the scheduled task
      if (scheduleTask && scheduledDate && scheduledTime && totalMinutes > 0) {
        const startTime = scheduledTime;
        const estimatedMins = totalMinutes;
        
        // Calculate end time
        const [hours, minutes] = startTime.split(":").map(Number);
        const totalMins = hours * 60 + minutes + estimatedMins;
        const endHours = Math.floor(totalMins / 60);
        const endMinutes = totalMins % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

        const { error: scheduleError } = await supabase
          .from("flora_scheduled_tasks")
          .insert({
            task_id: newTask.id,
            scheduled_date: scheduledDate,
            end_date: scheduledDate,
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
      setEstimatedHours("");
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
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Estimated Time</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Input
                      id="estimated-hours"
                      type="number"
                      min="0"
                      max="99"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      placeholder="Hours"
                    />
                  </div>
                  <div>
                    <Input
                      id="estimated-minutes"
                      type="number"
                      min="0"
                      max="59"
                      value={estimatedMinutes}
                      onChange={(e) => setEstimatedMinutes(e.target.value)}
                      placeholder="Minutes"
                    />
                  </div>
                </div>
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
            
            {/* Priority Section */}
            <div className="space-y-2">
              <Label>Priority</Label>
              <RadioGroup value={priority} onValueChange={(value: "high" | "medium" | "low") => setPriority(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="high" id="high" />
                  <Label htmlFor="high" className="font-normal cursor-pointer">High (Green)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="medium" id="medium" />
                  <Label htmlFor="medium" className="font-normal cursor-pointer">Medium (Orange)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="low" id="low" />
                  <Label htmlFor="low" className="font-normal cursor-pointer">Low (Red)</Label>
                </div>
              </RadioGroup>
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
