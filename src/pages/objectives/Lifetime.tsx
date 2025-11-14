import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Edit, Trash2, GripVertical, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddObjectiveDialog } from "@/components/objectives/AddObjectiveDialog";
import { EditObjectiveDialog } from "@/components/objectives/EditObjectiveDialog";

interface Objective {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed";
  sort_order: number;
}

const LifetimeObjectives = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  useEffect(() => {
    initializeLifetimeCategory();
  }, []);

  const initializeLifetimeCategory = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Check if lifetime category exists
      let { data: category, error: categoryError } = await supabase
        .from("objective_categories")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_lifetime", true)
        .maybeSingle();

      // If not, create it
      if (!category) {
        const { data: newCategory, error: createError } = await supabase
          .from("objective_categories")
          .insert({
            user_id: user.id,
            name: "Lifetime Objectives",
            description: "The goals that matter most over the long term",
            is_lifetime: true,
            sort_order: 0,
          })
          .select()
          .single();

        if (createError) throw createError;
        category = newCategory;
      }

      if (categoryError && categoryError.code !== 'PGRST116') throw categoryError;

      setCategoryId(category.id);
      fetchObjectives(category.id);
    } catch (error) {
      console.error("Error initializing lifetime category:", error);
      toast({
        title: "Error loading lifetime objectives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchObjectives = async (catId: string) => {
    try {
      const { data, error } = await supabase
        .from("objectives")
        .select("*")
        .eq("category_id", catId)
        .order("sort_order");

      if (error) throw error;
      setObjectives(data || []);
    } catch (error) {
      console.error("Error fetching objectives:", error);
    }
  };

  const deleteObjective = async (objectiveId: string) => {
    if (!confirm("Are you sure you want to delete this lifetime objective?")) return;

    try {
      const { error } = await supabase
        .from("objectives")
        .delete()
        .eq("id", objectiveId);

      if (error) throw error;

      toast({
        title: "Objective deleted",
      });

      if (categoryId) fetchObjectives(categoryId);
    } catch (error) {
      console.error("Error deleting objective:", error);
      toast({
        title: "Error deleting objective",
        variant: "destructive",
      });
    }
  };

  const moveObjective = async (index: number, direction: "up" | "down") => {
    if (
      (direction === "up" && index === 0) ||
      (direction === "down" && index === objectives.length - 1)
    ) {
      return;
    }

    const newObjectives = [...objectives];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    [newObjectives[index], newObjectives[targetIndex]] = [
      newObjectives[targetIndex],
      newObjectives[index],
    ];

    // Update sort orders
    const updates = newObjectives.map((obj, idx) => ({
      id: obj.id,
      sort_order: idx,
    }));

    try {
      for (const update of updates) {
        await supabase
          .from("objectives")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      setObjectives(newObjectives);
    } catch (error) {
      console.error("Error reordering objectives:", error);
      toast({
        title: "Error reordering objectives",
        variant: "destructive",
      });
    }
  };

  const canAddMore = objectives.length < 25;
  const activeObjectives = objectives.filter((obj) => obj.status !== "completed");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Target className="h-12 w-12 text-objectives-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        <Button
          onClick={() => navigate("/objectives")}
          variant="ghost"
          className="mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Objectives
        </Button>

        <div className="mb-8">
          <h1 className="text-4xl font-bold text-objectives-primary mb-2">
            Lifetime Objectives
          </h1>
          <p className="text-objectives-primary/80 italic">
            These are the goals you'll be proud you started today
          </p>
          <p className="text-muted-foreground mt-2">
            {objectives.length} of 25 objectives created
          </p>
        </div>

        <div className="mb-6">
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            disabled={!canAddMore}
            className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Lifetime Objective
          </Button>
          {!canAddMore && (
            <p className="text-sm text-muted-foreground mt-2">
              Maximum of 25 lifetime objectives reached
            </p>
          )}
        </div>

        {activeObjectives.length === 0 ? (
          <Card className="p-12 text-center">
            <Target className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No lifetime objectives yet</h3>
            <p className="text-muted-foreground mb-6">
              Add your first lifetime objective to start working towards your dreams
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Objective
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {activeObjectives.map((objective, index) => (
              <Card key={objective.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex flex-col gap-1">
                      <Button
                        onClick={() => moveObjective(index, "up")}
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        className="h-6 w-6 p-0"
                      >
                        ▲
                      </Button>
                      <GripVertical className="h-4 w-4 text-muted-foreground" />
                      <Button
                        onClick={() => moveObjective(index, "down")}
                        variant="ghost"
                        size="sm"
                        disabled={index === activeObjectives.length - 1}
                        className="h-6 w-6 p-0"
                      >
                        ▼
                      </Button>
                    </div>

                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="text-lg font-semibold mb-1">
                            {index + 1}. {objective.title}
                          </h3>
                          {objective.description && (
                            <p className="text-muted-foreground text-sm">
                              {objective.description}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={() => setEditingObjective(objective)}
                            variant="ghost"
                            size="sm"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            onClick={() => deleteObjective(objective.id)}
                            variant="ghost"
                            size="sm"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {categoryId && (
        <>
          <AddObjectiveDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            categoryId={categoryId}
            onSuccess={() => fetchObjectives(categoryId)}
          />

          {editingObjective && (
            <EditObjectiveDialog
              open={!!editingObjective}
              onOpenChange={(open) => !open && setEditingObjective(null)}
              objective={editingObjective}
              onSuccess={() => fetchObjectives(categoryId)}
            />
          )}
        </>
      )}
    </div>
  );
};

export default LifetimeObjectives;
