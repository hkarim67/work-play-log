import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
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
import { format } from "date-fns";

interface TimeEntry {
  id: string;
  category: string;
  date: string;
  duration_seconds: number;
  start_time: string;
  end_time: string | null;
}

interface TimesheetProps {
  selectedDate: Date;
  refreshTrigger?: number;
}

export const Timesheet = ({ selectedDate, refreshTrigger }: TimesheetProps) => {
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [activeTab, setActiveTab] = useState("leisure");

  useEffect(() => {
    fetchEntries();
  }, [selectedDate, refreshTrigger]);

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
            </TableRow>
          </TableHeader>
          <TableBody>
            {categoryEntries.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
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

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">
        Timesheet - {format(selectedDate, "MMMM d, yyyy")}
      </h2>
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leisure">Leisure</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="jobs">Jobs</TabsTrigger>
        </TabsList>
        <TabsContent value="leisure" className="mt-6">
          {renderTable("leisure")}
        </TabsContent>
        <TabsContent value="business" className="mt-6">
          {renderTable("business")}
        </TabsContent>
        <TabsContent value="jobs" className="mt-6">
          {renderTable("jobs")}
        </TabsContent>
      </Tabs>
    </Card>
  );
};
