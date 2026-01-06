import { useState, useEffect } from "react";
import MetricCard from "@/components/dashboard/MetricCard";
import LifespanBar from "@/components/dashboard/LifespanBar";
import TrendChart from "@/components/dashboard/TrendChart";
import Heatmap from "@/components/dashboard/Heatmap";
import ActivityItem from "@/components/dashboard/ActivityItem";
import AchievementItem from "@/components/dashboard/AchievementItem";
import LoanWidget from "@/components/dashboard/LoanWidget";
import InsuranceWidget from "@/components/dashboard/InsuranceWidget";
import UpcomingReminders from "@/components/dashboard/UpcomingReminders";
import FinancialOverview from "@/components/dashboard/FinancialOverview";
import OnboardingFlow from "@/components/onboarding/OnboardingFlow";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useOnboarding } from "@/hooks/useOnboarding";
import { format, subDays, startOfWeek, addDays, parseISO, formatDistanceToNow } from "date-fns";

import AppLayout from "./AppLayout";

const Dashboard = () => {
  const { user } = useAuth();
  const { showOnboarding, isLoading: onboardingLoading, completeOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [todosStats, setTodosStats] = useState({ completed: 0, total: 0 });
  const [studyMinutes, setStudyMinutes] = useState(0);
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [targetAge, setTargetAge] = useState(60);
  const [studyTrend, setStudyTrend] = useState<Array<{ name: string; value: number }>>([]);
  const [heatmapData, setHeatmapData] = useState<number[]>([]);
  const [recentActivity, setRecentActivity] = useState<Array<{ action: string; module: string; timestamp: string }>>([]);
  const [recentAchievements, setRecentAchievements] = useState<Array<{ date: string; title: string; description: string; category: string }>>([]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    const today = new Date().toISOString().split("T")[0];

    // Fetch todos for today
    const { data: todos } = await supabase
      .from("todos")
      .select("status")
      .eq("date", today);

    if (todos) {
      const completed = todos.filter(t => t.status === "done").length;
      setTodosStats({ completed, total: todos.length });
    }

    // Fetch study logs for today
    const { data: studyLogs } = await supabase
      .from("study_logs")
      .select("duration")
      .eq("date", today);

    if (studyLogs) {
      const total = studyLogs.reduce((acc, log) => acc + log.duration, 0);
      setStudyMinutes(total);
    }

    // Fetch profile for lifespan calculations
    const { data: profile } = await supabase
      .from("profiles")
      .select("birth_date, target_age")
      .eq("id", user?.id)
      .maybeSingle();

    if (profile) {
      if (profile.birth_date) {
        setBirthDate(new Date(profile.birth_date));
      }
      setTargetAge(profile.target_age || 60);
    }

    // Fetch study trend for this week
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const weekDates = weekDays.map(d => format(d, "yyyy-MM-dd"));
    
    const { data: weeklyStudy } = await supabase
      .from("study_logs")
      .select("date, duration")
      .gte("date", weekDates[0])
      .lte("date", weekDates[6]);

    const studyByDay: Record<string, number> = {};
    weeklyStudy?.forEach(log => {
      studyByDay[log.date] = (studyByDay[log.date] || 0) + log.duration;
    });

    const trendData = weekDays.map(day => ({
      name: format(day, "EEE"),
      value: studyByDay[format(day, "yyyy-MM-dd")] || 0,
    }));
    setStudyTrend(trendData);

    // Fetch heatmap data (last 84 days of todos)
    const heatmapStartDate = format(subDays(new Date(), 83), "yyyy-MM-dd");
    const { data: heatmapTodos } = await supabase
      .from("todos")
      .select("date, status")
      .gte("date", heatmapStartDate)
      .order("date", { ascending: true });

    const todosByDay: Record<string, { done: number; total: number }> = {};
    heatmapTodos?.forEach(todo => {
      if (!todosByDay[todo.date]) {
        todosByDay[todo.date] = { done: 0, total: 0 };
      }
      todosByDay[todo.date].total++;
      if (todo.status === "done") {
        todosByDay[todo.date].done++;
      }
    });

    const heatmap: number[] = [];
    for (let i = 83; i >= 0; i--) {
      const date = format(subDays(new Date(), i), "yyyy-MM-dd");
      const dayData = todosByDay[date];
      if (dayData && dayData.total > 0) {
        const ratio = dayData.done / dayData.total;
        heatmap.push(Math.round(ratio * 4));
      } else {
        heatmap.push(0);
      }
    }
    setHeatmapData(heatmap);

    // Fetch recent activity
    const { data: activityLogs } = await supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (activityLogs) {
      setRecentActivity(activityLogs.map(log => ({
        action: log.action,
        module: log.module,
        timestamp: formatDistanceToNow(new Date(log.created_at!), { addSuffix: true }),
      })));
    }

    // Fetch recent achievements
    const { data: achievements } = await supabase
      .from("achievements")
      .select("*")
      .order("achieved_at", { ascending: false })
      .limit(3);

    if (achievements) {
      setRecentAchievements(achievements.map(a => ({
        date: format(parseISO(a.achieved_at), "MMM d, yyyy"),
        title: a.title,
        description: a.description || "",
        category: a.category,
      })));
    }

    setLoading(false);
  };

  // Calculate lifespan data
  const effectiveBirthDate = birthDate || new Date(1991, 0, 1);
  const today = new Date();
  const daysLived = Math.floor((today.getTime() - effectiveBirthDate.getTime()) / (1000 * 60 * 60 * 24));
  const targetDate = new Date(effectiveBirthDate);
  targetDate.setFullYear(effectiveBirthDate.getFullYear() + targetAge);
  const daysRemaining = Math.max(0, Math.floor((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const completionRate = todosStats.total > 0 
    ? Math.round((todosStats.completed / todosStats.total) * 100) 
    : 0;

  if (loading || onboardingLoading) {
    return (
      <AppLayout>
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
      </AppLayout>
    );
  }

 if (showOnboarding) {
    return (
      <AppLayout>
        <OnboardingFlow onComplete={completeOnboarding} />
      </AppLayout>
    );
  }

  return (
      <AppLayout>
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Today</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </header>

      {/* Metric Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard value={completionRate} suffix="%" label="Todo Completion" />
        <MetricCard value={studyMinutes} suffix="min" label="Study Today" />
        <MetricCard value="—" label="EMI Due" />
        <MetricCard value="—" label="Active Policies" />
      </section>

      {/* Days Remaining Highlight */}
      <section className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground uppercase tracking-wider">Days Until {targetAge}</p>
            <p className="text-4xl md:text-5xl font-semibold text-foreground mt-2">
              {daysRemaining.toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">
              ~{Math.floor(daysRemaining / 365)} years
            </p>
          </div>
        </div>
      </section>

      {/* Trends Section */}
      <section>
        <h2 className="text-lg font-light text-foreground mb-4">Trends</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Heatmap title="Productivity" data={heatmapData.length > 0 ? heatmapData : Array(84).fill(0)} />
          <TrendChart title="Study This Week" data={studyTrend.length > 0 ? studyTrend : []} />
        </div>
      </section>

      {/* Life Section */}
      <section>
        <h2 className="text-lg font-light text-foreground mb-4">Life</h2>
        <LifespanBar daysLived={daysLived} daysRemaining={daysRemaining} />
      </section>

      {/* Financial Overview */}
      <section>
        <h2 className="text-lg font-light text-foreground mb-4">Financial Overview</h2>
        <FinancialOverview />
      </section>

      {/* Loan & Insurance Widgets */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <LoanWidget />
        <InsuranceWidget />
        <UpcomingReminders />
      </section>

      {/* Bottom Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Achievements */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
            Recent Achievements
          </h3>
          <div className="space-y-0">
            {recentAchievements.length > 0 ? (
              recentAchievements.map((achievement, i) => (
                <AchievementItem key={i} {...achievement} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No achievements yet</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
            Recent Activity
          </h3>
          <div>
            {recentActivity.length > 0 ? (
              recentActivity.map((activity, i) => (
                <ActivityItem key={i} {...activity} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recent activity</p>
            )}
          </div>
        </div>
      </section>
    </div>
  </AppLayout>
  );
};

export default Dashboard;
