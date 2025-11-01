import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

const CustomEntry = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [category, setCategory] = useState<string>("");
  const [startTime, setStartTime] = useState<string>("");
  const [endTime, setEndTime] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!category || !startTime || !endTime) {
      toast({
        title: "Missing fields",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    // Parse times and calculate duration
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const startDateTime = new Date(`${dateStr}T${startTime}`);
    const endDateTime = new Date(`${dateStr}T${endTime}`);
    
    if (endDateTime <= startDateTime) {
      toast({
        title: "Invalid time range",
        description: "End time must be after start time",
        variant: "destructive",
      });
      return;
    }

    const durationSeconds = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / 1000);

    setIsSubmitting(true);
    
    try {
      const { error } = await supabase.from("time_entries").insert({
        category,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        duration_seconds: durationSeconds,
        date: dateStr,
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
                      <SelectItem value="leisure">Leisure</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                      <SelectItem value="jobs">Jobs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isSubmitting}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {isSubmitting ? "Adding..." : "Add Entry"}
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
