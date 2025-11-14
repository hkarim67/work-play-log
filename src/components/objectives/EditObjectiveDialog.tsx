import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface Objective {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed";
  timeframe?: "short_term" | "medium_term" | "long_term" | null;
  due_date?: string | null;
}

interface EditObjectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  objective: Objective;
  onSuccess: () => void;
}

export const EditObjectiveDialog = ({
  open,
  onOpenChange,
  objective,
  onSuccess,
}: EditObjectiveDialogProps) => {
  const { toast } = useToast();
  const [title, setTitle] = useState(objective.title);
  const [description, setDescription] = useState(objective.description || "");
  const [status, setStatus] = useState(objective.status);
  const [timeframe, setTimeframe] = useState<"short_term" | "medium_term" | "long_term">(
    objective.timeframe || "short_term"
  );
  const [dueDate, setDueDate] = useState(objective.due_date || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(objective.title);
    setDescription(objective.description || "");
    setStatus(objective.status);
    setTimeframe(objective.timeframe || "short_term");
    setDueDate(objective.due_date || "");
  }, [objective]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    try {
      setSaving(true);

      const updateData: any = {
        title: title.trim(),
        description: description.trim() || null,
        status,
        timeframe: timeframe,
        due_date: dueDate || null,
      };

      if (status === "completed" && objective.status !== "completed") {
        updateData.completed_at = new Date().toISOString();
      } else if (status !== "completed") {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("objectives")
        .update(updateData)
        .eq("id", objective.id);

      if (error) throw error;

      toast({
        title: "Objective updated! ✅",
      });

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error("Error updating objective:", error);
      toast({
        title: "Error updating objective",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Objective</DialogTitle>
            <DialogDescription>
              Update your objective details and status
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Objective Title *</Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What do you want to achieve?"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add more details about this objective..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select value={status} onValueChange={(value: any) => setStatus(value)}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="not_started">Not Started</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-timeframe">Timeframe *</Label>
              <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
                <SelectTrigger id="edit-timeframe">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="short_term">Short Term</SelectItem>
                  <SelectItem value="medium_term">Medium Term</SelectItem>
                  <SelectItem value="long_term">Long Term</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dueDate">Target Due Date (optional)</Label>
              <Input
                id="edit-dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !title.trim()}
              className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
            >
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
