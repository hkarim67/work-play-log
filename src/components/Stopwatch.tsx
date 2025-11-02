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
import { useNavigate } from "react-router-dom";

interface StopwatchProps {
  category: string;
  title: string;
  onTimeUpdate?: () => void;
}

export const Stopwatch = ({ category, title, onTimeUpdate }: StopwatchProps) => {
  const navigate = useNavigate();
  const [isRunning, setIsRunning] = useState(false);
  const [accumulatedMs, setAccumulatedMs] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const rafRef = useRef<number | null>(null);
  const [displayTime, setDisplayTime] = useState(0);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, [navigate]);

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

  // Drift-free timer using RAF for smooth updates
  useEffect(() => {
    if (isRunning && startedAt !== null) {
      const updateDisplay = () => {
        const now = performance.now();
        const elapsed = accumulatedMs + (now - startedAt);
        setDisplayTime(Math.floor(elapsed / 1000));
        rafRef.current = requestAnimationFrame(updateDisplay);
      };
      rafRef.current = requestAnimationFrame(updateDisplay);
    } else {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDisplayTime(Math.floor(accumulatedMs / 1000));
    }

    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [isRunning, startedAt, accumulatedMs]);

  // Handle visibility change to prevent background throttling issues
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isRunning && startedAt !== null) {
        // Compute current elapsed time before going to background
        const elapsed = accumulatedMs + (performance.now() - startedAt);
        setAccumulatedMs(elapsed);
        setStartedAt(performance.now());
      } else if (!document.hidden && isRunning && startedAt !== null) {
        // Recompute on resume to account for time spent hidden
        setStartedAt(performance.now());
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [isRunning, startedAt, accumulatedMs]);

  // Handle page close/refresh - submit time entry if timer is running
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (isRunning && currentEntryId && userId) {
        const totalMs = startedAt !== null ? accumulatedMs + (performance.now() - startedAt) : accumulatedMs;
        const totalSeconds = Math.floor(totalMs / 1000);
        
        if (totalSeconds > 0) {
          const now = new Date();
          const startTime = new Date(now);
          startTime.setHours(12, 0, 0, 0);
          const endTime = new Date(startTime);
          endTime.setSeconds(endTime.getSeconds() + totalSeconds);

          // Delete running entry
          await supabase.from("time_entries").delete().eq("id", currentEntryId);

          // Create final entry
          await supabase.from("time_entries").insert({
            category,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            duration_seconds: totalSeconds,
            date: format(now, "yyyy-MM-dd"),
            user_id: userId,
          });
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isRunning, accumulatedMs, startedAt, currentEntryId, category, userId]);

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
      if (!userId) {
        toast.error("Please log in to start the timer");
        navigate("/auth");
        return;
      }

      // Resuming from pause
      if (currentEntryId && accumulatedMs > 0) {
        setStartedAt(performance.now());
        setIsRunning(true);
        
        // Update DB with resumed state
        const { error } = await supabase
          .from("time_entries")
          .update({
            duration_seconds: Math.floor(accumulatedMs / 1000),
          })
          .eq("id", currentEntryId);

        if (error) throw error;
        return;
      }

      // Starting fresh
      const now = new Date();
      const { data, error } = await supabase
        .from("time_entries")
        .insert({
          category,
          start_time: now.toISOString(),
          duration_seconds: 0,
          user_id: userId,
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentEntryId(data.id);
      setStartedAt(performance.now());
      setAccumulatedMs(0);
      setIsRunning(true);
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handlePause = async () => {
    if (!currentEntryId || !isRunning || startedAt === null) return;

    try {
      // Calculate total elapsed time
      const totalMs = accumulatedMs + (performance.now() - startedAt);
      setAccumulatedMs(totalMs);
      setStartedAt(null);
      setIsRunning(false);

      // Persist paused state
      const { error } = await supabase
        .from("time_entries")
        .update({
          duration_seconds: Math.floor(totalMs / 1000),
        })
        .eq("id", currentEntryId);

      if (error) throw error;
    } catch (error) {
      console.error("Error pausing timer:", error);
      toast.error("Failed to pause timer");
    }
  };

  const handleStop = async () => {
    if (!currentEntryId) return;

    try {
      // Calculate final elapsed time
      const totalMs = startedAt !== null 
        ? accumulatedMs + (performance.now() - startedAt)
        : accumulatedMs;
      const totalSeconds = Math.floor(totalMs / 1000);

      const endTime = new Date();
      const { error } = await supabase
        .from("time_entries")
        .update({
          end_time: endTime.toISOString(),
          duration_seconds: totalSeconds,
        })
        .eq("id", currentEntryId);

      if (error) throw error;

      // Reset all state
      setIsRunning(false);
      setAccumulatedMs(0);
      setStartedAt(null);
      setCurrentEntryId(null);
      onTimeUpdate?.();
      toast.success(`${title} session saved: ${formatTime(totalSeconds)}`);
    } catch (error) {
      console.error("Error stopping timer:", error);
      toast.error("Failed to stop timer");
    }
  };

  const handleReset = async () => {
    if (currentEntryId) {
      try {
        await supabase.from("time_entries").delete().eq("id", currentEntryId);
      } catch (error) {
        console.error("Error deleting entry:", error);
      }
    }
    
    setIsRunning(false);
    setAccumulatedMs(0);
    setStartedAt(null);
    setCurrentEntryId(null);
    toast.success(`${title} timer reset`);
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Please log in to submit time");
      navigate("/auth");
      return;
    }

    const totalMs = startedAt !== null 
      ? accumulatedMs + (performance.now() - startedAt)
      : accumulatedMs;
    const totalSeconds = Math.floor(totalMs / 1000);

    if (totalSeconds === 0) {
      toast.error("No time to submit");
      return;
    }

    try {
      const now = new Date();
      const startTime = new Date(now);
      startTime.setHours(12, 0, 0, 0);
      const endTime = new Date(startTime);
      endTime.setSeconds(endTime.getSeconds() + totalSeconds);

      // Delete current entry if it exists
      if (currentEntryId) {
        await supabase.from("time_entries").delete().eq("id", currentEntryId);
      }

      const { error } = await supabase.from("time_entries").insert({
        category,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        duration_seconds: totalSeconds,
        date: format(now, "yyyy-MM-dd"),
        user_id: userId,
      });

      if (error) throw error;

      setIsRunning(false);
      setAccumulatedMs(0);
      setStartedAt(null);
      setCurrentEntryId(null);
      onTimeUpdate?.();
      toast.success(`${title} time saved: ${formatTime(totalSeconds)}`);
    } catch (error) {
      console.error("Error submitting time:", error);
      toast.error("Failed to save time entry");
    }
  };

  if (isLoading) {
    return (
      <Card
        className={`relative overflow-hidden border-2 ${categoryBorders[category]} transition-all hover:shadow-lg`}
      >
        <div className={`absolute inset-0 opacity-10 ${categoryColors[category]}`} />
        <div className="relative p-6 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">{title}</h2>
            <div className="text-5xl font-mono font-bold tracking-tight">
              00:00:00
            </div>
          </div>
          <div className="flex justify-center">
            <Button size="lg" disabled>
              Loading...
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={`relative overflow-hidden border-2 ${categoryBorders[category]} transition-all hover:shadow-lg`}
    >
      <div className={`absolute inset-0 opacity-10 ${categoryColors[category]}`} />
      <div className="relative p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">{title}</h2>
          <div className="text-5xl font-mono font-bold tracking-tight">
            {formatTime(displayTime)}
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
                {displayTime > 0 && (
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
        
        {displayTime > 0 && (
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
