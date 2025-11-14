import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface ObjectiveWithCategory {
  id: string;
  title: string;
  description: string | null;
  status: "not_started" | "in_progress" | "completed";
  timeframe: "short_term" | "medium_term" | "long_term" | null;
  due_date: string | null;
  category_name: string;
  category_id: string;
}

const Timeline = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [objectives, setObjectives] = useState<ObjectiveWithCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchObjectives();
  }, []);

  const fetchObjectives = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("objectives")
        .select(`
          id,
          title,
          description,
          status,
          timeframe,
          due_date,
          objective_categories (
            name,
            id
          )
        `)
        .eq("user_id", user.id)
        .neq("status", "completed");

      if (error) throw error;

      const formatted: ObjectiveWithCategory[] = (data || []).map((obj: any) => ({
        id: obj.id,
        title: obj.title,
        description: obj.description,
        status: obj.status,
        timeframe: obj.timeframe,
        due_date: obj.due_date,
        category_name: obj.objective_categories.name,
        category_id: obj.objective_categories.id,
      }));

      setObjectives(formatted);
    } catch (error) {
      console.error("Error fetching objectives:", error);
      toast({
        title: "Error loading timeline",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTimeframeLabel = (timeframe: string | null) => {
    if (!timeframe) return "Lifetime";
    return timeframe.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const shortTermObjectives = objectives.filter(obj => obj.timeframe === "short_term");
  const mediumTermObjectives = objectives.filter(obj => obj.timeframe === "medium_term");
  const longTermObjectives = objectives.filter(obj => obj.timeframe === "long_term");
  const lifetimeObjectives = objectives.filter(obj => !obj.timeframe);

  const objectivesByDueDate = [...objectives]
    .filter(obj => obj.due_date)
    .sort((a, b) => {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-12 w-12 text-objectives-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Loading timeline...</p>
        </div>
      </div>
    );
  }

  const TimeframeSection = ({ title, objectives, color }: { title: string; objectives: ObjectiveWithCategory[]; color: string }) => (
    <Card>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${color}`}>
          <Clock className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>
          {objectives.length} active {objectives.length === 1 ? "objective" : "objectives"}
        </CardDescription>
      </CardHeader>
      {objectives.length > 0 && (
        <CardContent>
          <div className="space-y-3">
            {objectives.map((obj) => (
              <div
                key={obj.id}
                onClick={() => navigate(`/objectives/category/${obj.category_id}`)}
                className="p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
              >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium">{obj.title}</h4>
                      <p className="text-sm text-muted-foreground">{obj.category_name}</p>
                      {obj.due_date && (
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Due: {format(new Date(obj.due_date), "MMM d, yyyy")}
                        </p>
                      )}
                    </div>
                  </div>
              </div>
            ))}
          </div>
        </CardContent>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="h-10 w-10 text-objectives-primary" />
            <h1 className="text-4xl font-bold text-foreground">Timeline</h1>
          </div>
          <p className="text-muted-foreground">
            View your objectives organized by timeframe and due date
          </p>
        </div>

        {/* Timeframe Sections */}
        <div className="space-y-6 mb-8">
          <h2 className="text-2xl font-semibold">By Timeframe</h2>
          
          <div className="grid gap-4 md:grid-cols-2">
            <TimeframeSection
              title="Short Term"
              objectives={shortTermObjectives}
              color="text-green-600"
            />
            <TimeframeSection
              title="Medium Term"
              objectives={mediumTermObjectives}
              color="text-blue-600"
            />
            <TimeframeSection
              title="Long Term"
              objectives={longTermObjectives}
              color="text-purple-600"
            />
            <TimeframeSection
              title="Lifetime"
              objectives={lifetimeObjectives}
              color="text-objectives-primary"
            />
          </div>
        </div>

        {/* Due Date Section */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">By Due Date</h2>
          
          {objectivesByDueDate.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No due dates set</h3>
              <p className="text-muted-foreground">
                Add due dates to your categories to see them here
              </p>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6">
                <div className="space-y-3">
                  {objectivesByDueDate.map((obj) => (
                    <div
                      key={obj.id}
                      onClick={() => navigate(`/objectives/category/${obj.category_id}`)}
                      className="p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-medium">{obj.title}</h4>
                          <p className="text-sm text-muted-foreground">{obj.category_name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {getTimeframeLabel(obj.timeframe)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(obj.due_date!), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Timeline;
