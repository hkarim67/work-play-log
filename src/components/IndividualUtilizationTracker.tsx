import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { TrendingUp, Target } from "lucide-react";
import { startOfToday, startOfWeek, format, subDays } from "date-fns";

interface Timer {
  id: string;
  name: string;
  category: string;
}

interface IndividualUtilizationTrackerProps {
  timer: Timer;
  refreshTrigger: number;
}

export const IndividualUtilizationTracker = ({ timer, refreshTrigger }: IndividualUtilizationTrackerProps) => {
  const [targetHoursDaily, setTargetHoursDaily] = useState(8);
  const [targetHoursWeekly, setTargetHoursWeekly] = useState(40);
  const [dailyHours, setDailyHours] = useState(0);
  const [weeklyHours, setWeeklyHours] = useState(0);

  useEffect(() => {
    calculateUtilization();
  }, [timer.id, refreshTrigger]);

  const calculateUtilization = async () => {
    try {
      const today = startOfToday();
      const weekStart = startOfWeek(today, { weekStartsOn: 1 });

      // Fetch today's entries
      const { data: todayData } = await supabase
        .from("time_entries")
        .select("duration_seconds")
        .eq("date", format(today, "yyyy-MM-dd"))
        .eq("category", timer.category);

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
        .eq("category", timer.category);

      const weekSeconds = weekData?.reduce((sum, entry) => sum + (entry.duration_seconds || 0), 0) || 0;
      setWeeklyHours(weekSeconds / 3600);
    } catch (error) {
      // Silent fail
    }
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
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4" />
          {timer.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Target Hours */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`target-daily-${timer.id}`} className="text-xs">
              Daily Target
            </Label>
            <Input
              id={`target-daily-${timer.id}`}
              type="number"
              min="1"
              max="24"
              value={targetHoursDaily}
              onChange={(e) => setTargetHoursDaily(Number(e.target.value))}
              className="mt-1 h-8"
            />
          </div>
          <div>
            <Label htmlFor={`target-weekly-${timer.id}`} className="text-xs">
              Weekly Target
            </Label>
            <Input
              id={`target-weekly-${timer.id}`}
              type="number"
              min="1"
              max="120"
              value={targetHoursWeekly}
              onChange={(e) => setTargetHoursWeekly(Number(e.target.value))}
              className="mt-1 h-8"
            />
          </div>
        </div>

        {/* Utilization Stats */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Daily</span>
            </div>
            <div className={`text-2xl font-bold ${getUtilizationColor(dailyUtilization)}`}>
              {dailyUtilization.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {dailyHours.toFixed(1)}h / {targetHoursDaily}h
            </div>
          </div>

          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Weekly</span>
            </div>
            <div className={`text-2xl font-bold ${getUtilizationColor(weeklyUtilization)}`}>
              {weeklyUtilization.toFixed(0)}%
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {weeklyHours.toFixed(1)}h / {targetHoursWeekly}h
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
