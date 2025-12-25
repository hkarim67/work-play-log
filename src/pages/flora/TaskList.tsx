import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Clock, Calendar as CalendarIcon, Trash2, Pencil, GripVertical, Pin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AddTaskDialog } from "@/components/flora/AddTaskDialog";
import { EditTaskDialog } from "@/components/flora/EditTaskDialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface Task {
  id: string;
  title: string;
  notes: string | null;
  estimated_minutes: number | null;
  due_date: string | null;
  completed_at: string | null;
  sort_order: number;
  priority: "high" | "medium" | "low";
  is_fixed: boolean;
  recurrence: string | null;
  last_completed_date: string | null;
}

interface ListInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SortableTaskItemProps {
  task: Task;
  index: number;
  isFixed?: boolean;
  isCompletedToday?: boolean;
  onToggleComplete: (taskId: string, completed: string | null, isFixed: boolean) => void;
  onDelete: (taskId: string) => void;
  onEdit: (taskId: string) => void;
  onPriorityChange: (taskId: string, priority: "high" | "medium" | "low") => void;
  formatEstimatedTime: (minutes: number | null) => string;
  getPriorityColor: (priority: "high" | "medium" | "low") => string;
  getPriorityBadgeColor: (priority: "high" | "medium" | "low") => string;
}

