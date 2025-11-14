import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle2, Circle, Clock, Target } from "lucide-react";
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

interface Category {
  id: string;
  name: string;
  description: string | null;
  is_lifetime: boolean;
}

const CategoryDetail = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { toast } = useToast();
  const [category, setCategory] = useState<Category | null>(null);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingObjective, setEditingObjective] = useState<Objective | null>(null);

  useEffect(() => {
    fetchCategoryAndObjectives();
  }, [categoryId]);

  const fetchCategoryAndObjectives = async () => {
    try {
      setLoading(true);

      // Fetch category
      const { data: categoryData, error: categoryError } = await supabase
        .from("objective_categories")
        .select("*")
        .eq("id", categoryId)
        .single();

      if (categoryError) throw categoryError;
      setCategory(categoryData);

      // Fetch objectives
      const { data: objectivesData, error: objectivesError } = await supabase
        .from("objectives")
        .select("*")
        .eq("category_id", categoryId)
        .order("sort_order");

      if (objectivesError) throw objectivesError;
      setObjectives(objectivesData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Error loading objectives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateObjectiveStatus = async (objectiveId: string, newStatus: Objective["status"]) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      const { error } = await supabase
        .from("objectives")
        .update(updateData)
        .eq("id", objectiveId);

      if (error) throw error;

      toast({
        title: newStatus === "completed" ? "Objective completed! 🎉" : "Status updated",
        description: newStatus === "completed" ? "Great work on making progress!" : undefined,
      });

      fetchCategoryAndObjectives();
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error updating objective",
        variant: "destructive",
      });
    }
  };

  const deleteObjective = async (objectiveId: string) => {
    if (!confirm("Are you sure you want to delete this objective?")) return;

    try {
      const { error } = await supabase
        .from("objectives")
        .delete()
        .eq("id", objectiveId);

      if (error) throw error;

      toast({
        title: "Objective deleted",
      });

      fetchCategoryAndObjectives();
    } catch (error) {
      console.error("Error deleting objective:", error);
      toast({
        title: "Error deleting objective",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: Objective["status"]) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case "in_progress":
        return <Clock className="h-5 w-5 text-objectives-primary" />;
      default:
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: Objective["status"]) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In Progress";
      default:
        return "Not Started";
    }
  };

  const activeObjectives = objectives.filter((obj) => obj.status !== "completed");
  const completedObjectives = objectives.filter((obj) => obj.status === "completed");

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

  if (!category) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Category not found</p>
          <Button onClick={() => navigate("/objectives")} className="mt-4">
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={() => navigate("/objectives")}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Objectives
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-4xl font-bold ${category.is_lifetime ? "text-objectives-primary" : "text-foreground"}`}>
                {category.name}
              </h1>
              {category.description && (
                <p className="text-muted-foreground mt-2">{category.description}</p>
              )}
              {category.is_lifetime && (
                <p className="text-objectives-primary/80 mt-2 italic">
                  These are the goals you'll be proud you started today
                </p>
              )}
            </div>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Objective
            </Button>
          </div>
        </div>

        {/* Active Objectives */}
        <div className="space-y-4 mb-8">
          {activeObjectives.length === 0 ? (
            <Card className="p-12 text-center">
              <Target className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No objectives yet</h3>
              <p className="text-muted-foreground mb-6">
                Add your first objective to start making progress
              </p>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Objective
              </Button>
            </Card>
          ) : (
            activeObjectives.map((objective) => (
              <Card key={objective.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => {
                        const nextStatus = objective.status === "not_started" ? "in_progress" : "completed";
                        updateObjectiveStatus(objective.id, nextStatus);
                      }}
                      className="mt-1"
                    >
                      {getStatusIcon(objective.status)}
                    </button>

                    <div className="flex-1">
                      <h3 className="text-lg font-semibold mb-1">{objective.title}</h3>
                      {objective.description && (
                        <p className="text-muted-foreground text-sm mb-2">{objective.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Status: {getStatusLabel(objective.status)}
                      </p>
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
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Completed Objectives */}
        {completedObjectives.length > 0 && (
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-muted-foreground">Completed</h2>
            <div className="space-y-4">
              {completedObjectives.map((objective) => (
                <Card key={objective.id} className="opacity-60 hover:opacity-100 transition-opacity">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      {getStatusIcon(objective.status)}

                      <div className="flex-1">
                        <h3 className="text-lg font-semibold mb-1 line-through">{objective.title}</h3>
                        {objective.description && (
                          <p className="text-muted-foreground text-sm mb-2">{objective.description}</p>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => updateObjectiveStatus(objective.id, "in_progress")}
                          variant="ghost"
                          size="sm"
                          title="Mark as in progress"
                        >
                          <Clock className="h-4 w-4" />
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      <AddObjectiveDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        categoryId={categoryId!}
        onSuccess={fetchCategoryAndObjectives}
      />

      {editingObjective && (
        <EditObjectiveDialog
          open={!!editingObjective}
          onOpenChange={(open) => !open && setEditingObjective(null)}
          objective={editingObjective}
          onSuccess={fetchCategoryAndObjectives}
        />
      )}
    </div>
  );
};

export default CategoryDetail;
