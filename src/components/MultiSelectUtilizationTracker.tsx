import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { TrendingUp, Target } from "lucide-react";
import { startOfToday, startOfWeek, format, subDays } from "date-fns";

interface Timer {
  id: string;
  name: string;
  category: string;
}

interface MultiSelectUtilizationTrackerProps {
  timers: Timer[];
  refreshTrigger: number;
}

export const MultiSelectUtilizationTracker = ({ timers, refreshTrigger }: MultiSelectUtilizationTrackerProps) => {
  const [selectedTimers, setSelectedTimers] = useState<string[]>([]);
  const [targetHoursDaily, setTargetHoursDaily] = useState(8);
  const [targetHoursWeekly, setTargetHoursWeekly] = useState(40);
  const [dailyHours, setDailyHours] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);

  useEffect(() => {
    if (selectedTimers.length > 0) {
      calculateUtilization();
    } else {
      setDailyHours(0);
      setWeeklyHours(0);
    }
  }, [selectedTimers, refreshTrigger]);

  const calculateUtilization = async () => {
    try {
      const today = startOfToday();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });
      
      // Get the selected categories
      const selectedCategories = timers
        .filter((t) => selectedTimers.includes(t.id))
        .map((t) => t.category);

      if (selectedCategories.length === 0) return;

      // Fetch today's entries
      const { data: todayData } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("date", format(today, "yyyy-MM-dd"))
        .in("category", selectedCategories);

      const todaySeconds = todayData?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0;
      setDailyHours(todaySeconds / 3600);

      // Fetch this week's entries (5 business days)
      const weekDates = Array.from({ length: 5 }, (_, i) => {
        const date = subDays(today, today.getDay() - 1 - i);
        return format(date >= weekStart ? date : weekStart, "yyyy-MM-dd");
      });

      const { data: weekData } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .in("date", weekDates)
        .in("category", selectedCategories);

      const weekSeconds = weekData?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0;
      setWeeklyHours(weekSeconds / 3600);
    } catch (error) {
      // Silent fail
    }
  };

  const toggleTimer = (timerId: string) => {
    setSelectedTimers((prev) =>
      prev.includes(timerId) ? prev.filter((id) => id !== timerId) : [...prev, timerId]
    );
  };

  const dailyUtilization = targetHoursDaily > 0 ? (dailyHours / targetHoursDaily) * 100 : 0;
  const weeklyUtilization = targetHoursWeekly > 0 ? (weeklyHours / targetHoursWeekly) * 100 : 0;

  const getUtilizationColor = (rate: number) => {
    if (rate >= 90) return "text-green-600 dark:text-green-400";
    if (rate >= 70) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          Multi-Timer Utilization
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Timer Selection */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Select Timers to Track</Label>
          <div className="grid grid-cols-2 gap-2">
            {timers.map((timer) => (
              <div key={timer.id} className="flex items-center gap-2">
                <Checkbox
                  id={`multi-util-${timer.id}`}
                  checked={selectedTimers.includes(timer.id)}
                  onCheckedChange={() => toggleTimer(timer.id)}
                />
                <Label
                  htmlFor={`multi-util-${timer.id}`}
                  className="text-sm cursor-pointer"
                >
                  {timer.name}
                </Label>
              </div>
            ))}
          </div>
        </div>

        {selectedTimers.length > 0 && (
          <>
            {/* Target Hours */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="multi-target-daily" className="text-sm">
                  Daily Target (hours)
                </Label>
                <Input
                  id="multi-target-daily"
                  type="number"
                  min="1"
                  max="24"
                  value={targetHoursDaily}
                  onChange={(e) => setTargetHoursDaily(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="multi-target-weekly" className="text-sm">
                  Weekly Target (hours)
                </Label>
                <Input
                  id="multi-target-weekly"
                  type="number"
                  min="1"
                  max="120"
                  value={targetHoursWeekly}
                  onChange={(e) => setTargetHoursWeekly(Number(e.target.value))}
                  className="mt-1"
                />
              </div>
            </div>

            {/* Utilization Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Daily</span>
                </div>
                <div className={`text-3xl font-bold ${getUtilizationColor(dailyUtilization)}`}>
                  {dailyUtilization.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {dailyHours.toFixed(1)}h / {targetHoursDaily}h
                </div>
              </div>

              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground">Weekly (5 days)</span>
                </div>
                <div className={`text-3xl font-bold ${getUtilizationColor(weeklyUtilization)}`}>
                  {weeklyUtilization.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {weeklyHours.toFixed(1)}h / {targetHoursWeekly}h
                </div>
              </div>
            </div>
          </>
        )}

        {selectedTimers.length === 0 && (
          <div className="text-center py-6 text-sm text-muted-foreground">
            Select timers above to track combined utilization
          </div>
        )}
      </CardContent>
    </Card>
  );
};
