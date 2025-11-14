import { useState, useEffect } from "react";
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
import { useTimer } from "@/hooks/useTimer";

interface StopwatchProps {
  category: string;
  title: string;
  onTimeUpdate?: () => void;
}

export const Stopwatch = ({ category, title, onTimeUpdate }: StopwatchProps) => {
  const navigate = useNavigate();
  const timer = useTimer(0);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUserId(session.user.id);
        await checkForRunningTimer(session.user.id);
      }
      setIsLoading(false);
    };
    
    initAuth();
  }, [navigate, category]);

  // Check for running timer on mount and restore state
  const checkForRunningTimer = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("user_id", uid)
        .eq("category", category)
        .is("end_time", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCurrentEntryId(data.id);
        
        // Get the accumulated time from duration_seconds
        const pausedMs = (data.duration_seconds || 0) * 1000;
        
        // Check if timer is actively running (has start_time) or paused (no start_time)
        if (data.start_time) {
          // Timer is running - calculate additional elapsed time from DB start_time
          const dbStartTime = new Date(data.start_time).getTime();
          const now = Date.now();
          const additionalMs = now - dbStartTime;
          const totalElapsed = pausedMs + additionalMs;
          
          // Set the initial elapsed time and start the timer
          timer.setInitialElapsed(totalElapsed);
          timer.start();
        } else {
          // Timer is paused - just restore the accumulated time
          timer.setInitialElapsed(pausedMs);
        }
      }
    } catch (error) {
      console.error("Error checking for running timer:", error);
    }
  };

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

  // Handle page close/refresh - update running timer without finalizing it
  useEffect(() => {
    const handleBeforeUnload = async () => {
      if (timer.isRunning && currentEntryId && userId) {
        const totalMs = timer.getElapsedMs();
        const totalSeconds = Math.floor(totalMs / 1000);
        
        if (totalSeconds > 0) {
          // Just update the duration, keep the timer running (no end_time)
          await supabase.from("time_entries").update({
            duration_seconds: totalSeconds,
          }).eq("id", currentEntryId);
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [timer.isRunning, currentEntryId, userId, timer]);

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

      // Resuming from pause (entry exists but was paused)
      if (currentEntryId && timer.displayTime > 0 && !timer.isRunning) {
        const currentElapsedMs = timer.getElapsedMs();
        const now = Date.now();
        const dbStartTime = now - currentElapsedMs; // Recalculate what the start time should be
        
        timer.start();
        
        // Update DB with new start_time (wall clock) so it continues correctly across sessions
        const { error } = await supabase
          .from("time_entries")
          .update({
            start_time: new Date(dbStartTime).toISOString(),
            duration_seconds: Math.floor(currentElapsedMs / 1000),
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
      timer.reset();
      timer.start();
    } catch (error) {
      console.error("Error starting timer:", error);
      toast.error("Failed to start timer");
    }
  };

  const handlePause = async () => {
    if (!currentEntryId || !timer.isRunning) return;

    try {
      timer.pause();
      const totalMs = timer.getElapsedMs();

      // Clear start_time and just store duration (paused state)
      const { error } = await supabase
        .from("time_entries")
        .update({
          start_time: null,
          duration_seconds: Math.floor(totalMs / 1000),
        })
        .eq("id", currentEntryId);

      if (error) throw error;
      toast.success(`${title} timer paused`);
    } catch (error) {
      console.error("Error pausing timer:", error);
    }
  };

  const handleStop = async () => {
    if (!currentEntryId) return;

    try {
      const totalMs = timer.getElapsedMs();
      const totalSeconds = Math.floor(totalMs / 1000);

      const endTime = new Date();
      // Calculate the actual start time based on elapsed time
      const startTime = new Date(endTime.getTime() - totalMs);
      
      const { error } = await supabase
        .from("time_entries")
        .update({
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          duration_seconds: totalSeconds,
        })
        .eq("id", currentEntryId);

      if (error) throw error;

      // Reset all state
      timer.reset();
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
    
    timer.reset();
    setCurrentEntryId(null);
    toast.success(`${title} timer reset`);
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("Please log in to submit time");
      navigate("/auth");
      return;
    }

    const totalMs = timer.getElapsedMs();
    const totalSeconds = Math.floor(totalMs / 1000);

    if (totalSeconds === 0) {
      toast.error("No time to submit");
      return;
    }

    try {
      const now = new Date();
      // Calculate the actual start time based on elapsed time
      const startTime = new Date(now.getTime() - totalMs);
      const endTime = now;

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

      timer.reset();
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
            {formatTime(timer.displayTime)}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex justify-center gap-3">
            {!timer.isRunning ? (
              <>
                <Button
                  onClick={handleStart}
                  size="lg"
                  className={`${categoryColors[category]} text-white hover:opacity-90 transition-opacity`}
                >
                  <Play className="mr-2 h-5 w-5" />
                  Start
                </Button>
                {timer.displayTime > 0 && (
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
        
        {timer.displayTime > 0 && (
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
