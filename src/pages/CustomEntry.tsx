import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { setupLogoutListener } from "@/lib/auth";

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

const CustomEntry = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [category, setCategory] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [minutes, setMinutes] = useState<string>("");
  const [entryMode, setEntryMode] = useState<"time-range" | "duration">("time-range");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timers, setTimers] = useState<Timer[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth", { replace: true });
      } else {
        setUserId(session.user.id);
        fetchTimers();
      }
      setIsLoading(false);
    };
    
    initAuth();

    // Set up multi-tab logout listener
    const cleanupLogoutListener = setupLogoutListener(() => {
      // Another tab logged out - redirect this tab too
      window.location.href = "/auth";
    });

    return () => {
      cleanupLogoutListener();
    };
  }, [navigate]);

  const fetchTimers = async () => {
    try {
      const { data, error } = await supabase
        .from("timers")
        .select("*")
        .order("sort_order", { ascending: true });

      if (error) throw error;
      setTimers(data || []);
    } catch (error) {
      console.error("Error fetching timers:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category) {
      toast({
        title: "Missing fields",
        description: "Please select a category",
        variant: "destructive",
      });
      return;
    }

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    let startDateTime: Date;
    let endDateTime: Date;
    let durationSeconds: number;

    if (entryMode === "duration") {
      // Duration mode: validate hours and minutes
      if (!hours && !minutes) {
        toast({
          title: "Missing fields",
          description: "Please enter hours and/or minutes",
          variant: "destructive",
        });
        return;
      }

      const totalHours = parseInt(hours || "0");
      const totalMinutes = parseInt(minutes || "0");

      if (totalHours < 0 || totalMinutes < 0 || totalMinutes >= 60) {
        toast({
          title: "Invalid duration",
          description: "Please enter valid hours and minutes (minutes must be 0-59)",
          variant: "destructive",
        });
        return;
      }

      if (totalHours === 0 && totalMinutes === 0) {
        toast({
          title: "Invalid duration",
          description: "Duration must be greater than 0",
          variant: "destructive",
        });
        return;
      }

      // Calculate duration in seconds
      durationSeconds = (totalHours * 3600) + (totalMinutes * 60);

      // Set start time to beginning of selected day
      startDateTime = new Date(`${dateStr}T00:00:00`);
      endDateTime = new Date(startDateTime.getTime() + (durationSeconds * 1000));
    } else {
      // Time range mode: validate start and end times
      if (!startTime || !endTime) {
        toast({
          title: "Missing fields",
          description: "Please fill in start and end times",
          variant: "destructive",
        });
        return;
      }

      // Parse times and calculate duration
      startDateTime = new Date(`${dateStr}T${startTime}`);
      endDateTime = new Date(`${dateStr}T${endTime}`);
      
      if (endDateTime <= startDateTime) {
        toast({
          title: "Invalid time range",
          description: "End time must be after start time",
          variant: "destructive",
        });
        return;
      }

      durationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);
    }

    if (!userId) {
      toast({
        title: "Error",
        description: "Please log in to add entries",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("time_entries").insert({
        category,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_seconds: durationSeconds,
        date: dateStr,
        user_id: userId,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Time entry added successfully",
      });

      // Reset form
      setCategory("");
      setStartTime("");
      setEndTime("");
      setHours("");
      setMinutes("");
    } catch (error) {
      console.error("Error submitting entry:", error);
      toast({
        title: "Error",
        description: "Failed to add time entry",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-[hsl(270,70%,65%)] via-[hsl(210,80%,55%)] to-[hsl(165,70%,50%)] bg-clip-text text-transparent">
            Add Custom Time Entry
          </h1>
          <p className="text-muted-foreground mt-2">
            Manually add a time entry for any date
          </p>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Choose the date for your entry</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => date && setSelectedDate(date)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Entry Details</CardTitle>
              <CardDescription>
                Selected date: {format(selectedDate, "MMMM d, yyyy")}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {timers.map((timer) => (
                        <SelectItem key={timer.id} value={timer.category}>
                          {timer.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Tabs value={entryMode} onValueChange={(value) => setEntryMode(value as "time-range" | "duration")}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="time-range">Start/End Time</TabsTrigger>
                    <TabsTrigger value="duration">Duration</TabsTrigger>
                  </TabsList>

                  <TabsContent value="time-range" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="duration" className="space-y-4 mt-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="hours">Hours</Label>
                        <Input
                          id="hours"
                          type="number"
                          min="0"
                          placeholder="0"
                          value={hours}
                          onChange={(e) => setHours(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="minutes">Minutes</Label>
                        <Input
                          id="minutes"
                          type="number"
                          min="0"
                          max="59"
                          placeholder="0"
                          value={minutes}
                          onChange={(e) => setMinutes(e.target.value)}
                        />
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enter the total time spent on this task
                    </p>
                  </TabsContent>
                </Tabs>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting || isLoading}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Adding..." : isLoading ? "Loading..." : "Add Entry"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default CustomEntry;
