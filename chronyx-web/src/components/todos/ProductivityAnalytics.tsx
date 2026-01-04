import { useMemo } from "react";
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval, parseISO, startOfMonth, endOfMonth, eachWeekOfInterval } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from "recharts";

type TodoStatus = "pending" | "done" | "skipped";
type Priority = "high" | "medium" | "low";

interface Todo {
  id: string;
  text: string;
  status: TodoStatus;
  date: string;
  priority: Priority;
  is_recurring: boolean;
}

interface ProductivityAnalyticsProps {
  todos: Todo[];
}

const COLORS = {
  completed: "hsl(150, 30%, 45%)",
  pending: "hsl(35, 70%, 50%)",
  skipped: "hsl(220, 10%, 50%)",
  high: "hsl(0, 70%, 55%)",
  medium: "hsl(35, 70%, 50%)",
  low: "hsl(220, 10%, 60%)",
};

const ProductivityAnalytics = ({ todos }: ProductivityAnalyticsProps) => {
  // Last 30 days data
  const last30DaysData = useMemo(() => {
    const today = new Date();
    const days = eachDayOfInterval({
      start: subDays(today, 29),
      end: today,
    });

    return days.map(day => {
      const dateStr = format(day, "yyyy-MM-dd");
      const dayTodos = todos.filter(t => t.date === dateStr);
      const completed = dayTodos.filter(t => t.status === "done").length;
      const total = dayTodos.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        date: format(day, "MMM d"),
        completed,
        total,
        rate,
        pending: dayTodos.filter(t => t.status === "pending").length,
        skipped: dayTodos.filter(t => t.status === "skipped").length,
      };
    });
  }, [todos]);

  // Weekly aggregation
  const weeklyData = useMemo(() => {
    const today = new Date();
    const weeks = eachWeekOfInterval(
      { start: subDays(today, 56), end: today },
      { weekStartsOn: 1 }
    );

    return weeks.map(weekStart => {
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      const weekTodos = todos.filter(t => {
        const todoDate = parseISO(t.date);
        return todoDate >= weekStart && todoDate <= weekEnd;
      });

      const completed = weekTodos.filter(t => t.status === "done").length;
      const total = weekTodos.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        week: `${format(weekStart, "MMM d")}`,
        completed,
        total,
        rate,
      };
    });
  }, [todos]);

  // Priority distribution
  const priorityData = useMemo(() => {
    const high = todos.filter(t => t.priority === "high").length;
    const medium = todos.filter(t => t.priority === "medium").length;
    const low = todos.filter(t => t.priority === "low").length;

    return [
      { name: "High", value: high, color: COLORS.high },
      { name: "Medium", value: medium, color: COLORS.medium },
      { name: "Low", value: low, color: COLORS.low },
    ];
  }, [todos]);

  // Status distribution
  const statusData = useMemo(() => {
    const completed = todos.filter(t => t.status === "done").length;
    const pending = todos.filter(t => t.status === "pending").length;
    const skipped = todos.filter(t => t.status === "skipped").length;

    return [
      { name: "Completed", value: completed, color: COLORS.completed },
      { name: "Pending", value: pending, color: COLORS.pending },
      { name: "Skipped", value: skipped, color: COLORS.skipped },
    ];
  }, [todos]);

  // Overall stats
  const stats = useMemo(() => {
    const total = todos.length;
    const completed = todos.filter(t => t.status === "done").length;
    const pending = todos.filter(t => t.status === "pending").length;
    const highPriorityCompleted = todos.filter(t => t.priority === "high" && t.status === "done").length;
    const highPriorityTotal = todos.filter(t => t.priority === "high").length;
    const recurring = todos.filter(t => t.is_recurring).length;

    // Average daily completion (last 30 days)
    const last30 = last30DaysData.filter(d => d.total > 0);
    const avgRate = last30.length > 0 
      ? Math.round(last30.reduce((sum, d) => sum + d.rate, 0) / last30.length)
      : 0;

    // Streak
    let streak = 0;
    for (let i = last30DaysData.length - 1; i >= 0; i--) {
      if (last30DaysData[i].total > 0 && last30DaysData[i].completed === last30DaysData[i].total) {
        streak++;
      } else if (last30DaysData[i].total > 0) {
        break;
      }
    }

    return {
      total,
      completed,
      pending,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      highPriorityRate: highPriorityTotal > 0 ? Math.round((highPriorityCompleted / highPriorityTotal) * 100) : 0,
      avgRate,
      streak,
      recurring,
    };
  }, [todos, last30DaysData]);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold text-foreground">{stats.completionRate}%</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Overall Completion</p>
            <Progress value={stats.completionRate} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold text-foreground">{stats.avgRate}%</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">30-Day Average</p>
            <Progress value={stats.avgRate} className="mt-3 h-1.5" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold text-rose-500">{stats.highPriorityRate}%</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">High Priority Done</p>
            <Progress value={stats.highPriorityRate} className="mt-3 h-1.5 [&>div]:bg-rose-500" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-3xl font-semibold text-vyom-accent">{stats.streak}</div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Day Streak</p>
            <p className="text-xs text-muted-foreground mt-2">Perfect completion days</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Completion Rate Over Time */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={last30DaysData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    interval={4}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                    formatter={(value: number) => [`${value}%`, 'Rate']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="rate" 
                    stroke="hsl(var(--vyom-accent))"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Tasks Completed */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tasks Completed (Weekly)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="week" 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="completed" fill={COLORS.completed} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total" fill="hsl(var(--muted))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Status Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {statusData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Priority Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Priority Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[200px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      fontSize: '12px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-2">
              {priorityData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-xs text-muted-foreground">{item.name}: {item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Daily Breakdown (Heatmap-style) */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Daily Activity (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1">
            {last30DaysData.map((day, index) => (
              <div
                key={index}
                className="w-6 h-6 rounded-sm flex items-center justify-center text-[8px] font-medium"
                style={{
                  backgroundColor: day.total === 0 
                    ? 'hsl(var(--muted))' 
                    : day.rate === 100 
                      ? COLORS.completed
                      : day.rate >= 50 
                        ? 'hsl(150, 30%, 60%)'
                        : 'hsl(150, 30%, 75%)',
                  color: day.rate >= 50 ? 'white' : 'hsl(var(--muted-foreground))',
                }}
                title={`${day.date}: ${day.completed}/${day.total} (${day.rate}%)`}
              >
                {day.completed > 0 ? day.completed : ''}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <span>No tasks</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(150, 30%, 75%)' }} />
              <span>&lt;50%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'hsl(150, 30%, 60%)' }} />
              <span>50-99%</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: COLORS.completed }} />
              <span>100%</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductivityAnalytics;
