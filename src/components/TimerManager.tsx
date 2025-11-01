import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Timer {
  id: string;
  name: string;
  category: string;
  sort_order: number;
}

interface TimerManagerProps {
  timers: Timer[];
  onTimersChange: () => void;
}

export const TimerManager = ({ timers, onTimersChange }: TimerManagerProps) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTimer, setEditingTimer] = useState<Timer | null>(null);
  const [newTimerName, setNewTimerName] = useState("");

  const canAddTimer = timers.length < 5;

  const handleAddTimer = async () => {
    if (!newTimerName.trim()) {
      toast.error("Timer name cannot be empty");
      return;
    }

    try {
      const category = `timer_${Date.now()}`;
      const maxSort = Math.max(...timers.map(t => t.sort_order), 0);
      
      const { error } = await supabase.from("timers").insert({
        name: newTimerName.trim(),
        category,
        sort_order: maxSort + 1,
      });

      if (error) throw error;

      toast.success("Timer added successfully");
      setNewTimerName("");
      setIsAddDialogOpen(false);
      onTimersChange();
    } catch (error) {
      console.error("Error adding timer:", error);
      toast.error("Failed to add timer");
    }
  };

  const handleEditTimer = async () => {
    if (!editingTimer || !newTimerName.trim()) {
      toast.error("Timer name cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("timers")
        .update({ name: newTimerName.trim() })
        .eq("id", editingTimer.id);

      if (error) throw error;

      toast.success("Timer updated successfully");
      setEditingTimer(null);
      setNewTimerName("");
      onTimersChange();
    } catch (error) {
      console.error("Error updating timer:", error);
      toast.error("Failed to update timer");
    }
  };

  const handleDeleteTimer = async (timer: Timer) => {
    try {
      // Delete all time entries for this timer
      await supabase.from("time_entries").delete().eq("category", timer.category);
      
      // Delete the timer
      const { error } = await supabase.from("timers").delete().eq("id", timer.id);

      if (error) throw error;

      toast.success("Timer and all its entries deleted");
      onTimersChange();
    } catch (error) {
      console.error("Error deleting timer:", error);
      toast.error("Failed to delete timer");
    }
  };

  const openEditDialog = (timer: Timer) => {
    setEditingTimer(timer);
    setNewTimerName(timer.name);
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center">
      {timers.map((timer) => (
        <div key={timer.id} className="flex items-center gap-1 bg-muted/50 rounded-md px-2 py-1">
          <span className="text-sm font-medium">{timer.name}</span>
          <Dialog open={editingTimer?.id === timer.id} onOpenChange={(open) => !open && setEditingTimer(null)}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => openEditDialog(timer)}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Timer</DialogTitle>
                <DialogDescription>Change the name of this timer</DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Timer Name</Label>
                  <Input
                    id="edit-name"
                    value={newTimerName}
                    onChange={(e) => setNewTimerName(e.target.value)}
                    placeholder="Enter timer name"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTimer(null)}>
                  Cancel
                </Button>
                <Button onClick={handleEditTimer}>Save Changes</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive">
                <Trash2 className="h-3 w-3" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Timer?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the "{timer.name}" timer and all its time entries. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => handleDeleteTimer(timer)}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ))}

      {canAddTimer && (
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Timer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Timer</DialogTitle>
              <DialogDescription>
                Create a new timer (maximum 5 timers)
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-name">Timer Name</Label>
                <Input
                  id="new-name"
                  value={newTimerName}
                  onChange={(e) => setNewTimerName(e.target.value)}
                  placeholder="Enter timer name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddTimer}>Add Timer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
