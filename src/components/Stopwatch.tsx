import { useState, useEffect, useRef } from "react";
import { Play, Pause, Square, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface StopwatchProps {
  category: "leisure" | "business" | "jobs";
  title: string;
  onTimeUpdate?: () => void;
}

export const Stopwatch = ({ category, title, onTimeUpdate }: StopwatchProps) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const categoryColors = {
    leisure: "bg-gradient-to-br from-[hsl(270,70%,65%)] to-[hsl(270,80%,45%)]",
    business: "bg-gradient-to-br from-[hsl(210,80%,55%)] to-[hsl(210,90%,35%)]",
    jobs: "bg-gradient-to-br from-[hsl(165,70%,50%)] to-[hsl(165,80%,35%)]",
  };

  const categoryBorders = {
    leisure: "border-[hsl(270,70%,65%)]",
    business: "border-[hsl(210,80%,55%)]",
    jobs: "border-[hsl(165,70%,50%)]",
  };

  useEffect(() => {
    if (isRunning && startTimeRef.current) {
      intervalRef.current = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current!.getTime()) / 1000);
        setSeconds(elapsed);
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning]);

  // Handle page close/refresh - submit time entry if timer is running
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isRunning && seconds > 0) {
        const now = new Date();
        const startTime = new Date(now);
        startTime.setHours(12, 0, 0, 0);
        const endTime = new Date(startTime);
        endTime.setSeconds(endTime.getSeconds() + seconds);

        // Delete current entry if it exists
        if (currentEntryId) {
          await supabase.from("time_entries").delete().eq("id", currentEntryId);
        }

        // Create final entry
        await supabase.from("time_entries").insert({
          category,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_seconds: seconds,
          date: format(now, "yyyy-MM-dd"),
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, seconds, currentEntryId, category]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const handleStart = async () => {
    try {
      // If resuming from pause, adjust start time to account for elapsed seconds
      if (currentEntryId && seconds > 0) {
        startTimeRef.current = new Date(Date.now() - seconds * 1000);
        setIsRunning(true);
        return;
      }

      // Starting fresh
      startTimeRef.current = new Date();
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          category,
          start_time: startTimeRef.current.toISOString(),
          duration_seconds: 0,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntryId(data.id);
      setIsRunning(true);
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handlePause = async () => {
    if (!currentEntryId) return;

    try {
      const { error } = await supabase
        .from("time_entries")
        .update({
          duration_seconds: seconds,
        })
        .eq("id", currentEntryId);

      if (error) throw error;

      setIsRunning(false);
    } catch (error) {
      console.error("Error pausing timer:", error);
      toast.error("Failed to pause timer");
    }
  };

  const handleStop = async () => {
    if (!currentEntryId) return;

    try {
      const endTime = new Date();
      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: seconds,
        })
        .eq("id", currentEntryId);

      if (error) throw error;

      setIsRunning(false);
      setSeconds(0);
      setCurrentEntryId(null);
      startTimeRef.current = null;
      onTimeUpdate?.();
      toast.success(`${title} session saved: ${formatTime(seconds)}`);
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const handleReset = async () => {
    if (currentEntryId && isRunning) {
      try {
        await supabase.from("time_entries").delete().eq("id", currentEntryId);
      } catch (error) {
        console.error("Error deleting entry:", error);
      }
    }
    setIsRunning(false);
    setSeconds(0);
    setCurrentEntryId(null);
    startTimeRef.current = null;
    toast.success(`${title} timer reset`);
  };

  const handleSubmit = async () => {
    if (seconds === 0) {
      toast.error("No time to submit");
      return;
    }

    try {
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(12, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setSeconds(endTime.getSeconds() + seconds);

      // If there's a current running entry, delete it first
      if (currentEntryId) {
        await supabase.from("time_entries").delete().eq("id", currentEntryId);
      }

      const { error } = await supabase.from("time_entries").insert({
        category,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: seconds,
        date: format(now, "yyyy-MM-dd"),
      });

      if (error) throw error;

      setIsRunning(false);
      setSeconds(0);
      setCurrentEntryId(null);
      startTimeRef.current = null;
      onTimeUpdate?.();
      toast.success(`${title} time saved: ${formatTime(seconds)}`);
    } catch (error) {
      console.error("Error submitting time:", error);
      toast.error("Failed to save time entry");
    }
  };

  return (
    <Card
      className={`relative overflow-hidden border-2 ${categoryBorders[category]} transition-all hover:shadow-lg`}
    >
      <div className={`absolute inset-0 opacity-10 ${categoryColors[category]}`} />
      <div className="relative p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <div className="text-5xl font-mono font-bold tracking-tight">
            {formatTime(seconds)}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-3">
            {!isRunning ? (
              <>
                <Button
                  onClick={handleStart}
                  size="lg"
                  className={`${categoryColors[category]} text-white hover:opacity-90 transition-opacity`}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start
                </Button>
                {seconds > 0 && (
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="lg" variant="outline" className="border-2">
                        <RotateCcw className="mr-2 h-5 w-5" />
                        Reset
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Reset Timer?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will reset the current {title.toLowerCase()} timer to zero. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={handlePause}
                  size="lg"
                  variant="outline"
                  className="border-2"
                >
                  <Pause className="mr-2 h-5 w-5" />
                  Pause
                </Button>
                <Button
                  onClick={handleStop}
                  size="lg"
                  className={`${categoryColors[category]} text-white hover:opacity-90 transition-opacity`}
                >
                  <Square className="mr-2 h-5 w-5" />
                  Stop
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button size="lg" variant="outline" className="border-2">
                      <RotateCcw className="mr-2 h-5 w-5" />
                      Reset
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Reset Timer?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will discard the current running {title.toLowerCase()} session. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleReset}>Reset</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
          
          {seconds > 0 && (
            <Button
              onClick={handleSubmit}
              size="lg"
              variant="outline"
              className="w-full border-2"
            >
              <Save className="mr-2 h-5 w-5" />
              Submit Time Entry
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
