import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, Circle, MoreHorizontal, X, Pencil, Trash2, Plus, Calendar, ChevronLeft, ChevronRight, ArrowUpDown, Flag, Repeat, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, parseISO } from "date-fns";
import ProductivityAnalytics from "@/components/todos/ProductivityAnalytics";
import TaskTemplates from "@/components/todos/TaskTemplates";

type ViewMode = "day" | "week" | "month" | "analytics";
type TodoStatus = "pending" | "done" | "skipped";
type Priority = "high" | "medium" | "low";
type SortBy = "created" | "priority" | "status";

interface Todo {
  id: string;
  text: string;
  status: TodoStatus;
  date: string;
  priority: Priority;
  is_recurring: boolean;
  recurrence_type: string | null;
  recurrence_days: number[] | null;
}

const statusConfig = {
  pending: { label: "To Do", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  done: { label: "Completed", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  skipped: { label: "Skipped", color: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30" },
};

const priorityConfig = {
  high: { label: "High", color: "text-rose-500", bgColor: "bg-rose-500/10 border-rose-500/30" },
  medium: { label: "Medium", color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30" },
  low: { label: "Low", color: "text-slate-400", bgColor: "bg-slate-500/10 border-slate-500/30" },
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Todos = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [todos, setTodos] = useState<Todo[]>([]);
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("medium");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("created");
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringText, setRecurringText] = useState("");
  const [recurringPriority, setRecurringPriority] = useState<Priority>("medium");
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  useEffect(() => {
    if (user) {
      fetchAllTodos();
    }
  }, [user]);

  useEffect(() => {
    filterTodosByView();
  }, [allTodos, selectedDate, viewMode, sortBy]);

  const fetchAllTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("date", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching todos:", error);
    } else {
      setAllTodos((data || []).map(t => ({
        ...t,
        status: t.status as TodoStatus,
        priority: (t.priority || "medium") as Priority,
        is_recurring: t.is_recurring || false,
        recurrence_type: t.recurrence_type,
        recurrence_days: t.recurrence_days,
      })));
    }
    setLoading(false);
  };

  const sortTodos = (todosToSort: Todo[]) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { pending: 0, done: 1, skipped: 2 };
    
    return [...todosToSort].sort((a, b) => {
      if (sortBy === "priority") {
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      } else if (sortBy === "status") {
        return statusOrder[a.status] - statusOrder[b.status];
      }
      return 0;
    });
  };

  const filterTodosByView = () => {
    let filtered: Todo[] = [];
    
    if (viewMode === "day") {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = allTodos.filter(t => t.date === dateStr);
    } else if (viewMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      filtered = allTodos.filter(t => {
        const todoDate = parseISO(t.date);
        return todoDate >= weekStart && todoDate <= weekEnd;
      });
    } else if (viewMode === "month") {
      const monthStart = startOfMonth(selectedDate);
      const monthEnd = endOfMonth(selectedDate);
      filtered = allTodos.filter(t => {
        const todoDate = parseISO(t.date);
        return todoDate >= monthStart && todoDate <= monthEnd;
      });
    }
    
    setTodos(sortTodos(filtered));
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (viewMode === "day") {
      setSelectedDate(direction === "prev" ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
    } else if (viewMode === "week") {
      setSelectedDate(direction === "prev" ? subDays(selectedDate, 7) : addDays(selectedDate, 7));
    } else {
      const newDate = new Date(selectedDate);
      newDate.setMonth(newDate.getMonth() + (direction === "prev" ? -1 : 1));
      setSelectedDate(newDate);
    }
  };

  const addTodo = async () => {
    if (!newTodoText.trim() || !user) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const { data, error } = await supabase
      .from("todos")
      .insert({
        text: newTodoText.trim(),
        user_id: user.id,
        status: "pending",
        date: dateStr,
        priority: newTodoPriority,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add todo", variant: "destructive" });
    } else if (data) {
      const newTodo = {
        ...data,
        status: data.status as TodoStatus,
        priority: (data.priority || "medium") as Priority,
        is_recurring: false,
        recurrence_type: null,
        recurrence_days: null,
      };
      setAllTodos([newTodo, ...allTodos]);
      setNewTodoText("");
      setNewTodoPriority("medium");
      setIsAdding(false);
      toast({ title: "Task added" });
      logActivity(`Added task: ${data.text.substring(0, 30)}`, "Todos");
    }
  };

  const createRecurringTask = async () => {
    if (!recurringText.trim() || !user || recurringDays.length === 0) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }

    // Create tasks for the selected days
    const today = new Date();
    const tasksToCreate = [];
    
    if (recurringType === "weekly") {
      // Create for current week
      for (const day of recurringDays) {
        const taskDate = startOfWeek(today, { weekStartsOn: 1 });
        taskDate.setDate(taskDate.getDate() + day);
        if (taskDate >= today) {
          tasksToCreate.push({
            text: recurringText.trim(),
            user_id: user.id,
            status: "pending",
            date: format(taskDate, "yyyy-MM-dd"),
            priority: recurringPriority,
            is_recurring: true,
            recurrence_type: "weekly",
            recurrence_days: recurringDays,
          });
        }
      }
    } else if (recurringType === "daily") {
      // Create for next 7 days
      for (let i = 0; i < 7; i++) {
        const taskDate = addDays(today, i);
        tasksToCreate.push({
          text: recurringText.trim(),
          user_id: user.id,
          status: "pending",
          date: format(taskDate, "yyyy-MM-dd"),
          priority: recurringPriority,
          is_recurring: true,
          recurrence_type: "daily",
          recurrence_days: null,
        });
      }
    } else if (recurringType === "monthly") {
      // Create for selected days of month
      for (const day of recurringDays) {
        const taskDate = new Date(today.getFullYear(), today.getMonth(), day);
        if (taskDate >= today) {
          tasksToCreate.push({
            text: recurringText.trim(),
            user_id: user.id,
            status: "pending",
            date: format(taskDate, "yyyy-MM-dd"),
            priority: recurringPriority,
            is_recurring: true,
            recurrence_type: "monthly",
            recurrence_days: recurringDays,
          });
        }
      }
    }

    if (tasksToCreate.length === 0) {
      toast({ title: "No tasks to create", description: "Selected days are in the past" });
      return;
    }

    const { data, error } = await supabase
      .from("todos")
      .insert(tasksToCreate)
      .select();

    if (error) {
      toast({ title: "Error", description: "Failed to create recurring tasks", variant: "destructive" });
    } else {
      const newTodos = (data || []).map(t => ({
        ...t,
        status: t.status as TodoStatus,
        priority: (t.priority || "medium") as Priority,
        is_recurring: true,
        recurrence_type: t.recurrence_type,
        recurrence_days: t.recurrence_days,
      }));
      setAllTodos([...newTodos, ...allTodos]);
      setRecurringDialogOpen(false);
      setRecurringText("");
      setRecurringDays([]);
      toast({ title: `${newTodos.length} recurring tasks created` });
      logActivity(`Created ${newTodos.length} recurring tasks`, "Todos");
    }
  };

  const handleApplyTemplate = async (tasks: { text: string; priority: Priority; recurrence_type: "daily" | "weekly" | "monthly"; recurrence_days?: number[] }[]) => {
    if (!user) return;

    const today = new Date();
    const tasksToCreate = [];

    for (const task of tasks) {
      if (task.recurrence_type === "daily") {
        // Create for next 7 days
        for (let i = 0; i < 7; i++) {
          const taskDate = addDays(today, i);
          tasksToCreate.push({
            text: task.text,
            user_id: user.id,
            status: "pending",
            date: format(taskDate, "yyyy-MM-dd"),
            priority: task.priority,
            is_recurring: true,
            recurrence_type: "daily",
            recurrence_days: null,
          });
        }
      } else if (task.recurrence_type === "weekly" && task.recurrence_days) {
        // Create for current week
        for (const day of task.recurrence_days) {
          const weekStart = startOfWeek(today, { weekStartsOn: 1 });
          const taskDate = addDays(weekStart, day);
          if (taskDate >= today) {
            tasksToCreate.push({
              text: task.text,
              user_id: user.id,
              status: "pending",
              date: format(taskDate, "yyyy-MM-dd"),
              priority: task.priority,
              is_recurring: true,
              recurrence_type: "weekly",
              recurrence_days: task.recurrence_days,
            });
          }
        }
      }
    }

    if (tasksToCreate.length === 0) {
      toast({ title: "No tasks to create", description: "All tasks are scheduled for past dates" });
      return;
    }

    const { data, error } = await supabase
      .from("todos")
      .insert(tasksToCreate)
      .select();

    if (error) {
      toast({ title: "Error", description: "Failed to apply template", variant: "destructive" });
    } else {
      const newTodos = (data || []).map(t => ({
        ...t,
        status: t.status as TodoStatus,
        priority: (t.priority || "medium") as Priority,
        is_recurring: true,
        recurrence_type: t.recurrence_type,
        recurrence_days: t.recurrence_days,
      }));
      setAllTodos([...newTodos, ...allTodos]);
      toast({ title: `${newTodos.length} tasks created from template` });
      logActivity(`Applied task template: ${newTodos.length} tasks`, "Todos");
    }
  };

  const updateTodoStatus = async (id: string, status: TodoStatus) => {
    const todo = allTodos.find(t => t.id === id);
    const { error } = await supabase
      .from("todos")
      .update({ status })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update status", variant: "destructive" });
    } else {
      setAllTodos(allTodos.map(t => t.id === id ? { ...t, status } : t));
      if (todo) {
        const statusText = status === "done" ? "Completed" : status === "skipped" ? "Skipped" : "Marked pending";
        logActivity(`${statusText} task: ${todo.text.substring(0, 30)}`, "Todos");
      }
    }
  };

  const updateTodoPriority = async (id: string, priority: Priority) => {
    const { error } = await supabase
      .from("todos")
      .update({ priority })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update priority", variant: "destructive" });
    } else {
      setAllTodos(allTodos.map(t => t.id === id ? { ...t, priority } : t));
    }
  };

  const updateTodoText = async (id: string) => {
    if (!editText.trim()) return;

    const { error } = await supabase
      .from("todos")
      .update({ text: editText.trim() })
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to update todo", variant: "destructive" });
    } else {
      setAllTodos(allTodos.map(t => t.id === id ? { ...t, text: editText.trim() } : t));
      setEditingId(null);
      setEditText("");
    }
  };

  const deleteTodo = async (id: string) => {
    const todo = allTodos.find(t => t.id === id);
    const { error } = await supabase
      .from("todos")
      .delete()
      .eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete todo", variant: "destructive" });
    } else {
      setAllTodos(allTodos.filter(t => t.id !== id));
      toast({ title: "Task deleted" });
      if (todo) {
        logActivity(`Deleted task: ${todo.text.substring(0, 30)}`, "Todos");
      }
    }
  };

  const toggleStatus = (id: string, currentStatus: TodoStatus) => {
    const statusOrder: TodoStatus[] = ["pending", "done", "skipped"];
    const currentIndex = statusOrder.indexOf(currentStatus);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];
    updateTodoStatus(id, nextStatus);
  };

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const groupedTodos = todos.reduce((acc, todo) => {
    if (!acc[todo.date]) acc[todo.date] = [];
    acc[todo.date].push(todo);
    return acc;
  }, {} as Record<string, Todo[]>);

  const completed = todos.filter(t => t.status === "done").length;
  const skipped = todos.filter(t => t.status === "skipped").length;
  const pending = todos.filter(t => t.status === "pending").length;
  const highPriority = todos.filter(t => t.priority === "high" && t.status === "pending").length;
  const total = todos.length;

  const getDateLabel = () => {
    if (viewMode === "day") return format(selectedDate, "EEEE, MMMM d, yyyy");
    if (viewMode === "week") {
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d, yyyy")}`;
    }
    return format(selectedDate, "MMMM yyyy");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (viewMode === "analytics") {
    return (
      <div className="space-y-6 animate-fade-in">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-light text-foreground tracking-wide">Productivity Analytics</h1>
            <p className="text-sm text-muted-foreground mt-1">Track your task completion over time</p>
          </div>
          <div className="flex bg-muted rounded-lg p-1">
            {(["day", "week", "month", "analytics"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                  viewMode === mode
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {mode === "analytics" ? <BarChart3 className="w-4 h-4" /> : mode}
              </button>
            ))}
          </div>
        </header>
        <ProductivityAnalytics todos={allTodos} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light text-foreground tracking-wide">Todos</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your tasks by date</p>
        </div>

        {/* View Toggle */}
        <div className="flex bg-muted rounded-lg p-1">
          {(["day", "week", "month", "analytics"] as ViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 text-sm rounded-md transition-colors capitalize",
                viewMode === mode
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {mode === "analytics" ? <BarChart3 className="w-4 h-4" /> : mode}
            </button>
          ))}
        </div>
      </header>

      {/* Date Navigation & Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center justify-between bg-card border border-border rounded-lg p-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">{getDateLabel()}</span>
          </div>
          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">By Created</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>

          <TaskTemplates onApplyTemplate={handleApplyTemplate} />

          <Dialog open={recurringDialogOpen} onOpenChange={setRecurringDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Repeat className="w-4 h-4 mr-2" />
                Recurring
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Recurring Task</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Task</Label>
                  <Input
                    value={recurringText}
                    onChange={(e) => setRecurringText(e.target.value)}
                    placeholder="What needs to be done?"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={recurringPriority} onValueChange={(v) => setRecurringPriority(v as Priority)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Recurrence</Label>
                  <Select value={recurringType} onValueChange={(v) => {
                    setRecurringType(v as "daily" | "weekly" | "monthly");
                    setRecurringDays([]);
                  }}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recurringType === "weekly" && (
                  <div className="space-y-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2">
                      {DAYS_OF_WEEK.map((day, index) => (
                        <label key={day} className="flex items-center gap-2 cursor-pointer">
                          <Checkbox
                            checked={recurringDays.includes(index)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setRecurringDays([...recurringDays, index]);
                              } else {
                                setRecurringDays(recurringDays.filter(d => d !== index));
                              }
                            }}
                          />
                          <span className="text-sm">{day}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {recurringType === "monthly" && (
                  <div className="space-y-2">
                    <Label>Days of Month</Label>
                    <div className="grid grid-cols-7 gap-1">
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                        <button
                          key={day}
                          onClick={() => {
                            if (recurringDays.includes(day)) {
                              setRecurringDays(recurringDays.filter(d => d !== day));
                            } else {
                              setRecurringDays([...recurringDays, day]);
                            }
                          }}
                          className={cn(
                            "w-8 h-8 text-xs rounded-md border transition-colors",
                            recurringDays.includes(day)
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background border-border hover:bg-accent"
                          )}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button onClick={createRecurringTask} className="w-full">
                  Create Recurring Task
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-semibold text-foreground">{total}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400">{completed}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Completed</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400">{pending}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">To Do</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-semibold text-slate-600 dark:text-slate-400">{skipped}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Skipped</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-2xl font-semibold text-rose-500">{highPriority}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">High Priority</p>
        </div>
      </div>

      {/* Todo List - Day View */}
      {viewMode === "day" && (
        <div className="bg-card border border-border rounded-lg divide-y divide-border">
          {todos.length === 0 && !isAdding ? (
            <div className="p-8 text-center text-muted-foreground">
              No tasks for {format(selectedDate, "MMMM d")}. Add your first task below.
            </div>
          ) : (
            todos.map((todo) => (
              <div
                key={todo.id}
                className="flex items-center justify-between p-4 hover:bg-accent/30 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleStatus(todo.id, todo.status)}
                    className="focus:outline-none flex-shrink-0"
                  >
                    {todo.status === "done" ? (
                      <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    ) : todo.status === "skipped" ? (
                      <div className="w-5 h-5 rounded-full bg-slate-400 flex items-center justify-center">
                        <MoreHorizontal className="w-3 h-3 text-white" />
                      </div>
                    ) : (
                      <Circle className="w-5 h-5 text-amber-500" />
                    )}
                  </button>

                  {/* Priority Flag */}
                  <button
                    onClick={() => {
                      const order: Priority[] = ["low", "medium", "high"];
                      const next = order[(order.indexOf(todo.priority) + 1) % order.length];
                      updateTodoPriority(todo.id, next);
                    }}
                    className="focus:outline-none"
                  >
                    <Flag className={cn("w-4 h-4", priorityConfig[todo.priority].color)} />
                  </button>

                  {editingId === todo.id ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") updateTodoText(todo.id);
                          if (e.key === "Escape") setEditingId(null);
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button size="sm" variant="ghost" onClick={() => updateTodoText(todo.id)}>
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className={cn(
                        "text-sm truncate",
                        todo.status === "done" && "text-muted-foreground line-through",
                        todo.status === "skipped" && "text-muted-foreground"
                      )}>
                        {todo.text}
                      </span>
                      {todo.is_recurring && (
                        <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={cn("text-xs shrink-0", priorityConfig[todo.priority].bgColor)}>
                    {priorityConfig[todo.priority].label}
                  </Badge>
                  <Badge variant="outline" className={cn("text-xs shrink-0", statusConfig[todo.status].color)}>
                    {statusConfig[todo.status].label}
                  </Badge>
                  
                  {editingId !== todo.id && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => startEditing(todo)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => deleteTodo(todo.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-destructive" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {/* Add Todo Inline */}
          {isAdding && (
            <div className="flex items-center gap-3 p-4">
              <Circle className="w-5 h-5 text-muted-foreground flex-shrink-0" />
              <Select value={newTodoPriority} onValueChange={(v) => setNewTodoPriority(v as Priority)}>
                <SelectTrigger className="w-24 h-8">
                  <Flag className={cn("w-3 h-3 mr-1", priorityConfig[newTodoPriority].color)} />
                  <span className="text-xs">{newTodoPriority}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Input
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") addTodo();
                  if (e.key === "Escape") setIsAdding(false);
                }}
                placeholder="What needs to be done?"
                className="h-8 text-sm flex-1"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={addTodo}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Todo List - Week/Month View */}
      {(viewMode === "week" || viewMode === "month") && (
        <div className="space-y-4">
          {Object.keys(groupedTodos).length === 0 ? (
            <div className="bg-card border border-border rounded-lg p-8 text-center text-muted-foreground">
              No tasks for this {viewMode}. Switch to day view to add tasks.
            </div>
          ) : (
            Object.entries(groupedTodos)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dateTodos]) => (
                <div key={date} className="bg-card border border-border rounded-lg overflow-hidden">
                  <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                    <span className="font-medium text-sm text-foreground">
                      {format(parseISO(date), "EEEE, MMMM d")}
                    </span>
                    <div className="flex gap-2">
                      <Badge variant="outline" className={cn("text-xs", statusConfig.done.color)}>
                        {dateTodos.filter(t => t.status === "done").length} done
                      </Badge>
                      <Badge variant="outline" className={cn("text-xs", statusConfig.pending.color)}>
                        {dateTodos.filter(t => t.status === "pending").length} to do
                      </Badge>
                    </div>
                  </div>
                  <div className="divide-y divide-border">
                    {sortTodos(dateTodos).map((todo) => (
                      <div
                        key={todo.id}
                        className="flex items-center justify-between p-3 hover:bg-accent/30 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleStatus(todo.id, todo.status)}
                            className="focus:outline-none flex-shrink-0"
                          >
                            {todo.status === "done" ? (
                              <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : todo.status === "skipped" ? (
                              <div className="w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center">
                                <MoreHorizontal className="w-2.5 h-2.5 text-white" />
                              </div>
                            ) : (
                              <Circle className="w-4 h-4 text-amber-500" />
                            )}
                          </button>
                          <Flag className={cn("w-3 h-3", priorityConfig[todo.priority].color)} />
                          <span className={cn(
                            "text-sm truncate",
                            todo.status === "done" && "text-muted-foreground line-through",
                            todo.status === "skipped" && "text-muted-foreground"
                          )}>
                            {todo.text}
                          </span>
                          {todo.is_recurring && (
                            <Repeat className="w-3 h-3 text-muted-foreground shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={cn("text-xs shrink-0", priorityConfig[todo.priority].bgColor)}>
                            {priorityConfig[todo.priority].label}
                          </Badge>
                          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100" onClick={() => deleteTodo(todo.id)}>
                            <Trash2 className="w-3.5 h-3.5 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
          )}
        </div>
      )}

      {/* Add Todo Button (Day View Only) */}
      {viewMode === "day" && !isAdding && (
        <Button variant="vyom" className="w-full" onClick={() => setIsAdding(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Add Task for {format(selectedDate, "MMM d")}
        </Button>
      )}
    </div>
  );
};

export default Todos;
