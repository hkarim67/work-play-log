import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";

interface AddListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onListAdded: () => void;
}

const emojiOptions = ["📋", "💼", "🏠", "💪", "📚", "🎨", "🛒", "✈️", "💰", "🎯", "🌟", "🔧"];

export const AddListDialog = ({
  open,
  onOpenChange,
  onListAdded,
}: AddListDialogProps) => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("📋");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast({
        title: "List name required",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("flora_lists").insert({
        user_id: user.id,
        name: name.trim(),
        icon: icon,
        color: "flora-sage",
      });

      if (error) throw error;

      toast({
        title: "List created! 🌸",
        description: `${name} has been added`,
      });

      setName("");
      setIcon("📋");
      onOpenChange(false);
      onListAdded();
    } catch (error) {
      toast({
        title: "Error creating list",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Add a new category to organize your tasks
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">List Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Work, Personal, Health..."
                maxLength={50}
              />
            </div>
            <div className="grid gap-2">
              <Label>Choose an Icon</Label>
              <div className="grid grid-cols-6 gap-2">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setIcon(emoji)}
                    className={`text-3xl p-2 rounded-lg transition-all hover:scale-110 ${
                      icon === emoji
                        ? "bg-flora-sage/20 ring-2 ring-flora-sage"
                        : "bg-muted hover:bg-muted/80"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Create List"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
