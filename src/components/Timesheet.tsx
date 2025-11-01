import { useState, useEffect } from "react";
import { Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

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
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeTab, setActiveTab] = useState("");

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, refreshTrigger]);

  useEffect(() => {
    if (timers.length > 0 && !activeTab) {
      setActiveTab(timers[0].category);
    }
  }, [timers, activeTab]);

  const fetchEntries = async () => {
    try {
      const dateKey = format(selectedDate, "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("time_entries")
        .select("*")
        .eq("date", dateKey)
        .order("start_time", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Error fetching timesheet entries:", error);
    }
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

  const getCategoryEntries = (category: string) => {
    return entries.filter((entry) => entry.category === category);
  };

  const getCategoryTotal = (category: string) => {
    return getCategoryEntries(category).reduce(
      (sum, entry) => sum + entry.duration_seconds,
      0
    );
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

  const renderTable = (category: string) => {
    const categoryEntries = getCategoryEntries(category);
    const total = getCategoryTotal(category);

    return (
      <div className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Start Time</TableHead>
              <TableHead>End Time</TableHead>
              <TableHead className="text-right">Duration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No entries for this day
                </TableCell>
              </TableRow>
            ) : (
              categoryEntries.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono">
                    {formatTime(entry.start_time)}
                  </TableCell>
                  <TableCell className="font-mono">
                    {entry.end_time ? formatTime(entry.end_time) : "In Progress"}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatDuration(entry.duration_seconds)}
                  </TableCell>
                  <TableCell className="text-right">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
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
        {categoryEntries.length > 0 && (
          <div className="flex justify-end items-center gap-4 pt-2 border-t">
            <span className="font-semibold">Total:</span>
            <span className="font-mono text-lg">{formatDuration(total)}</span>
          </div>
        )}
      </div>
    );
  };

  if (timers.length === 0) {
    return (
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-6">
          Timesheet - {format(selectedDate, "MMMM d, yyyy")}
        </h2>
        <p className="text-center text-muted-foreground">No timers created yet</p>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        Timesheet - {format(selectedDate, "MMMM d, yyyy")}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full grid-cols-${timers.length}`}>
          {timers.map((timer) => (
            <TabsTrigger key={timer.id} value={timer.category}>
              {timer.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {timers.map((timer) => (
          <TabsContent key={timer.id} value={timer.category} className="mt-6">
            {renderTable(timer.category)}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  );
};
