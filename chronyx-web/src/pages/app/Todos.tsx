import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Check,
  Circle,
  MoreHorizontal,
  X,
  Pencil,
  Trash2,
  Plus,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Flag,
  Repeat,
  BarChart3
} from "lucide-react";

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

import {
  format,
  addDays,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  parseISO
} from "date-fns";

import ProductivityAnalytics from "@/components/todos/ProductivityAnalytics";
import TaskTemplates from "@/components/todos/TaskTemplates";

type ViewMode = "day" | "week" | "month" | "analytics";
type TodoStatus = "pending" | "done" | "skipped";
type Priority = "high" | "medium" | "low";
type SortBy = "created" | "priority" | "status";

interface Todo {
  id: string;
  user_id: string;

  title: string;
  description: string | null;

  status: TodoStatus;
  priority: Priority;

  due_date: string;     // yyyy-mm-dd
  due_time: string | null;

  is_recurring: boolean;
  recurrence_type: "daily" | "weekly" | "monthly" | null;
  recurrence_days: number[] | null;
}

const statusConfig = {
  pending: { label: "To Do", color: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30" },
  done: { label: "Completed", color: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30" },
  skipped: { label: "Skipped", color: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30" }
};

const priorityConfig = {
  high: { label: "High", color: "text-rose-500", bgColor: "bg-rose-500/10 border-rose-500/30" },
  medium: { label: "Medium", color: "text-amber-500", bgColor: "bg-amber-500/10 border-amber-500/30" },
  low: { label: "Low", color: "text-slate-400", bgColor: "bg-slate-500/10 border-slate-500/30" }
};

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const Todos = () => {
  const [viewMode, setViewMode] = useState<ViewMode>("day");
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [todos, setTodos] = useState<Todo[]>([]);
  const [allTodos, setAllTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);

  // Add inline state
  const [isAdding, setIsAdding] = useState(false);
  const [newTodoText, setNewTodoText] = useState("");
  const [newTodoPriority, setNewTodoPriority] = useState<Priority>("medium");

  // Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  const [sortBy, setSortBy] = useState<SortBy>("created");

  // Recurring
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [recurringType, setRecurringType] = useState<"daily" | "weekly" | "monthly">("weekly");
  const [recurringDays, setRecurringDays] = useState<number[]>([]);
  const [recurringText, setRecurringText] = useState("");
  const [recurringPriority, setRecurringPriority] = useState<Priority>("medium");

  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();

  // Load todos
  useEffect(() => {
    if (user) fetchAllTodos();
  }, [user]);

  useEffect(() => {
    filterTodosByView();
  }, [allTodos, selectedDate, viewMode, sortBy]);

  const fetchAllTodos = async () => {
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("due_date", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) console.error("Fetch error:", error);
    else setAllTodos((data || []) as Todo[]);

    setLoading(false);
  };

  const sortTodos = (list: Todo[]) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    const statusOrder = { pending: 0, done: 1, skipped: 2 };

    return [...list].sort((a, b) => {
      if (sortBy === "priority") return priorityOrder[a.priority] - priorityOrder[b.priority];
      if (sortBy === "status") return statusOrder[a.status] - statusOrder[b.status];
      return 0;
    });
  };

  const filterTodosByView = () => {
    let filtered: Todo[] = [];

    if (viewMode === "day") {
      const dateStr = format(selectedDate, "yyyy-MM-dd");
      filtered = allTodos.filter(t => t.due_date === dateStr);
    } else if (viewMode === "week") {
      const start = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const end = endOfWeek(selectedDate, { weekStartsOn: 1 });
      filtered = allTodos.filter(t => {
        const d = parseISO(t.due_date);
        return d >= start && d <= end;
      });
    } else if (viewMode === "month") {
      const start = startOfMonth(selectedDate);
      const end = endOfMonth(selectedDate);
      filtered = allTodos.filter(t => {
        const d = parseISO(t.due_date);
        return d >= start && d <= end;
      });
    }

    setTodos(sortTodos(filtered));
  };

  const navigateDate = (direction: "prev" | "next") => {
    if (viewMode === "day")
      setSelectedDate(direction === "prev" ? subDays(selectedDate, 1) : addDays(selectedDate, 1));
    else if (viewMode === "week")
      setSelectedDate(direction === "prev" ? subDays(selectedDate, 7) : addDays(selectedDate, 7));
    else {
      const d = new Date(selectedDate);
      d.setMonth(d.getMonth() + (direction === "prev" ? -1 : 1));
      setSelectedDate(d);
    }
  };

  // ---------- CRUD ----------

  const addTodo = async () => {
    if (!user || !newTodoText.trim()) return;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    const { data, error } = await supabase
      .from("todos")
      .insert({
        user_id: user.id,
        title: newTodoText.trim(),
        description: null,
        priority: newTodoPriority,
        status: "pending",
        due_date: dateStr,
        due_time: null,
        is_recurring: false,
        recurrence_type: null,
        recurrence_days: null
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to add todo", variant: "destructive" });
      console.error(error);
      return;
    }

    setAllTodos([data as Todo, ...allTodos]);
    setNewTodoText("");
    setIsAdding(false);
  };

  const updateTodoStatus = async (id: string, status: TodoStatus) => {
    await supabase.from("todos").update({ status }).eq("id", id);
    setAllTodos(allTodos.map(t => (t.id === id ? { ...t, status } : t)));
  };

  const toggleStatus = (id: string, current: TodoStatus) => {
    const order: TodoStatus[] = ["pending", "done", "skipped"];
    const next = order[(order.indexOf(current) + 1) % order.length];
    updateTodoStatus(id, next);
  };

  const updateTodoText = async (id: string) => {
    if (!editText.trim()) return;

    await supabase.from("todos").update({ title: editText.trim() }).eq("id", id);

    setAllTodos(allTodos.map(t => (t.id === id ? { ...t, title: editText.trim() } : t)));
    setEditingId(null);
    setEditText("");
  };

  const updateTodoPriority = async (id: string, priority: Priority) => {
    await supabase.from("todos").update({ priority }).eq("id", id);
    setAllTodos(allTodos.map(t => (t.id === id ? { ...t, priority } : t)));
  };

  const deleteTodo = async (id: string) => {
    await supabase.from("todos").delete().eq("id", id);
    setAllTodos(allTodos.filter(t => t.id !== id));
  };

  // ---------- UI helpers ----------

  const groupedTodos = todos.reduce((acc: Record<string, Todo[]>, t) => {
    if (!acc[t.due_date]) acc[t.due_date] = [];
    acc[t.due_date].push(t);
    return acc;
  }, {});

  const completed = todos.filter(t => t.status === "done").length;
  const skipped = todos.filter(t => t.status === "skipped").length;
  const pending = todos.filter(t => t.status === "pending").length;
  const highPriority = todos.filter(t => t.priority === "high").length;

  const getDateLabel = () => {
    if (viewMode === "day") return format(selectedDate, "EEEE, MMM dd, yyyy");
    if (viewMode === "week") {
      const s = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const e = endOfWeek(selectedDate, { weekStartsOn: 1 });
      return `${format(s, "MMM d")} – ${format(e, "MMM d, yyyy")}`;
    }
    return format(selectedDate, "MMMM yyyy");
  };

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        Loading…
      </div>
    );

  // ---------- RENDER ----------

  return (
    <div className="space-y-6 animate-fade-in">

      {/* HEADER */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-light">Todos</h1>
          <p className="text-sm text-muted-foreground">Track your tasks by date</p>
        </div>

        <div className="flex bg-muted rounded-lg p-1">
          {(["day", "week", "month", "analytics"] as ViewMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={cn(
                "px-3 py-1.5 rounded-md text-sm",
                viewMode === mode ? "bg-card shadow" : "text-muted-foreground"
              )}
            >
              {mode === "analytics" ? <BarChart3 className="w-4 h-4" /> : mode}
            </button>
          ))}
        </div>
      </header>

      {/* DATE CONTROL */}
      <div className="flex gap-4 flex-col sm:flex-row">
        <div className="flex items-center justify-between border rounded-lg p-4 flex-1">
          <Button variant="ghost" size="icon" onClick={() => navigateDate("prev")}>
            <ChevronLeft />
          </Button>

          <div className="flex gap-2 items-center">
            <Calendar />
            <span>{getDateLabel()}</span>
          </div>

          <Button variant="ghost" size="icon" onClick={() => navigateDate("next")}>
            <ChevronRight />
          </Button>
        </div>

        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
            <SelectTrigger className="w-[140px]">
              <ArrowUpDown className="mr-2 w-4 h-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created">By Created</SelectItem>
              <SelectItem value="priority">By Priority</SelectItem>
              <SelectItem value="status">By Status</SelectItem>
            </SelectContent>
          </Select>

          <TaskTemplates onApplyTemplate={() => {}} />

        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Stat label="Total" value={todos.length} />
        <Stat label="Completed" value={completed} />
        <Stat label="Pending" value={pending} />
        <Stat label="Skipped" value={skipped} />
        <Stat label="High Priority" value={highPriority} />
      </div>

      {/* DAY LIST */}
      {viewMode === "day" && (
        <div className="border rounded-lg divide-y">
          {todos.length === 0 && !isAdding && (
            <div className="p-8 text-center text-muted-foreground">
              No tasks. Add one below 👇
            </div>
          )}

          {todos.map(todo => (
            <TodoRow
              key={todo.id}
              todo={todo}
              editingId={editingId}
              editText={editText}
              setEditText={setEditText}
              setEditingId={setEditingId}
              toggleStatus={toggleStatus}
              deleteTodo={deleteTodo}
              updateTodoText={updateTodoText}
              updateTodoPriority={updateTodoPriority}
            />
          ))}

          {isAdding && (
            <AddRow
              value={newTodoText}
              setValue={setNewTodoText}
              priority={newTodoPriority}
              setPriority={setNewTodoPriority}
              onSave={addTodo}
              onCancel={() => setIsAdding(false)}
            />
          )}
        </div>
      )}

      {viewMode === "day" && !isAdding && (
        <Button className="w-full" onClick={() => setIsAdding(true)}>
          <Plus className="mr-2 w-4 h-4" /> Add Task
        </Button>
      )}

    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
  <div className="border p-4 rounded-lg">
    <p className="text-2xl font-bold">{value}</p>
    <p className="text-xs mt-1 text-muted-foreground">{label}</p>
  </div>
);

const TodoRow = ({
  todo,
  editingId,
  editText,
  setEditText,
  setEditingId,
  toggleStatus,
  deleteTodo,
  updateTodoText,
  updateTodoPriority
}: any) => (
  <div className="flex items-center justify-between p-4">
    <div className="flex items-center gap-3 flex-1">
      <button onClick={() => toggleStatus(todo.id, todo.status)}>
        {todo.status === "done" ? (
          <Check className="text-emerald-500" />
        ) : todo.status === "skipped" ? (
          <MoreHorizontal className="text-slate-400" />
        ) : (
          <Circle className="text-amber-500" />
        )}
      </button>

      <button
        onClick={() => {
          const order: Priority[] = ["low", "medium", "high"];
          const next = order[(order.indexOf(todo.priority) + 1) % order.length];
          updateTodoPriority(todo.id, next);
        }}
      >
        <Flag className={priorityConfig[todo.priority].color} />
      </button>

      {editingId === todo.id ? (
        <>
          <Input
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") updateTodoText(todo.id)
          }}
        />
          <Button size="icon" onClick={() => updateTodoText(todo.id)}>
            <Check />
          </Button>
        </>
      ) : (
        <span>{todo.title}</span>
      )}
    </div>

  <Button size="icon" variant="ghost" onClick={() => {
        setEditingId(todo.id); 
      setEditText(todo.title);   // <-- preload text
      }}
      >
      <Pencil />
    </Button>


    <Button size="icon" variant="ghost" onClick={() => deleteTodo(todo.id)}>
      <Trash2 className="text-destructive" />
    </Button>
  </div>
);

const AddRow = ({
  value,
  setValue,
  priority,
  setPriority,
  onSave,
  onCancel
}: any) => (
  <div className="flex p-4 gap-3">
    <Select value={priority} onValueChange={setPriority}>
      <SelectTrigger className="w-24">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="low">Low</SelectItem>
      </SelectContent>
    </Select>

    <Input value={value} onChange={e => setValue(e.target.value)} placeholder="Task..." />

    <Button onClick={onSave}>
      <Check />
    </Button>

    <Button variant="ghost" onClick={onCancel}>
      <X />
    </Button>
  </div>
);

export default Todos;