const SortableTaskItem = ({
  task,
  index,
  isFixed,
  isCompletedToday,
  onToggleComplete,
  onDelete,
  onEdit,
  onPriorityChange,
  formatEstimatedTime,
  getPriorityColor,
  getPriorityBadgeColor,
}: SortableTaskItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const cardClasses = isFixed 
    ? "group hover:shadow-md transition-all animate-fade-in border-l-4 border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
    : `group hover:shadow-md transition-all animate-fade-in ${getPriorityColor(task.priority)}`;

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cardClasses}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div
            {...attributes}
            {...listeners}
            className="flex items-center gap-2 cursor-grab active:cursor-grabbing mt-1"
          >
            <span className="text-sm font-medium text-muted-foreground w-5 text-right">
              {index + 1}.
            </span>
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <Checkbox
            checked={isFixed ? isCompletedToday : false}
            onCheckedChange={() => onToggleComplete(task.id, task.completed_at, task.is_fixed)}
            className="mt-1"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {isFixed && <Pin className="h-4 w-4 text-blue-500" />}
              <h3 className={`font-medium text-foreground ${isFixed && isCompletedToday ? 'line-through opacity-60' : ''}`}>{task.title}</h3>
              {isFixed ? (
                <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  {task.recurrence === 'daily' ? 'Daily' : task.recurrence === 'weekly' ? 'Weekly' : 'Fixed'}
                </span>
              ) : (
                <Select value={task.priority} onValueChange={(value) => onPriorityChange(task.id, value as "high" | "medium" | "low")}>
                  <SelectTrigger className={`w-24 h-6 text-xs border-0 ${getPriorityBadgeColor(task.priority)}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </div>
            {task.notes && (
              <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {task.estimated_minutes && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatEstimatedTime(task.estimated_minutes)}
                </div>
              )}
              {task.due_date && (
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3 w-3" />
                  {format(new Date(task.due_date), "MMM d")}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit(task.id)}
            >
              <Pencil className="h-4 w-4 text-flora-sage" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(task.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const TaskList = () => {
  const { listId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [listInfo, setListInfo] = useState<ListInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchListAndTasks();
  }, [listId, showCompleted]);

  const fetchListAndTasks = async () => {
    try {
      setLoading(true);
      
      const { data: list, error: listError } = await supabase
        .from("flora_lists")
        .select("*")
        .eq("id", listId)
        .single();

      if (listError) throw listError;
      setListInfo(list);

      let query = supabase
        .from("flora_tasks")
        .select("*")
        .eq("list_id", listId);

      if (!showCompleted) {
        query = query.is("completed_at", null);
      }

      const { data: tasks, error: tasksError } = await query;
      if (tasksError) throw tasksError;

      // Sort tasks by priority first (high -> medium -> low), then by sort_order within each priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const sortedTasks = (tasks || []).sort((a, b) => {
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.sort_order - b.sort_order;
      });

      console.log('[TaskList] Sorted tasks:', sortedTasks.map(t => ({ title: t.title, priority: t.priority, sort_order: t.sort_order })));
      setTasks(sortedTasks);
    } catch (error) {
      toast({
        title: "Error loading tasks",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    const oldIndex = tasks.findIndex((t) => t.id === active.id);
    const newIndex = tasks.findIndex((t) => t.id === over.id);

    const newTasks = arrayMove(tasks, oldIndex, newIndex);
    setTasks(newTasks);

    // Update sort_order in database
    try {
      const updates = newTasks.map((task, index) => ({
        id: task.id,
        sort_order: index,
      }));

      for (const update of updates) {
        await supabase
          .from("flora_tasks")
          .update({ sort_order: update.sort_order })
          .eq("id", update.id);
      }

      toast({
        title: "Order updated",
      });
    } catch (error) {
      toast({
        title: "Error updating order",
        variant: "destructive",
      });
      fetchListAndTasks(); // Revert on error
    }
  };

  const toggleTaskComplete = async (taskId: string, currentCompleted: string | null, isFixed: boolean = false) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (isFixed) {
        // For fixed tasks, toggle last_completed_date
        const task = tasks.find(t => t.id === taskId);
        const isCompletedToday = task?.last_completed_date === today;
        
        const { error } = await supabase
          .from("flora_tasks")
          .update({ last_completed_date: isCompletedToday ? null : today })
          .eq("id", taskId);

        if (error) throw error;

        toast({
          title: isCompletedToday ? "Marked incomplete for today" : "Completed for today! 🌸",
        });
      } else {
        // Regular task completion
        const { error } = await supabase
          .from("flora_tasks")
          .update({ completed_at: currentCompleted ? null : new Date().toISOString() })
          .eq("id", taskId);

        if (error) throw error;

        toast({
          title: currentCompleted ? "Task marked incomplete" : "Task completed! 🌸",
          description: currentCompleted ? "" : "Great work!",
        });
      }

      fetchListAndTasks();
    } catch (error) {
      toast({
        title: "Error updating task",
        variant: "destructive",
      });
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("flora_tasks")
        .delete()
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Task deleted",
      });

      fetchListAndTasks();
    } catch (error) {
      toast({
        title: "Error deleting task",
        variant: "destructive",
      });
    }
  };

  const formatEstimatedTime = (minutes: number | null) => {
    if (!minutes) return "";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "border-l-4 border-l-green-500";
      case "medium":
        return "border-l-4 border-l-orange-500";
      case "low":
        return "border-l-4 border-l-red-500";
    }
  };

  const getPriorityBadgeColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-green-500/10 text-green-700 dark:text-green-400";
      case "medium":
        return "bg-orange-500/10 text-orange-700 dark:text-orange-400";
      case "low":
        return "bg-red-500/10 text-red-700 dark:text-red-400";
    }
  };

  const updateTaskPriority = async (taskId: string, priority: "high" | "medium" | "low") => {
    try {
      const { error } = await supabase
        .from("flora_tasks")
        .update({ priority })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Priority updated",
      });

      fetchListAndTasks();
    } catch (error) {
      toast({
        title: "Error updating priority",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (taskId: string) => {
    setEditingTaskId(taskId);
    setIsEditDialogOpen(true);
  };

  if (loading || !listInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Separate fixed tasks from regular tasks
  const fixedTasks = tasks.filter((t) => t.is_fixed);
  const regularTasks = tasks.filter((t) => !t.is_fixed);
  const outstandingTasks = regularTasks.filter((t) => !t.completed_at);
  const completedTasks = regularTasks.filter((t) => t.completed_at);

  return (
    <div className="min-h-screen bg-gradient-to-br from-flora-warm via-background to-flora-peach/10 overflow-auto">
      <main className="container mx-auto px-4 py-8 max-w-4xl pb-24">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/flora")}
          className="mb-4 -ml-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lists
        </Button>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="text-4xl">{listInfo.icon}</div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">{listInfo.name}</h1>
                <p className="text-xs text-muted-foreground">
                  {outstandingTasks.length} outstanding
                </p>
              </div>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Task
          </Button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Checkbox
              id="show-completed"
              checked={showCompleted}
              onCheckedChange={(checked) => setShowCompleted(checked as boolean)}
            />
            <label htmlFor="show-completed" className="text-sm text-muted-foreground cursor-pointer">
              Show completed tasks
            </label>
          </div>
        </div>

        {fixedTasks.length === 0 && outstandingTasks.length === 0 && completedTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">🌸</div>
            <p className="text-muted-foreground mb-4">No tasks yet</p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add your first task
            </Button>
          </div>
        )}

        {/* Fixed Tasks Section - Always at the top */}
        {fixedTasks.length > 0 && (
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400">
              <Pin className="h-4 w-4" />
              Fixed Tasks ({fixedTasks.length})
            </div>
            <div className="space-y-2">
              {fixedTasks.map((task, index) => (
                <SortableTaskItem
                  key={task.id}
                  task={task}
                  index={index}
                  isFixed={true}
                  isCompletedToday={task.last_completed_date === today}
                  onToggleComplete={toggleTaskComplete}
                  onDelete={deleteTask}
                  onEdit={openEditDialog}
                  onPriorityChange={updateTaskPriority}
                  formatEstimatedTime={formatEstimatedTime}
                  getPriorityColor={getPriorityColor}
                  getPriorityBadgeColor={getPriorityBadgeColor}
                />
              ))}
            </div>
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={outstandingTasks.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {outstandingTasks.length > 0 && (
              <div className="space-y-2">
                {outstandingTasks.map((task, index) => (
                  <SortableTaskItem
                    key={task.id}
                    task={task}
                    index={index}
                    onToggleComplete={toggleTaskComplete}
                    onDelete={deleteTask}
                    onEdit={openEditDialog}
                    onPriorityChange={updateTaskPriority}
                    formatEstimatedTime={formatEstimatedTime}
                    getPriorityColor={getPriorityColor}
                    getPriorityBadgeColor={getPriorityBadgeColor}
                  />
                ))}
              </div>
            )}
          </SortableContext>
        </DndContext>

        {showCompleted && completedTasks.length > 0 && (
          <div className="mt-8">
            <div className="mb-3 text-sm font-medium text-muted-foreground">
              Completed ({completedTasks.length})
            </div>
            <div className="space-y-2">
              {completedTasks.map((task, index) => (
                <Card
                  key={task.id}
                  className={`group opacity-60 hover:opacity-100 transition-opacity animate-fade-in ${getPriorityColor(task.priority)}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5 text-right mt-1">
                        {index + 1}.
                      </span>
                      <Checkbox
                        checked={true}
                        onCheckedChange={() => toggleTaskComplete(task.id, task.completed_at)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground line-through">
                            {task.title}
                          </h3>
                          <Select value={task.priority} onValueChange={(value) => updateTaskPriority(task.id, value as "high" | "medium" | "low")}>
                            <SelectTrigger className={`w-24 h-6 text-xs border-0 ${getPriorityBadgeColor(task.priority)}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="high">High</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="low">Low</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {task.notes && (
                          <p className="text-sm text-muted-foreground mb-2">{task.notes}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(task.id)}
                        >
                          <Pencil className="h-4 w-4 text-flora-sage" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteTask(task.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>

      <AddTaskDialog
        open={isAddDialogOpen}
        onOpenChange={setIsAddDialogOpen}
        listId={listId!}
        onTaskAdded={fetchListAndTasks}
      />

      {editingTaskId && (
        <EditTaskDialog
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          taskId={editingTaskId}
          onTaskUpdated={fetchListAndTasks}
        />
      )}
    </div>
  );
};

export default TaskList;
