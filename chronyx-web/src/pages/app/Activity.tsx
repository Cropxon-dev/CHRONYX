import { useState } from "react";
import { cn } from "@/lib/utils";
import ActivityItem from "@/components/dashboard/ActivityItem";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow, isToday, parseISO } from "date-fns";

const modules = ["All", "Todos", "Study", "Loans", "Insurance", "Lifespan", "Achievements", "Settings"];

const Activity = () => {
  const { user } = useAuth();
  const [filter, setFilter] = useState("All");

  const { data: activityLogs = [], isLoading } = useQuery({
    queryKey: ["activity-logs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const formattedLogs = activityLogs.map(log => {
    const createdAt = parseISO(log.created_at!);
    let timestamp: string;
    
    if (isToday(createdAt)) {
      timestamp = `Today, ${format(createdAt, "h:mm a")}`;
    } else {
      timestamp = format(createdAt, "MMM d, h:mm a");
    }
    
    return {
      id: log.id,
      action: log.action,
      module: log.module,
      timestamp,
      created_at: log.created_at,
    };
  });

  const filteredActivity = filter === "All"
    ? formattedLogs
    : formattedLogs.filter(a => a.module === filter);

  const todayCount = activityLogs.filter(a => 
    a.created_at && isToday(parseISO(a.created_at))
  ).length;

  const activeModules = new Set(activityLogs.map(a => a.module)).size;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Activity</h1>
        <p className="text-sm text-muted-foreground mt-1">Your recent actions across all modules</p>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-foreground">{activityLogs.length}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Total Actions</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-foreground">{todayCount}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Today</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-3xl font-semibold text-vyom-accent">{activeModules}</p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Active Modules</p>
        </div>
      </div>

      {/* Module Filters */}
      <div className="flex flex-wrap gap-2">
        {modules.map((module) => (
          <button
            key={module}
            onClick={() => setFilter(module)}
            className={cn(
              "px-3 py-1.5 text-sm rounded-md transition-colors",
              filter === module
                ? "bg-vyom-accent text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {module}
          </button>
        ))}
      </div>

      {/* Activity List */}
      <div className="bg-card border border-border rounded-lg p-6">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">Loading...</div>
        ) : filteredActivity.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            No activity recorded yet
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredActivity.map((activity) => (
              <ActivityItem key={activity.id} {...activity} />
            ))}
          </div>
        )}
      </div>

      {/* Note */}
      <p className="text-xs text-muted-foreground text-center">
        Activity log is read-only. Actions are recorded automatically.
      </p>
    </div>
  );
};

export default Activity;
