import { useState, useEffect } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface CalendarViewProps {
  onDateSelect: (date: Date) => void;
  refreshTrigger?: number;
  timers: Timer[];
}

export const CalendarView = ({ onDateSelect, refreshTrigger, timers }: CalendarViewProps) => {
  const [date, setDate] = useState<Date>(new Date());
  const [dailyStats, setDailyStats] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    fetchDailyStats();
  }, [refreshTrigger]);

  const fetchDailyStats = async () => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("date, category, duration_seconds");

      if (error) throw error;

      const stats: Record<string, Record<string, number>> = {};

      data?.forEach((entry) => {
        const dateKey = entry.date;
        if (!stats[dateKey]) {
          stats[dateKey] = { total: 0 };
        }
        if (!stats[dateKey][entry.category]) {
          stats[dateKey][entry.category] = 0;
        }
        stats[dateKey][entry.category] += entry.duration_seconds;
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
            {timers.map((timer) => {
              const duration = selectedStats[timer.category] || 0;
              if (duration === 0) return null;
              return (
                <div key={timer.id} className="flex justify-between items-center">
                  <span className="font-medium">{timer.name}:</span>
                  <span className="font-mono">{formatDuration(duration)}</span>
                </div>
              );
            })}
            <div className="flex justify-between items-center pt-2 border-t font-bold">
              <span>Total:</span>
              <span className="font-mono">{formatDuration(selectedStats.total || 0)}</span>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};
