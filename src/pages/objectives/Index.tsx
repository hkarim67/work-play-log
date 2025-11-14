import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, ChevronRight, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddCategoryDialog } from "@/components/objectives/AddCategoryDialog";

interface Category {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_lifetime: boolean;
  objective_count: number;
}

interface LifetimeObjective {
  id: string;
  title: string;
  sort_order: number;
}

const ObjectivesIndex = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [categories, setCategories] = useState<Category[]>([]);
  const [lifetimeCategory, setLifetimeCategory] = useState<Category | null>(null);
  const [lifetimeObjectives, setLifetimeObjectives] = useState<LifetimeObjective[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch categories with objective counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from("objective_categories")
        .select("*")
        .order("sort_order");

      if (categoriesError) throw categoriesError;

      // Fetch objective counts for each category
      const categoriesWithCounts = await Promise.all(
        (categoriesData || []).map(async (category) => {
          const { count } = await supabase
            .from("objectives")
            .select("*", { count: "exact", head: true })
            .eq("category_id", category.id)
            .neq("status", "completed");

          return {
            ...category,
            objective_count: count || 0,
          };
        })
      );

      // Separate lifetime from other categories
      const lifetime = categoriesWithCounts.find((c) => c.is_lifetime);
      const regular = categoriesWithCounts.filter((c) => !c.is_lifetime);

      setLifetimeCategory(lifetime || null);
      setCategories(regular);

      // Fetch top 5 lifetime objectives if category exists
      if (lifetime) {
        const { data: objectives, error: objectivesError } = await supabase
          .from("objectives")
          .select("id, title, sort_order")
          .eq("category_id", lifetime.id)
          .neq("status", "completed")
          .order("sort_order")
          .limit(5);

        if (objectivesError) throw objectivesError;
        setLifetimeObjectives(objectives || []);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast({
        title: "Error loading objectives",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const canAddMoreCategories = categories.length < 10;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Sparkles className="h-12 w-12 text-objectives-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading objectives...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Sparkles className="h-10 w-10 text-objectives-primary" />
            <h1 className="text-4xl font-bold text-foreground">Objectives</h1>
          </div>
          <p className="text-muted-foreground">
            Track your goals and make progress on what matters most
          </p>
        </div>

        {/* Lifetime Objectives Section */}
        <Card className="mb-8 border-objectives-primary/30 bg-gradient-to-br from-objectives-primary/5 to-objectives-secondary/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl text-objectives-primary flex items-center gap-2">
                  <Sparkles className="h-6 w-6" />
                  Lifetime Objectives
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  These are the goals you'll be proud you started today
                </CardDescription>
              </div>
              <Button
                onClick={() => navigate(lifetimeCategory ? `/objectives/category/${lifetimeCategory.id}` : "/objectives/lifetime")}
                variant="default"
                className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
              >
                {lifetimeCategory ? "View All" : "Get Started"}
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          {lifetimeObjectives.length > 0 && (
            <CardContent>
              <div className="space-y-2 mb-4">
                {lifetimeObjectives.map((objective, index) => (
                  <div key={objective.id} className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-objectives-primary">{index + 1}.</span>
                    <span>{objective.title}</span>
                  </div>
                ))}
              </div>
              {lifetimeCategory && lifetimeCategory.objective_count > 5 && (
                <p className="text-xs text-muted-foreground">
                  +{lifetimeCategory.objective_count - 5} more objectives
                </p>
              )}
            </CardContent>
          )}
        </Card>

        {/* Other Categories */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold">Your Categories</h2>
              <Button
                onClick={() => setIsAddDialogOpen(true)}
                disabled={!canAddMoreCategories}
                className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Category
              </Button>
            </div>
            {!canAddMoreCategories && (
              <p className="text-sm text-muted-foreground mt-2">
                Maximum of 10 categories reached
              </p>
            )}
          </CardHeader>
        </Card>

        {/* Categories Grid */}
        {categories.length === 0 ? (
          <Card className="p-12 text-center">
            <Sparkles className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No categories yet</h3>
            <p className="text-muted-foreground mb-6">
              Create your first category to start organizing your objectives
            </p>
            <Button
              onClick={() => setIsAddDialogOpen(true)}
              className="bg-objectives-primary hover:bg-objectives-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Category
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {categories.map((category) => (
              <Card
                key={category.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => navigate(`/objectives/category/${category.id}`)}
              >
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>{category.name}</span>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </CardTitle>
                  {category.description && (
                    <CardDescription>{category.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {category.objective_count} active {category.objective_count === 1 ? "objective" : "objectives"}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AddCategoryDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        onSuccess={fetchCategories}
      />
    </div>
  );
};

export default ObjectivesIndex;
