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
import { format, addDays, startOfWeek, startOfDay, isSameDay } from "date-fns";
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

type ViewType = "day" | "3day" | "week";

const CalendarView = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [viewType, setViewType] = useState<ViewType>(isMobile ? "day" : "week");
  const [currentDate, setCurrentDate] = useState(new Date());
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
  }, [currentDate, viewType]);

  const getDaysToShow = () => {
    if (viewType === "day") return 1;
    if (viewType === "3day") return 3;
    return 7;
  };

  const getStartDate = () => {
    if (viewType === "week") return startOfWeek(currentDate, { weekStartsOn: 1 });
    return startOfDay(currentDate);
  };

  const getDateRange = () => {
    const start = getStartDate();
    const daysToShow = getDaysToShow();
    return { start, end: addDays(start, daysToShow - 1) };
  };

  const fetchScheduledTasks = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

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
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"))
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

  const displayDays = Array.from({ length: getDaysToShow() }, (_, i) => addDays(getStartDate(), i));
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 (24 hours)

  const navigateDate = (direction: "prev" | "next") => {
    const daysToMove = getDaysToShow();
    setCurrentDate(prev => addDays(prev, direction === "prev" ? -daysToMove : daysToMove));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getTasksForDayAndHour = (day: Date, hour: number) => {
    return scheduledTasks.filter((task) => {
      if (!isSameDay(new Date(task.scheduled_date), day)) return false;
      const taskStartHour = parseInt(task.start_time.split(":")[0]);
      return taskStartHour === hour;
    });
  };

  const getTaskDuration = (startTime: string, endTime: string) => {
    const [startHour, startMin] = startTime.split(":").map(Number);
    const [endHour, endMin] = endTime.split(":").map(Number);
    const startInMinutes = startHour * 60 + startMin;
    const endInMinutes = endHour * 60 + endMin;
    return (endInMinutes - startInMinutes) / 60; // Duration in hours
  };

  const getTaskTopOffset = (startTime: string) => {
    const [hour, minutes] = startTime.split(":").map(Number);
    const baseHour = hours[0]; // First hour shown (midnight)
    const hourOffset = hour - baseHour;
    const minuteOffset = minutes / 60;
    // Calculate as percentage of total calendar height (all hours)
    return `${((hourOffset + minuteOffset) / hours.length) * 100}%`;
  };

  const getTaskHeight = (startTime: string, endTime: string) => {
    const duration = getTaskDuration(startTime, endTime);
    // Calculate as percentage of total calendar height (all hours)
    return `${(duration / hours.length) * 100}%`;
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
    downloadICSFile(icsContent, `flora-calendar-${format(getStartDate(), "yyyy-MM-dd")}.ics`);
    
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
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Calendar</h1>
            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleShowSubscription}
              >
                <LinkIcon className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Live Sync</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCalendar}
                disabled={scheduledTasks.length === 0}
              >
                <Download className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Export</span>
              </Button>
            </div>
          </div>

          {/* View Toggle & Navigation */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
              <Button
                variant={viewType === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewType("day")}
                className="text-xs sm:text-sm h-8"
              >
                Day
              </Button>
              <Button
                variant={viewType === "3day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewType("3day")}
                className="text-xs sm:text-sm h-8"
              >
                3-Day
              </Button>
              <Button
                variant={viewType === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewType("week")}
                className="text-xs sm:text-sm h-8"
              >
                Week
              </Button>
            </div>

            <div className="flex items-center gap-1 sm:gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("prev")}
                className="h-8 px-2 sm:px-3"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="h-8 px-2 sm:px-3 text-xs sm:text-sm"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateDate("next")}
                className="h-8 px-2 sm:px-3"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {/* Day Headers */}
          <div className={`grid border-b bg-muted/30`} style={{ gridTemplateColumns: `60px repeat(${getDaysToShow()}, 1fr)` }}>
            <div className="p-2 sm:p-3 border-r flex items-center justify-center">
              <div className="text-xs font-medium text-muted-foreground">Time</div>
            </div>
            {displayDays.map((day) => (
              <div
                key={day.toString()}
                className={`p-2 sm:p-3 border-r last:border-r-0 text-center ${
                  isToday(day) ? "bg-flora-sage/10" : ""
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {format(day, isMobile ? "EEE" : "EEEE")}
                </div>
                <div
                  className={`text-base sm:text-lg font-semibold ${
                    isToday(day) ? "text-flora-sage" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Time Slots */}
          <div className="overflow-auto relative" style={{ maxHeight: isMobile ? "calc(100vh - 250px)" : "calc(100vh - 280px)" }}>
            <div className="grid" style={{ gridTemplateColumns: `60px repeat(${getDaysToShow()}, 1fr)` }}>
              {/* Time labels column */}
              <div>
                {hours.map((hour) => (
                  <div key={hour} className="border-b border-r bg-muted/30 flex items-start p-2 sm:p-3" style={{ height: isMobile ? "50px" : "60px" }}>
                    <div className="text-xs text-muted-foreground">
                      {formatHourLabel(hour)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Day columns with tasks */}
              {displayDays.map((day) => (
                <div key={day.toString()} className="border-r last:border-r-0 relative">
                  {/* Hour grid */}
                  {hours.map((hour) => (
                    <div
                      key={`${day.toString()}-${hour}`}
                      className={`border-b cursor-pointer hover:bg-flora-sage/5 transition-colors ${
                        isToday(day) ? "bg-flora-sage/5" : ""
                      }`}
                      style={{ height: isMobile ? "50px" : "60px" }}
                      onClick={() => handleSlotClick(day, hour)}
                    />
                  ))}

                  {/* Tasks positioned absolutely */}
                  {scheduledTasks
                    .filter((task) => isSameDay(new Date(task.scheduled_date), day))
                    .map((task) => {
                      const taskStartHour = parseInt(task.start_time.split(":")[0]);
                      if (taskStartHour < hours[0] || taskStartHour > hours[hours.length - 1]) return null;
                      
                      return (
                        <Card
                          key={task.id}
                          className="absolute left-1 right-1 group cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-flora-peach/20 to-flora-lavender/20 border-flora-sage/30 z-10"
                          style={{
                            top: getTaskTopOffset(task.start_time),
                            height: getTaskHeight(task.start_time, task.end_time),
                            minHeight: "30px",
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTaskClick(e, task.task_id);
                          }}
                        >
                          <CardContent className="p-1.5 sm:p-2 h-full flex flex-col">
                            <div className="flex items-start gap-1 sm:gap-1.5">
                              <span className="text-xs sm:text-sm">{task.list_icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {task.task_title}
                                </p>
                                <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                                  <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                  {formatTime(task.start_time)} - {formatTime(task.end_time)}
                                </div>
                              </div>
                              <button
                                onClick={(e) => handleDeleteTask(e, task.id)}
                                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 sm:p-1 hover:bg-destructive/10 rounded flex-shrink-0"
                                aria-label="Delete task"
                              >
                                <Trash2 className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {scheduledTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">📅</div>
            <p className="text-muted-foreground mb-4">No scheduled tasks yet</p>
            <p className="text-sm text-muted-foreground">
              Click on any time slot to add a task
            </p>
          </div>
        )}
      </main>

      {selectedSlot && (
        <QuickAddTaskDialog
          open={isQuickAddOpen}
          onOpenChange={setIsQuickAddOpen}
          scheduledDate={selectedSlot.date}
          scheduledTime={selectedSlot.time}
          onTaskAdded={fetchScheduledTasks}
        />
      )}

      {editingTaskId && (
        <EditTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          taskId={editingTaskId}
          onTaskUpdated={fetchScheduledTasks}
        />
      )}

      {/* Calendar Subscription Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Live Calendar Sync 🔄</DialogTitle>
            <DialogDescription>
              Subscribe to your Flora calendar in Apple Calendar or other calendar apps. Your calendar will automatically update when you add or modify tasks.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 text-sm">How to subscribe:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                <li>Copy the subscription URL below</li>
                <li>Open Apple Calendar (or your calendar app)</li>
                <li>Go to File → New Calendar Subscription</li>
                <li>Paste the URL and click Subscribe</li>
              </ol>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Subscription URL:</label>
              <div className="flex gap-2">
                <Input
                  value={subscriptionUrl}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  onClick={copySubscriptionUrl}
                  variant="outline"
                  size="sm"
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className="bg-flora-sage/10 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Note:</strong> Keep this URL private. Anyone with this link can view your scheduled tasks. The calendar updates automatically when you make changes in Flora.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CalendarView;
