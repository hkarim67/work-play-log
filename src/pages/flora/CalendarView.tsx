import { useState, useEffect, useRef } from "react";
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
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Edit, Trash2 as Trash, GripVertical } from "lucide-react";

interface ScheduledTask {
  id: string;
  task_id: string;
  scheduled_date: string;
  end_date: string;
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
  const [draggedTask, setDraggedTask] = useState<ScheduledTask | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: Date; hour: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchScheduledTasks();
    
    // Set up real-time subscription
    const channel = supabase
      .channel('calendar-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'flora_scheduled_tasks'
        },
        () => {
          console.log('[Calendar] Real-time update detected, refreshing...');
          fetchScheduledTasks();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        console.error('[Calendar] No authenticated user');
        setScheduledTasks([]);
        return;
      }

      // Query scheduled tasks with joins
      const { data, error } = await supabase
        .from("flora_scheduled_tasks")
        .select(`
          id,
          task_id,
          scheduled_date,
          end_date,
          start_time,
          end_time,
          flora_tasks (
            title,
            estimated_minutes,
            user_id,
            flora_lists (
              name,
              icon
            )
          )
        `)
        .gte("scheduled_date", format(start, "yyyy-MM-dd"))
        .lte("scheduled_date", format(end, "yyyy-MM-dd"))
        .order("start_time");

      if (error) {
        console.error('[Calendar] Query error:', error);
        throw error;
      }

      console.log('[Calendar] Raw query result:', data);

      // Filter and format the results
      const formatted = (data || [])
        .filter((item: any) => {
          // Make sure the task exists and belongs to the current user
          if (!item.flora_tasks) return false;
          const task = Array.isArray(item.flora_tasks) ? item.flora_tasks[0] : item.flora_tasks;
          return task && task.user_id === user.id;
        })
        .map((item: any) => {
          const task = Array.isArray(item.flora_tasks) ? item.flora_tasks[0] : item.flora_tasks;
          const lists = task.flora_lists;
          const list = Array.isArray(lists) ? lists[0] : lists;
          
          return {
            id: item.id,
            task_id: item.task_id,
            scheduled_date: item.scheduled_date,
            end_date: item.end_date,
            start_time: item.start_time,
            end_time: item.end_time,
            task_title: task.title,
            task_estimated_minutes: task.estimated_minutes,
            list_icon: list?.icon || '📋',
            list_name: list?.name || 'Task',
          };
        });

