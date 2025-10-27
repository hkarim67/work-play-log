import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface DailyStats {
  leisure: number;
  business: number;
  jobs: number;
  total: number;
}

interface CalendarViewProps {
  onDateSelect: (date: Date) => void;
  refreshTrigger?: number;
}

export const CalendarView = ({ onDateSelect, refreshTrigger }: CalendarViewProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [dailyStats, setDailyStats] = useState<Record<string, DailyStats>>({});

  useEffect(() => {
    fetchDailyStats();
  }, [refreshTrigger]);

  const fetchDailyStats = async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("date, category, duration_seconds");

      if (error) throw error;

      const stats: Record<string, DailyStats> = {};

      data?.forEach((entry) => {
        const dateKey = entry.date;
        if (!stats[dateKey]) {
          stats[dateKey] = { leisure: 0, business: 0, jobs: 0, total: 0 };
        }
        stats[dateKey][entry.category as keyof DailyStats] += entry.duration_seconds;
        stats[dateKey].total += entry.duration_seconds;
      });

      setDailyStats(stats);
    } catch (error) {
      console.error("Error fetching daily stats:", error);
    }
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      setDate(newDate);
      onDateSelect(newDate);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const selectedDateKey = format(date, "yyyy-MM-dd");
  const selectedStats = dailyStats[selectedDateKey];

  return (
    <Card className="p-6 space-y-4">
      <h2 className="text-2xl font-bold text-center">Calendar</h2>
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleDateSelect}
          className="rounded-md border pointer-events-auto"
        />
      </div>
      
      {selectedStats && (
        <div className="pt-4 border-t space-y-3">
          <h3 className="font-semibold text-center">
            {format(date, "MMMM d, yyyy")}
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: "hsl(270, 70%, 65%)" }}>
                Leisure:
              </span>
              <span className="font-mono">{formatDuration(selectedStats.leisure)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: "hsl(210, 80%, 55%)" }}>
                Business:
              </span>
              <span className="font-mono">{formatDuration(selectedStats.business)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-medium" style={{ color: "hsl(165, 70%, 50%)" }}>
                Jobs:
              </span>
              <span className="font-mono">{formatDuration(selectedStats.jobs)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t font-bold">
              <span>Total:</span>
              <span className="font-mono">{formatDuration(selectedStats.total)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
