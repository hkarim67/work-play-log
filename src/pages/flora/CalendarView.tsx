import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Plus, Download, Link as LinkIcon, Trash2, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuickAddTaskDialog } from "@/components/flora/QuickAddTaskDialog";
import { EditTaskDialog } from "@/components/flora/EditTaskDialog";
import { generateICSFile, downloadICSFile } from "@/lib/calendarExport";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

interface ScheduledTask {
  id: string;
  task_id: string;
  scheduled_date: string;
  start_time: string;
  end_time: string;
  task_title: string;
  task_estimated_minutes: number | null;
  list_icon: string;
  list_name: string;
}

const CalendarView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [subscriptionUrl, setSubscriptionUrl] = useState("");

  useEffect(() => {
    fetchScheduledTasks();
  }, [currentWeekStart]);

  const fetchScheduledTasks = async () => {
    try {
      setLoading(true);
      const weekEnd = addDays(currentWeekStart, 6);

      const { data, error } = await supabase
        .from("flora_scheduled_tasks")
        .select(`
          id,
          task_id,
          scheduled_date,
          start_time,
          end_time,
          flora_tasks (
            title,
            estimated_minutes,
            flora_lists (
              name,
              icon
            )
          )
        `)
        .gte("scheduled_date", format(currentWeekStart, "yyyy-MM-dd"))
        .lte("scheduled_date", format(weekEnd, "yyyy-MM-dd"))
        .order("start_time");

      if (error) throw error;

      const formatted = data.map((item: any) => ({
        id: item.id,
        task_id: item.task_id,
        scheduled_date: item.scheduled_date,
        start_time: item.start_time,
        end_time: item.end_time,
        task_title: item.flora_tasks.title,
        task_estimated_minutes: item.flora_tasks.estimated_minutes,
        list_icon: item.flora_tasks.flora_lists.icon,
        list_name: item.flora_tasks.flora_lists.name,
      }));

      setScheduledTasks(formatted);
    } catch (error) {
      toast({
        title: "Error loading calendar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show 3 days on mobile, 7 on desktop
  const daysToShow = isMobile ? 3 : 7;
  const weekDays = Array.from({ length: daysToShow }, (_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 (24 hours)

  // Get tasks for a specific day across all hours
  const getTasksForDay = (day: Date) => {
    return scheduledTasks.filter((task) => 
      isSameDay(new Date(task.scheduled_date), day)
    );
  };

  // Calculate task position and height based on time
  const getTaskStyle = (task: ScheduledTask, overlappingTasks: ScheduledTask[], index: number) => {
    const [startHour, startMinute] = task.start_time.split(":").map(Number);
    const [endHour, endMinute] = task.end_time.split(":").map(Number);
    
    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;
    const durationInMinutes = endInMinutes - startInMinutes;
    
    // Each hour slot is 80px on desktop, 60px on mobile
    const hourHeight = isMobile ? 60 : 80;
    const top = (startInMinutes / 60) * hourHeight;
    const height = (durationInMinutes / 60) * hourHeight;
    
    // Handle overlapping tasks
    const totalOverlapping = overlappingTasks.length;
    const width = totalOverlapping > 1 ? `${100 / totalOverlapping}%` : '100%';
    const left = totalOverlapping > 1 ? `${(index / totalOverlapping) * 100}%` : '0';
    
    return { top, height, width, left };
  };

  // Find overlapping tasks
  const findOverlappingTasks = (task: ScheduledTask, dayTasks: ScheduledTask[]) => {
    const [taskStartHour, taskStartMinute] = task.start_time.split(":").map(Number);
    const [taskEndHour, taskEndMinute] = task.end_time.split(":").map(Number);
    const taskStart = taskStartHour * 60 + taskStartMinute;
    const taskEnd = taskEndHour * 60 + taskEndMinute;
    
    return dayTasks.filter(other => {
      const [otherStartHour, otherStartMinute] = other.start_time.split(":").map(Number);
      const [otherEndHour, otherEndMinute] = other.end_time.split(":").map(Number);
      const otherStart = otherStartHour * 60 + otherStartMinute;
      const otherEnd = otherEndHour * 60 + otherEndMinute;
      
      return (taskStart < otherEnd && taskEnd > otherStart);
    });
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatHourLabel = (hour: number) => {
    if (hour === 0) return "12:00 AM";
    if (hour === 12) return "12:00 PM";
    if (hour < 12) return `${hour}:00 AM`;
    return `${hour - 12}:00 PM`;
  };

  const goToToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  };

  const goToPreviousWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, isMobile ? -3 : -7));
  };

  const goToNextWeek = () => {
    setCurrentWeekStart(addDays(currentWeekStart, isMobile ? 3 : 7));
  };

  const handleSlotClick = (day: Date, hour: number) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    setSelectedSlot({ date: dateStr, time: timeStr });
    setIsQuickAddOpen(true);
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation(); // Prevent slot click
    setEditingTaskId(taskId);
    setIsEditDialogOpen(true);
  };

  const handleExportCalendar = () => {
    const events = scheduledTasks.map((task) => ({
      title: `${task.list_icon} ${task.task_title}`,
      description: `List: ${task.list_name}`,
      startDate: task.scheduled_date,
      startTime: task.start_time,
      endTime: task.end_time,
    }));

    const icsContent = generateICSFile(events);
    downloadICSFile(icsContent, `flora-calendar-${format(currentWeekStart, "yyyy-MM-dd")}.ics`);
    
    toast({
      title: "Calendar exported! 📅",
      description: "Your calendar file has been downloaded. Import it into Apple Calendar or Outlook.",
    });
  };

  const handleDeleteTask = async (e: React.MouseEvent, scheduledTaskId: string) => {
    e.stopPropagation(); // Prevent other click handlers
    
    if (!confirm("Delete this task completely?")) return;

    try {
      // First, get the task_id from the scheduled task
      const { data: scheduledTask, error: fetchError } = await supabase
        .from("flora_scheduled_tasks")
        .select("task_id")
        .eq("id", scheduledTaskId)
        .single();

      if (fetchError) throw fetchError;

      // Delete the scheduled task entry
      const { error: deleteScheduledError } = await supabase
        .from("flora_scheduled_tasks")
        .delete()
        .eq("id", scheduledTaskId);

      if (deleteScheduledError) throw deleteScheduledError;

      // Delete the actual task from flora_tasks
      const { error: deleteTaskError } = await supabase
        .from("flora_tasks")
        .delete()
        .eq("id", scheduledTask.task_id);

      if (deleteTaskError) throw deleteTaskError;

      toast({
        title: "Task deleted! 🗑️",
        description: "Task has been completely removed from your list",
      });

      fetchScheduledTasks();
    } catch (error) {
      toast({
        title: "Error deleting task",
        variant: "destructive",
      });
    }
  };

  const handleShowSubscription = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Get the Supabase project URL
      const projectUrl = import.meta.env.VITE_SUPABASE_URL;
      const subscriptionUrl = `${projectUrl}/functions/v1/calendar-feed?userId=${user.id}`;
      
      setSubscriptionUrl(subscriptionUrl);
      setSubscriptionDialogOpen(true);
    } catch (error) {
      toast({
        title: "Error generating subscription link",
        variant: "destructive",
      });
    }
  };

  const copySubscriptionUrl = () => {
    navigator.clipboard.writeText(subscriptionUrl);
    toast({
      title: "Copied! 📋",
      description: "Calendar subscription URL copied to clipboard",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading calendar...</div>
      </div>
    );
  }

  const isToday = (day: Date) => isSameDay(day, new Date());

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-lavender/10">
      <main className="container mx-auto px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header section - simplified on mobile */}
        <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/flora")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calendar</h1>
              {!isMobile && (
                <p className="text-xs sm:text-sm text-muted-foreground">
                  💡 Click any time slot to add a task
                </p>
              )}
            </div>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Week navigation */}
            <div className="flex items-center justify-between p-3 sm:p-4 border-b border-border bg-muted/30">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousWeek}
                className="shrink-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="shrink-0 hidden sm:inline-flex"
                >
                  Today
                </Button>
                <span className="text-sm font-medium">
                  {format(currentWeekStart, "MMM d")} - {format(addDays(currentWeekStart, daysToShow - 1), "MMM d, yyyy")}
                </span>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextWeek}
                className="shrink-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            {/* Action buttons - hide on mobile for cleaner layout */}
            {!isMobile && (
              <div className="flex gap-2 p-3 sm:p-4 border-b border-border">
                <Button
                  onClick={handleExportCalendar}
                  variant="outline"
                  size="sm"
                  disabled={scheduledTasks.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={handleShowSubscription}
                  variant="outline"
                  size="sm"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Live Sync
                </Button>
              </div>
            )}

            {/* Calendar grid */}
            <div className="overflow-x-auto">
              <div className={isMobile ? "min-w-full" : "min-w-[800px]"}>
                {/* Header with day names */}
                <div className={`grid border-b border-border sticky top-0 bg-background z-10 ${isMobile ? 'grid-cols-4' : 'grid-cols-8'}`}>
                  <div className={`p-2 text-xs font-medium text-muted-foreground border-r border-border ${isMobile ? 'text-center' : ''}`}>
                    {isMobile ? '' : 'Time'}
                  </div>
                  {weekDays.map((day, i) => (
                    <div
                      key={i}
                      className={`p-2 text-center text-xs sm:text-sm font-medium border-r border-border last:border-r-0 ${
                        isToday(day) ? 'bg-flora-sage/10' : ''
                      }`}
                    >
                      <div className="font-semibold">{format(day, isMobile ? "EEE" : "EEE")}</div>
                      <div className={`text-xs ${isToday(day) ? 'text-flora-sage font-semibold' : 'text-muted-foreground'}`}>
                        {format(day, "MMM d")}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Time grid with tasks stretching across hours */}
                <div className="relative">
                  <div className={`grid ${isMobile ? 'grid-cols-4' : 'grid-cols-8'}`}>
                    {/* Time labels column */}
                    <div className="border-r border-border">
                      {hours.map((hour) => (
                        <div
                          key={hour}
                          className={`border-b border-border text-xs text-muted-foreground flex items-start justify-center pt-1 ${isMobile ? 'h-[60px]' : 'h-[80px]'}`}
                        >
                          {isMobile ? hour : formatHourLabel(hour)}
                        </div>
                      ))}
                    </div>

                    {/* Day columns with tasks */}
                    {weekDays.map((day, dayIndex) => {
                      const dayTasks = getTasksForDay(day);
                      return (
                        <div
                          key={dayIndex}
                          className={`border-r border-border last:border-r-0 relative ${
                            isToday(day) ? 'bg-flora-sage/5' : ''
                          }`}
                        >
                          {/* Hour slots for clicking */}
                          {hours.map((hour) => (
                            <div
                              key={hour}
                              className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${isMobile ? 'h-[60px]' : 'h-[80px]'}`}
                              onClick={() => handleSlotClick(day, hour)}
                            />
                          ))}

                          {/* Tasks overlay - positioned absolutely */}
                          {dayTasks.map((task) => {
                            const overlappingTasks = findOverlappingTasks(task, dayTasks);
                            const taskIndex = overlappingTasks.indexOf(task);
                            const style = getTaskStyle(task, overlappingTasks, taskIndex);
                            
                            return (
                              <div
                                key={task.id}
                                onClick={(e) => {
                                  handleTaskClick(e, task.task_id);
                                }}
                                className="absolute bg-flora-secondary/90 hover:bg-flora-secondary rounded-md cursor-pointer transition-colors overflow-hidden group border border-flora-secondary-foreground/20"
                                style={{
                                  top: `${style.top}px`,
                                  height: `${style.height}px`,
                                  width: style.width,
                                  left: style.left,
                                  minHeight: '30px',
                                  padding: isMobile ? '4px' : '8px',
                                }}
                              >
                                <div className="flex flex-col h-full">
                                  <div className="flex items-start justify-between gap-1 mb-1">
                                    <div className={`font-medium text-flora-secondary-foreground ${isMobile ? 'text-xs' : 'text-sm'} line-clamp-2`}>
                                      <span className="mr-1">{task.list_icon}</span>
                                      {task.task_title}
                                    </div>
                                    {!isMobile && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100 shrink-0"
                                        onClick={(e) => {
                                          handleDeleteTask(e, task.id);
                                        }}
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    )}
                                  </div>
                                  <div className={`text-flora-secondary-foreground/70 ${isMobile ? 'text-xs' : 'text-xs'}`}>
                                    {formatTime(task.start_time)} - {formatTime(task.end_time)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile action buttons at bottom */}
        {isMobile && (
          <div className="flex gap-2 mt-4">
            <Button
              onClick={handleExportCalendar}
              variant="outline"
              size="sm"
              disabled={scheduledTasks.length === 0}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button
              onClick={handleShowSubscription}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Live Sync
            </Button>
          </div>
        )}
      </main>

      {/* Quick Add Dialog */}
      <QuickAddTaskDialog
        open={isQuickAddOpen}
        onOpenChange={setIsQuickAddOpen}
        onTaskAdded={fetchScheduledTasks}
        scheduledDate={selectedSlot?.date || ""}
        scheduledTime={selectedSlot?.time || ""}
      />

      {/* Edit Task Dialog */}
      <EditTaskDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        taskId={editingTaskId || ""}
        onTaskUpdated={fetchScheduledTasks}
      />

      {/* Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Live Calendar Sync</DialogTitle>
            <DialogDescription>
              Subscribe to this URL in your calendar app (Apple Calendar, Google Calendar, etc.)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={subscriptionUrl}
                readOnly
                className="flex-1"
              />
              <Button onClick={copySubscriptionUrl} variant="outline">
                Copy
              </Button>
            </div>
            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Instructions:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Copy the URL above</li>
                <li>Open your calendar app</li>
                <li>Look for "Add Calendar" or "Subscribe to Calendar"</li>
                <li>Paste the URL</li>
              </ol>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