      console.log('[Calendar] Formatted tasks:', formatted);
      setScheduledTasks(formatted);
    } catch (error) {
      console.error('[Calendar] Error loading calendar:', error);
      toast({
        title: "Error loading calendar",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
      setScheduledTasks([]);
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

  const handleDragStart = (e: React.DragEvent, task: ScheduledTask) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot({ date: day, hour });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    if (!draggedTask) return;

    // Save scroll position before updating
    const scrollTop = scrollContainerRef.current?.scrollTop || 0;

    const startHour = hour.toString().padStart(2, '0');
    const startTime = `${startHour}:00:00`;
    
    // Calculate end time based on original duration
    const originalStart = parseInt(draggedTask.start_time.split(':')[0]);
    const originalEnd = parseInt(draggedTask.end_time.split(':')[0]);
    const duration = originalEnd - originalStart;
    const endHour = (hour + duration).toString().padStart(2, '0');
    const endTime = `${endHour}:00:00`;
    
    // Calculate how many days the task spans
    const originalStartDate = new Date(draggedTask.scheduled_date);
    const originalEndDate = new Date(draggedTask.end_date);
    const daysDuration = Math.floor((originalEndDate.getTime() - originalStartDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Calculate new end_date
    const newEndDate = addDays(day, daysDuration);

    try {
      const { error } = await supabase
        .from('flora_scheduled_tasks')
        .update({
          scheduled_date: format(day, 'yyyy-MM-dd'),
          end_date: format(newEndDate, 'yyyy-MM-dd'),
          start_time: startTime,
          end_time: endTime,
        })
        .eq('id', draggedTask.id);

      if (error) throw error;

      toast({
        title: "Task rescheduled ✓",
        description: `Moved to ${format(day, 'MMM d')} at ${formatTime(startTime)}`,
      });

      await fetchScheduledTasks();
      
      // Restore scroll position after data is fetched
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = scrollTop;
        }
      }, 0);
    } catch (error) {
      console.error('Error rescheduling task:', error);
      toast({
        title: "Error rescheduling task",
        variant: "destructive",
      });
    }

    setDraggedTask(null);
  };

  const handleQuickEdit = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsEditDialogOpen(true);
  };

  const handleQuickDelete = async (scheduledTaskId: string) => {
    if (!confirm('Delete this scheduled task?')) return;
    
    try {
      const { error } = await supabase
        .from('flora_scheduled_tasks')
        .delete()
        .eq('id', scheduledTaskId);

      if (error) throw error;

      toast({
        title: "Task removed from calendar",
      });

      fetchScheduledTasks();
    } catch (error) {
      console.error('Error deleting scheduled task:', error);
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
          <div ref={scrollContainerRef} className="overflow-auto relative" style={{ maxHeight: isMobile ? "calc(100vh - 250px)" : "calc(100vh - 280px)" }}>
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
                      } ${
                        dragOverSlot?.date.getTime() === day.getTime() && dragOverSlot?.hour === hour
                          ? "bg-flora-sage/20 ring-2 ring-flora-sage ring-inset"
                          : ""
                      }`}
                      style={{ height: isMobile ? "50px" : "60px" }}
                      onClick={() => handleSlotClick(day, hour)}
                      onDragOver={(e) => handleDragOver(e, day, hour)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day, hour)}
                    />
                  ))}

                  {/* Tasks positioned absolutely */}
                  {scheduledTasks
                    .filter((task) => {
                      const taskStart = new Date(task.scheduled_date);
                      const taskEnd = new Date(task.end_date);
                      // Show task if current day is within the task's date range
                      return day >= taskStart && day <= taskEnd;
                    })
                    .map((task) => {
                      const isStartDay = isSameDay(new Date(task.scheduled_date), day);
                      const isEndDay = isSameDay(new Date(task.end_date), day);
                      const isMultiDay = task.scheduled_date !== task.end_date;
                      
                      const taskStartHour = parseInt(task.start_time.split(":")[0]);
                      if (taskStartHour < hours[0] || taskStartHour > hours[hours.length - 1]) return null;
                      
                      return (
                        <ContextMenu key={`${task.id}-${day.toString()}`}>
                          <ContextMenuTrigger>
                            <Card
                              draggable
                              onDragStart={(e) => handleDragStart(e, task)}
                              className={`absolute left-1 right-1 group cursor-move hover:shadow-md transition-all bg-gradient-to-br from-flora-peach/20 to-flora-lavender/20 border-flora-sage/30 z-10 overflow-hidden ${
                                isMultiDay ? 'border-l-4 border-l-flora-sage' : ''
                              }`}
                              style={{
                                top: isStartDay ? getTaskTopOffset(task.start_time) : 0,
                                height: isStartDay && isEndDay 
                                  ? getTaskHeight(task.start_time, task.end_time)
                                  : isStartDay
                                  ? `calc(100% - ${getTaskTopOffset(task.start_time)})`
                                  : isEndDay
                                  ? getTaskTopOffset(task.end_time)
                                  : '100%',
                                minHeight: "30px",
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTaskClick(e, task.task_id);
                              }}
                            >
                              <CardContent className="p-1.5 sm:p-2 h-full flex flex-col overflow-hidden">
                                <div className="flex items-start gap-1 sm:gap-1.5 overflow-hidden">
                                  <GripVertical className="h-3 w-3 text-muted-foreground flex-shrink-0 opacity-50 group-hover:opacity-100 transition-opacity" />
                                  <span className="text-xs sm:text-sm flex-shrink-0">{task.list_icon}</span>
                                  <div className="flex-1 min-w-0 overflow-hidden">
                                    <p className="text-xs font-medium text-foreground truncate">
                                      {task.task_title}
                                      {isMultiDay && (
                                        <span className="ml-1 text-[10px] opacity-70">
                                          {isStartDay ? '→' : isEndDay ? '←' : '↔'}
                                        </span>
                                      )}
                                    </p>
                                    <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground mt-0.5 truncate">
                                      <Clock className="h-2.5 w-2.5 sm:h-3 sm:w-3 flex-shrink-0" />
                                      <span className="truncate">
                                        {isStartDay ? formatTime(task.start_time) : '00:00'} - {isEndDay ? formatTime(task.end_time) : '23:59'}
                                      </span>
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleQuickDelete(task.id);
                                    }}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 sm:p-1 hover:bg-destructive/10 rounded flex-shrink-0"
                                    aria-label="Delete task"
                                  >
                                    <Trash className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-destructive" />
                                  </button>
                                </div>
                              </CardContent>
                            </Card>
                          </ContextMenuTrigger>
                          <ContextMenuContent>
                            <ContextMenuItem onClick={() => handleQuickEdit(task.task_id)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Edit Task
                            </ContextMenuItem>
                            <ContextMenuItem 
                              onClick={() => handleQuickDelete(task.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              Delete from Calendar
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>

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
              
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm font-semibold text-foreground mb-1">
                  📌 For immediate sync in Apple Calendar:
                </p>
                <p className="text-xs text-muted-foreground">
                  After subscribing, go to Calendar → Settings → Accounts, select "Flora Tasks", 
                  and change refresh frequency to "Every 5 minutes" for near-instant updates.
                </p>
              </div>
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
