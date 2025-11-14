import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { QuickAddTaskDialog } from "@/components/flora/QuickAddTaskDialog";
import { format, addDays, startOfWeek, isSameDay } from "date-fns";

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
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);

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

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));
  const hours = Array.from({ length: 24 }, (_, i) => i); // 0-23 (24 hours)

  const getTasksForDayAndHour = (day: Date, hour: number) => {
    return scheduledTasks.filter((task) => {
      if (!isSameDay(new Date(task.scheduled_date), day)) return false;
      const taskHour = parseInt(task.start_time.split(":")[0]);
      return taskHour === hour;
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

  const handleSlotClick = (day: Date, hour: number) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const timeStr = `${String(hour).padStart(2, "0")}:00`;
    setSelectedSlot({ date: dateStr, time: timeStr });
    setIsQuickAddOpen(true);
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
      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-1">Calendar</h1>
            <p className="text-sm text-muted-foreground">
              💡 Click on any time slot to quickly add a task
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, -7))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="bg-card rounded-lg border shadow-sm overflow-hidden">
          {/* Week Header */}
          <div className="grid grid-cols-8 border-b bg-muted/30">
            <div className="p-3 border-r flex items-center justify-center">
              <div className="text-xs font-medium text-muted-foreground">Time</div>
            </div>
            {weekDays.map((day) => (
              <div
                key={day.toString()}
                className={`p-3 border-r last:border-r-0 text-center ${
                  isToday(day) ? "bg-flora-sage/10" : ""
                }`}
              >
                <div className="text-xs text-muted-foreground mb-1">
                  {format(day, "EEE")}
                </div>
                <div
                  className={`text-lg font-semibold ${
                    isToday(day) ? "text-flora-sage" : "text-foreground"
                  }`}
                >
                  {format(day, "d")}
                </div>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="overflow-y-auto max-h-[calc(100vh-280px)]">
            {hours.map((hour) => (
              <div key={hour} className="grid grid-cols-8 border-b last:border-b-0 min-h-[60px]">
                <div className="p-3 border-r bg-muted/30 flex items-start">
                  <div className="text-xs text-muted-foreground">
                    {formatHourLabel(hour)}
                  </div>
                </div>
                {weekDays.map((day) => {
                  const tasksInSlot = getTasksForDayAndHour(day, hour);
                  return (
                    <div
                      key={`${day.toString()}-${hour}`}
                      className={`p-2 border-r last:border-r-0 cursor-pointer hover:bg-flora-sage/5 transition-colors ${
                        isToday(day) ? "bg-flora-sage/5" : ""
                      }`}
                      onClick={() => handleSlotClick(day, hour)}
                    >
                      {tasksInSlot.map((task) => (
                        <Card
                          key={task.id}
                          className="mb-2 cursor-pointer hover:shadow-md transition-shadow bg-gradient-to-br from-flora-peach/20 to-flora-lavender/20 border-flora-sage/30"
                        >
                          <CardContent className="p-2">
                            <div className="flex items-start gap-1.5 mb-1">
                              <span className="text-sm">{task.list_icon}</span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">
                                  {task.task_title}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(task.start_time)} - {formatTime(task.end_time)}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  );
                })}
              </div>
            ))}
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
    </div>
  );
};

export default CalendarView;
