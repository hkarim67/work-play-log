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
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface EditTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskId: string;
  onTaskUpdated: () => void;
}

interface TaskData {
  title: string;
  notes: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
}

interface ScheduledTaskData {
  id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
}

export const EditTaskDialog = ({
  open,
  onOpenChange,
  taskId,
  onTaskUpdated,
}: EditTaskDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [scheduleTask, setScheduleTask] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [existingSchedule, setExistingSchedule] = useState<ScheduledTaskData | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (open && taskId) {
      fetchTaskData();
    }
  }, [open, taskId]);

  const fetchTaskData = async () => {
    try {
      setLoadingData(true);
      
      // Fetch task data
      const { data: task, error: taskError } = await supabase
        .from("flora_tasks")
        .select("*")
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      setTitle(task.title);
      setNotes(task.notes || "");
      setEstimatedMinutes(task.estimated_minutes ? String(task.estimated_minutes) : "");
      setDueDate(task.due_date || "");

      // Check if task is scheduled
      const { data: schedule, error: scheduleError } = await supabase
        .from("flora_scheduled_tasks")
        .select("*")
        .eq("task_id", taskId)
        .maybeSingle();

      if (scheduleError) throw scheduleError;

      if (schedule) {
        setExistingSchedule(schedule);
        setScheduleTask(true);
        setScheduledDate(schedule.scheduled_date);
        setScheduledTime(schedule.start_time);
      } else {
        setExistingSchedule(null);
        setScheduleTask(false);
        setScheduledDate("");
        setScheduledTime("");
      }
    } catch (error) {
      toast({
        title: "Error loading task",
        variant: "destructive",
      });
    } finally {
      setLoadingData(false);
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

    if (notes.trim().length > 500) {
      toast({
        title: "Notes too long",
        description: "Notes must be less than 500 characters",
        variant: "destructive",
      });
      return;
    }

    if (scheduleTask && (!scheduledDate || !scheduledTime)) {
      toast({
        title: "Schedule details required",
        description: "Please provide both date and time for scheduling",
        variant: "destructive",
      });
      return;
    }

    if (scheduleTask && !estimatedMinutes) {
      toast({
        title: "Estimated time required",
        description: "Please set an estimated time to schedule this task",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      // Update the task
      const { error: taskError } = await supabase
        .from("flora_tasks")
        .update({
          title: title.trim(),
          notes: notes.trim() || null,
          estimated_minutes: estimatedMinutes ? parseInt(estimatedMinutes) : null,
          due_date: dueDate || null,
        })
        .eq("id", taskId);

      if (taskError) throw taskError;

      // Handle scheduling
      if (scheduleTask && scheduledDate && scheduledTime && estimatedMinutes) {
        const startTime = scheduledTime;
        const estimatedMins = parseInt(estimatedMinutes);
        
        // Calculate end time
        const [hours, minutes] = startTime.split(":").map(Number);
        const totalMinutes = hours * 60 + minutes + estimatedMins;
        const endHours = Math.floor(totalMinutes / 60);
        const endMinutes = totalMinutes % 60;
        const endTime = `${String(endHours).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

        if (existingSchedule) {
          // Update existing schedule
          const { error: scheduleError } = await supabase
            .from("flora_scheduled_tasks")
            .update({
              scheduled_date: scheduledDate,
              start_time: startTime,
              end_time: endTime,
            })
            .eq("id", existingSchedule.id);

          if (scheduleError) throw scheduleError;
        } else {
          // Create new schedule
          const { error: scheduleError } = await supabase
            .from("flora_scheduled_tasks")
            .insert({
              task_id: taskId,
              scheduled_date: scheduledDate,
              start_time: startTime,
              end_time: endTime,
            });

          if (scheduleError) throw scheduleError;
        }
      } else if (!scheduleTask && existingSchedule) {
        // Remove existing schedule
        const { error: deleteError } = await supabase
          .from("flora_scheduled_tasks")
          .delete()
          .eq("id", existingSchedule.id);

        if (deleteError) throw deleteError;
      }

      toast({
        title: "Task updated! 🌸",
        description: "Your changes have been saved",
      });

      onOpenChange(false);
      onTaskUpdated();
    } catch (error) {
      toast({
        title: "Error updating task",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {loadingData ? (
          <div className="p-8 text-center">
            <div className="text-muted-foreground">Loading task...</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Edit Task</DialogTitle>
              <DialogDescription>
                Update task details and scheduling
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-title">Task Title *</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="What needs to be done?"
                  maxLength={200}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-notes">Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any additional details..."
                  maxLength={500}
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="edit-estimated-time">Estimated Time</Label>
                  <Select value={estimatedMinutes} onValueChange={setEstimatedMinutes}>
                    <SelectTrigger id="edit-estimated-time">
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
                  <Label htmlFor="edit-due-date">Due Date</Label>
                  <Input
                    id="edit-due-date"
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
                    id="edit-schedule-task"
                    checked={scheduleTask}
                    onCheckedChange={(checked) => setScheduleTask(checked as boolean)}
                  />
                  <Label htmlFor="edit-schedule-task" className="cursor-pointer font-medium">
                    Schedule this task on calendar
                  </Label>
                </div>
                
                {scheduleTask && (
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="grid gap-2">
                      <Label htmlFor="edit-scheduled-date">Date</Label>
                      <Input
                        id="edit-scheduled-date"
                        type="date"
                        value={scheduledDate}
                        onChange={(e) => setScheduledDate(e.target.value)}
                        required={scheduleTask}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="edit-scheduled-time">Time</Label>
                      <Input
                        id="edit-scheduled-time"
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
              <Button type="submit" disabled={loading || loadingData}>
                {loading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
