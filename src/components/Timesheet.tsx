import { useState, useEffect, useRef } from "react";
import { Trash2, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Play, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays, subDays, isToday } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { cn } from "@/lib/utils";

interface TimeEntry {
  id: string;
  category: string;
  date: string;
  duration_seconds: number;
  start_time: string;
  end_time: string | null;
}

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface TimesheetProps {
  selectedDate: Date;
  refreshTrigger?: number;
  timers: Timer[];
}

export const Timesheet = ({ selectedDate, refreshTrigger, timers }: TimesheetProps) => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [timesheetDate, setTimesheetDate] = useState<Date>(selectedDate);
  const [activeCategory, setActiveCategory] = useState("");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const fetchTimeoutRef = useRef<number | null>(null);

  // Initialize from URL params
  useEffect(() => {
    const dateParam = searchParams.get("date");
    const tabParam = searchParams.get("tab");
    
    if (dateParam) {
      const parsedDate = new Date(dateParam);
      if (!isNaN(parsedDate.getTime())) {
        setTimesheetDate(parsedDate);
      }
    }
    
    if (tabParam && timers.find(t => t.category === tabParam)) {
      setActiveCategory(tabParam);
    } else if (timers.length > 0 && !activeCategory) {
      setActiveCategory(timers[0].category);
    }
  }, [searchParams, timers]);

  // Sync selectedDate prop changes
  useEffect(() => {
    setTimesheetDate(selectedDate);
  }, [selectedDate]);

  // Debounced fetch on date or category change
  useEffect(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    fetchTimeoutRef.current = window.setTimeout(() => {
      fetchEntries();
    }, 150);

    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [timesheetDate, activeCategory, refreshTrigger]);

  const fetchEntries = async () => {
    try {
      const dateKey = format(timesheetDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("date", dateKey)
        .eq("category", activeCategory)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching timesheet entries:", error);
    }
  };

  const handleDateChange = (newDate: Date) => {
    setTimesheetDate(newDate);
    const params = new URLSearchParams(searchParams);
    params.set("date", format(newDate, "yyyy-MM-dd"));
    setSearchParams(params);
  };

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
    const params = new URLSearchParams(searchParams);
    params.set("tab", category);
    setSearchParams(params);
  };

  const handlePrevDay = () => handleDateChange(subDays(timesheetDate, 1));
  const handleNextDay = () => handleDateChange(addDays(timesheetDate, 1));
  const handleToday = () => handleDateChange(new Date());

  const handleStartTimer = () => {
    navigate("/");
  };

  const handleAddManual = () => {
    navigate("/custom-entry");
  };

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), "HH:mm:ss");
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  const getCategoryTotal = () => {
    return entries.reduce((sum, entry) => sum + entry.duration_seconds, 0);
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from("time_entries")
        .delete()
        .eq("id", entryId);

      if (error) throw error;

      toast.success("Entry deleted successfully");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting entry:", error);
      toast.error("Failed to delete entry");
    }
  };

  const currentTimer = timers.find(t => t.category === activeCategory);
  const total = getCategoryTotal();

  const renderEmptyState = () => (
    <div className="text-center py-12 space-y-4">
      <p className="text-muted-foreground text-lg">
        No {currentTimer?.name} entries for {format(timesheetDate, "MMMM d, yyyy")}
      </p>
      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={handleStartTimer} className="gap-2">
          <Play className="h-4 w-4" />
          Start a Timer
        </Button>
        <Button onClick={handleAddManual} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Add Manual Entry
        </Button>
      </div>
    </div>
  );

  const renderDesktopTable = () => (
    <div className="hidden md:block space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-sm font-semibold">Start Time</TableHead>
            <TableHead className="text-sm font-semibold">End Time</TableHead>
            <TableHead className="text-sm font-semibold">Category</TableHead>
            <TableHead className="text-right text-sm font-semibold">Duration</TableHead>
            <TableHead className="text-right text-sm font-semibold">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5}>
                {renderEmptyState()}
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="font-mono text-sm">
                  {formatTime(entry.start_time)}
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {entry.end_time ? formatTime(entry.end_time) : "In Progress"}
                </TableCell>
                <TableCell className="text-sm">
                  {currentTimer?.name}
                </TableCell>
                <TableCell className="text-right font-mono text-sm">
                  {formatDuration(entry.duration_seconds)}
                </TableCell>
                <TableCell className="text-right">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-10 w-10 touch-manipulation"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="z-[100]">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this time entry. This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {entries.length > 0 && (
        <div className="flex justify-end items-center gap-4 pt-2 border-t">
          <span className="font-semibold">Total:</span>
          <span className="font-mono text-lg">{formatDuration(total)}</span>
        </div>
      )}
    </div>
  );

  const renderMobileCards = () => (
    <div className="md:hidden space-y-3">
      {entries.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {entries.map((entry) => (
            <Card key={entry.id} className="p-4 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{currentTimer?.name}</p>
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-10 w-10 touch-manipulation -mt-2 -mr-2"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="z-[100]">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Entry?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this time entry. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDelete(entry.id)}>
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Start</p>
                  <p className="font-mono text-sm">{formatTime(entry.start_time)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">End</p>
                  <p className="font-mono text-sm">
                    {entry.end_time ? formatTime(entry.end_time) : "In Progress"}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Duration</span>
                  <span className="font-mono font-semibold">
                    {formatDuration(entry.duration_seconds)}
                  </span>
                </div>
              </div>
            </Card>
          ))}
          <div className="flex justify-end items-center gap-4 pt-2 border-t">
            <span className="font-semibold">Total:</span>
            <span className="font-mono text-lg">{formatDuration(total)}</span>
          </div>
        </>
      )}
    </div>
  );

  if (timers.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-3xl font-bold mb-6">
          Timesheet
        </h2>
        <p className="text-center text-muted-foreground py-8">No timers created yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6">
      {/* Header with Date Navigation */}
      <div className="space-y-4 mb-6">
        <h2 className="text-2xl md:text-3xl font-bold">Timesheet</h2>
        
        {/* Date Navigation */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevDay}
              className="h-10 w-10 touch-manipulation"
              aria-label="Previous day"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "min-w-[200px] justify-start text-left font-normal h-10 touch-manipulation",
                    !timesheetDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(timesheetDate, "MMMM d, yyyy")}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[100]" align="start">
                <Calendar
                  mode="single"
                  selected={timesheetDate}
                  onSelect={(date) => {
                    if (date) {
                      handleDateChange(date);
                      setIsDatePickerOpen(false);
                    }
                  }}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleNextDay}
              className="h-10 w-10 touch-manipulation"
              aria-label="Next day"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          <Button
            variant={isToday(timesheetDate) ? "default" : "outline"}
            onClick={handleToday}
            className="h-10 touch-manipulation"
          >
            Today
          </Button>
        </div>

        {/* Category Tabs - Segmented Control */}
        <div 
          className="flex gap-1 p-1 bg-muted rounded-lg overflow-x-auto"
          role="tablist"
          aria-label="Timer categories"
        >
          {timers.map((timer) => (
            <button
              key={timer.id}
              role="tab"
              aria-selected={activeCategory === timer.category}
              aria-controls={`panel-${timer.category}`}
              onClick={() => handleCategoryChange(timer.category)}
              className={cn(
                "flex-1 min-w-[100px] px-4 py-2.5 text-sm font-medium rounded-md transition-all touch-manipulation",
                "hover:bg-background/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                activeCategory === timer.category
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground"
              )}
            >
              {timer.name}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div role="tabpanel" id={`panel-${activeCategory}`} aria-labelledby={activeCategory}>
        {renderDesktopTable()}
        {renderMobileCards()}
      </div>
    </Card>
  );
};
