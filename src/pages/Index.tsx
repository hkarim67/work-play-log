import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Stopwatch } from "@/components/Stopwatch";
import { CalendarView } from "@/components/CalendarView";
import { Timesheet } from "@/components/Timesheet";
import { Button } from "@/components/ui/button";
import { Clock, Plus } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleTimeUpdate = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[hsl(270,70%,65%)] via-[hsl(210,80%,55%)] to-[hsl(165,70%,50%)] bg-clip-text text-transparent">
              TimeTracker
            </h1>
          </div>
          <p className="text-center text-muted-foreground mt-2">
            Track your time across leisure, business, and jobs
          </p>
          <div className="flex justify-center mt-4">
            <Button onClick={() => navigate("/custom-entry")} variant="outline">
              <Plus className="mr-2 h-4 w-4" />
              Add Custom Entry
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-8">
        {/* Stopwatches Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6 text-center">Active Timers</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Stopwatch
              category="leisure"
              title="Leisure"
              onTimeUpdate={handleTimeUpdate}
            />
            <Stopwatch
              category="business"
              title="Business"
              onTimeUpdate={handleTimeUpdate}
            />
            <Stopwatch
              category="jobs"
              title="Jobs"
              onTimeUpdate={handleTimeUpdate}
            />
          </div>
        </section>

        {/* Calendar and Timesheet Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <CalendarView
              onDateSelect={setSelectedDate}
              refreshTrigger={refreshTrigger}
            />
          </div>
          <div className="lg:col-span-2">
            <Timesheet selectedDate={selectedDate} refreshTrigger={refreshTrigger} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
