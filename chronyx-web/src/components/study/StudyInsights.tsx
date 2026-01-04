import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Download, FileJson, FileText, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, subMonths, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, isWithinInterval, parseISO, isSameDay, getDay, addMonths, subYears, differenceInDays } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { YearlyHeatmap } from "./YearlyHeatmap";

type DateRange = "week" | "month" | "halfYear" | "year" | "all";
type ViewMode = "daily" | "weekly" | "monthly";

interface StudyLog {
  id: string;
  subject: string;
  topic?: string | null;
  duration: number;
  date: string;
  focus_level?: string | null;
  notes?: string | null;
  planned_duration?: number | null;
}

interface StudyInsightsProps {
  studyLogs: StudyLog[];
}

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

export const StudyInsights = ({ studyLogs }: StudyInsightsProps) => {
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [dateRange, setDateRange] = useState<DateRange>("month");
  const [viewMode, setViewMode] = useState<ViewMode>("daily");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [exporting, setExporting] = useState(false);

  // Calculate date boundaries based on range
  const dateBoundaries = useMemo(() => {
    const now = new Date();
    let start: Date;
    let end = now;

    switch (dateRange) {
      case "week":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "halfYear":
        start = subMonths(now, 6);
        break;
      case "year":
        start = startOfYear(now);
        break;
      case "all":
      default:
        start = studyLogs.length > 0 
          ? parseISO(studyLogs[studyLogs.length - 1].date) 
          : subYears(now, 1);
        break;
    }

    return { start, end };
  }, [dateRange, studyLogs]);

  // Filter logs by date range
  const filteredLogs = useMemo(() => {
    return studyLogs.filter(log => {
      const logDate = parseISO(log.date);
      return isWithinInterval(logDate, { start: dateBoundaries.start, end: dateBoundaries.end });
    });
  }, [studyLogs, dateBoundaries]);

  // Summary stats for selected period
  const periodStats = useMemo(() => {
    const totalMinutes = filteredLogs.reduce((acc, log) => acc + log.duration, 0);
    const plannedMinutes = filteredLogs.reduce((acc, log) => acc + (log.planned_duration || 0), 0);
    const totalSessions = filteredLogs.length;
    const uniqueDays = new Set(filteredLogs.map(log => log.date)).size;
    const avgPerSession = totalSessions > 0 ? Math.round(totalMinutes / totalSessions) : 0;
    const avgPerDay = uniqueDays > 0 ? Math.round(totalMinutes / uniqueDays) : 0;

    // Subject breakdown
    const subjectTotals: Record<string, number> = {};
    filteredLogs.forEach(log => {
      subjectTotals[log.subject] = (subjectTotals[log.subject] || 0) + log.duration;
    });

    const topSubjects = Object.entries(subjectTotals)
      .map(([subject, minutes]) => ({ subject, minutes }))
      .sort((a, b) => b.minutes - a.minutes);

    return { totalMinutes, plannedMinutes, totalSessions, uniqueDays, avgPerSession, avgPerDay, topSubjects };
  }, [filteredLogs]);

  // Chart data based on view mode - fixed for better display
  const chartData = useMemo(() => {
    if (filteredLogs.length === 0) return [];

    switch (viewMode) {
      case "daily": {
        const days = eachDayOfInterval({ start: dateBoundaries.start, end: dateBoundaries.end });
        // Limit to reasonable number of days for daily view
        const displayDays = days.length > 31 ? days.slice(-31) : days;
        return displayDays.map(day => {
          const dayStr = format(day, "yyyy-MM-dd");
          const dayMinutes = filteredLogs
            .filter(log => log.date === dayStr)
            .reduce((acc, log) => acc + log.duration, 0);
          const plannedMinutes = filteredLogs
            .filter(log => log.date === dayStr)
            .reduce((acc, log) => acc + (log.planned_duration || 0), 0);
          return {
            label: format(day, "MMM d"),
            shortLabel: format(day, "d"),
            minutes: dayMinutes,
            planned: plannedMinutes,
            date: dayStr,
          };
        });
      }
      case "weekly": {
        const weeks = eachWeekOfInterval(
          { start: dateBoundaries.start, end: dateBoundaries.end },
          { weekStartsOn: 1 }
        );
        return weeks.map(weekStart => {
          const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
          const weekLogs = filteredLogs.filter(log => {
            const logDate = parseISO(log.date);
            return isWithinInterval(logDate, { start: weekStart, end: weekEnd });
          });
          const weekMinutes = weekLogs.reduce((acc, log) => acc + log.duration, 0);
          const plannedMinutes = weekLogs.reduce((acc, log) => acc + (log.planned_duration || 0), 0);
          return {
            label: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
            shortLabel: format(weekStart, "M/d"),
            minutes: weekMinutes,
            planned: plannedMinutes,
          };
        });
      }
      case "monthly": {
        const months = eachMonthOfInterval({ start: dateBoundaries.start, end: dateBoundaries.end });
        return months.map(month => {
          const monthStart = startOfMonth(month);
          const monthEnd = endOfMonth(month);
          const monthLogs = filteredLogs.filter(log => {
            const logDate = parseISO(log.date);
            return isWithinInterval(logDate, { start: monthStart, end: monthEnd });
          });
          const monthMinutes = monthLogs.reduce((acc, log) => acc + log.duration, 0);
          const plannedMinutes = monthLogs.reduce((acc, log) => acc + (log.planned_duration || 0), 0);
          return {
            label: format(month, "MMMM yyyy"),
            shortLabel: format(month, "MMM"),
            minutes: monthMinutes,
            planned: plannedMinutes,
          };
        });
      }
      default:
        return [];
    }
  }, [filteredLogs, viewMode, dateBoundaries]);

  // Calendar heatmap data
  const calendarData = useMemo(() => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    const firstDayOfWeek = getDay(monthStart);
    const startOffset = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;
    
    return {
      days: days.map(day => {
        const dayStr = format(day, "yyyy-MM-dd");
        const dayMinutes = studyLogs
          .filter(log => log.date === dayStr)
          .reduce((acc, log) => acc + log.duration, 0);
        return { date: day, minutes: dayMinutes };
      }),
      startOffset,
      monthLabel: format(calendarMonth, "MMMM yyyy"),
    };
  }, [calendarMonth, studyLogs]);

  // Longest streak calculation
  const longestStreak = useMemo(() => {
    if (studyLogs.length === 0) return 0;
    
    const sortedDates = [...new Set(studyLogs.map(log => log.date))].sort();
    let maxStreak = 1;
    let currentStreak = 1;
    
    for (let i = 1; i < sortedDates.length; i++) {
      const prevDate = parseISO(sortedDates[i - 1]);
      const currDate = parseISO(sortedDates[i]);
      const diff = differenceInDays(currDate, prevDate);
      
      if (diff === 1) {
        currentStreak++;
        maxStreak = Math.max(maxStreak, currentStreak);
      } else {
        currentStreak = 1;
      }
    }
    
    return maxStreak;
  }, [studyLogs]);

  // Export functions
  const exportProgress = async (type: "json" | "pdf") => {
    setExporting(true);
    try {
      const exportData = {
        period: dateRange,
        startDate: format(dateBoundaries.start, "yyyy-MM-dd"),
        endDate: format(dateBoundaries.end, "yyyy-MM-dd"),
        summary: periodStats,
        sessions: filteredLogs,
        exportedAt: new Date().toISOString(),
      };

      if (type === "json") {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `study-progress-${dateRange}-${format(new Date(), "yyyy-MM-dd")}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast({ title: "Progress exported as JSON" });
      } else {
        const printWindow = window.open("", "_blank");
        if (printWindow) {
          printWindow.document.write(generateProgressPDF(exportData));
          printWindow.document.close();
          setTimeout(() => printWindow.print(), 500);
        }
        toast({ title: "PDF ready for printing" });
      }
      logActivity(`Exported ${dateRange} study progress as ${type.toUpperCase()}`, "Study");
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const generateProgressPDF = (data: any): string => {
    const rangeLabel = {
      week: "This Week",
      month: "This Month",
      halfYear: "Last 6 Months",
      year: "This Year",
      all: "All Time",
    }[data.period];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Study Progress Report</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { font-size: 24px; font-weight: 300; margin-bottom: 4px; letter-spacing: 0.05em; }
            h2 { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.1em; color: #666; margin: 28px 0 14px; padding-bottom: 6px; border-bottom: 1px solid #eee; }
            .meta { font-size: 11px; color: #888; margin-bottom: 24px; }
            .period { font-size: 14px; color: #444; margin-bottom: 4px; }
            .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 24px; }
            .stat { padding: 16px; background: #f8f8f8; border-radius: 8px; }
            .stat-value { font-size: 28px; font-weight: 300; color: #1a1a1a; }
            .stat-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; margin-top: 2px; }
            .subjects { margin-top: 16px; }
            .subject-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0; }
            .subject-name { font-weight: 500; }
            .subject-time { color: #666; }
            .session { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
            .session-title { font-weight: 500; }
            .session-meta { font-size: 12px; color: #666; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <h1>Study Progress Report</h1>
          <p class="period">${rangeLabel}</p>
          <p class="meta">${format(parseISO(data.startDate), "MMM d, yyyy")} — ${format(parseISO(data.endDate), "MMM d, yyyy")} • Exported ${format(new Date(), "MMM d, yyyy")}</p>
          
          <div class="stats-grid">
            <div class="stat">
              <div class="stat-value">${formatDuration(data.summary.totalMinutes)}</div>
              <div class="stat-label">Actual Time</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatDuration(data.summary.plannedMinutes)}</div>
              <div class="stat-label">Planned Time</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.totalSessions}</div>
              <div class="stat-label">Sessions</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.summary.uniqueDays}</div>
              <div class="stat-label">Active Days</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatDuration(data.summary.avgPerDay)}</div>
              <div class="stat-label">Avg per Day</div>
            </div>
            <div class="stat">
              <div class="stat-value">${formatDuration(data.summary.avgPerSession)}</div>
              <div class="stat-label">Avg per Session</div>
            </div>
          </div>

          <h2>Time by Subject</h2>
          <div class="subjects">
            ${data.summary.topSubjects.map((s: any) => `
              <div class="subject-row">
                <span class="subject-name">${s.subject}</span>
                <span class="subject-time">${formatDuration(s.minutes)}</span>
              </div>
            `).join('')}
          </div>

          <h2>Recent Sessions (${Math.min(data.sessions.length, 25)})</h2>
          ${data.sessions.slice(0, 25).map((s: any) => `
            <div class="session">
              <div class="session-title">${s.subject}${s.topic ? ` — ${s.topic}` : ''}</div>
              <div class="session-meta">${format(parseISO(s.date), "MMM d, yyyy")} • Actual: ${s.duration}m${s.planned_duration ? ` • Planned: ${s.planned_duration}m` : ''} • Focus: ${s.focus_level || 'medium'}</div>
            </div>
          `).join('')}
        </body>
      </html>
    `;
  };

  const rangeLabels: Record<DateRange, string> = {
    week: "This Week",
    month: "This Month",
    halfYear: "Last 6 Months",
    year: "This Year",
    all: "All Time",
  };

  // Custom tooltip for chart
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-1">{data.label}</p>
          <p className="text-sm font-medium">Actual: {formatDuration(data.minutes)}</p>
          {data.planned > 0 && (
            <p className="text-xs text-muted-foreground">Planned: {formatDuration(data.planned)}</p>
          )}
        </div>
      );
    }
    return null;
  };

  if (studyLogs.length === 0) {
    return (
      <div className="bg-card border border-border rounded-lg p-12 text-center">
        <p className="text-muted-foreground">Log some study sessions to see insights.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
            <SelectTrigger className="w-[140px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="halfYear">Last 6 Months</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>

          <Select value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <SelectTrigger className="w-[120px] bg-card border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="border-border" disabled={exporting}>
              <Download className="w-4 h-4 mr-2" />
              {exporting ? "Exporting..." : "Export Progress"}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-card border-border">
            <DropdownMenuItem onClick={() => exportProgress("json")} className="cursor-pointer">
              <FileJson className="w-4 h-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => exportProgress("pdf")} className="cursor-pointer">
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Period Summary */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-baseline justify-between mb-6">
          <h3 className="text-sm text-muted-foreground">{rangeLabels[dateRange]} Summary</h3>
          <span className="text-xs text-muted-foreground">
            {format(dateBoundaries.start, "MMM d")} — {format(dateBoundaries.end, "MMM d, yyyy")}
          </span>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <p className="text-2xl font-light text-foreground">{formatDuration(periodStats.totalMinutes)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Actual Time</p>
          </div>
          <div>
            <p className="text-2xl font-light text-foreground">{formatDuration(periodStats.plannedMinutes)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Planned Time</p>
          </div>
          <div>
            <p className="text-2xl font-light text-foreground">{periodStats.totalSessions}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-light text-foreground">{periodStats.uniqueDays}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Active Days</p>
          </div>
          <div>
            <p className="text-2xl font-light text-foreground">{formatDuration(periodStats.avgPerDay)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg / Day</p>
          </div>
          <div>
            <p className="text-2xl font-light text-foreground">{formatDuration(periodStats.avgPerSession)}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Avg / Session</p>
          </div>
        </div>
      </div>

      {/* Progress Chart - Fixed layout */}
      {chartData.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm text-muted-foreground mb-6">
            {viewMode === "daily" ? "Daily" : viewMode === "weekly" ? "Weekly" : "Monthly"} Progress
          </h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={chartData} 
                margin={{ top: 8, right: 8, left: -20, bottom: 8 }}
                barCategoryGap="20%"
              >
                <XAxis 
                  dataKey="shortLabel" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  interval={viewMode === "daily" && chartData.length > 15 ? Math.ceil(chartData.length / 10) : 0}
                  height={30}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(value) => value > 0 ? `${Math.floor(value / 60)}h` : '0'}
                  width={40}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="minutes" 
                  radius={[4, 4, 0, 0]} 
                  fill="hsl(var(--primary))"
                  fillOpacity={0.6}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Yearly GitHub-style Heatmap */}
      <YearlyHeatmap studyLogs={studyLogs} />

      {/* Subject Distribution */}
      {periodStats.topSubjects.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h3 className="text-sm text-muted-foreground mb-4">Time by Subject</h3>
          <div className="space-y-3">
            {periodStats.topSubjects.slice(0, 6).map((item, index) => {
              const maxMinutes = periodStats.topSubjects[0]?.minutes || 1;
              const percentage = (item.minutes / maxMinutes) * 100;
              
              return (
                <div key={item.subject} className="space-y-1.5">
                  <div className="flex justify-between text-sm">
                    <span className="text-foreground">{item.subject}</span>
                    <span className="text-muted-foreground tabular-nums">{formatDuration(item.minutes)}</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary/40 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, opacity: 1 - (index * 0.12) }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Calendar Heatmap - Monthly view */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm text-muted-foreground">Monthly Consistency</h3>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCalendarMonth(prev => addMonths(prev, -1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">{calendarData.monthLabel}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => setCalendarMonth(prev => addMonths(prev, 1))}
              disabled={isSameDay(startOfMonth(calendarMonth), startOfMonth(new Date()))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
            <div key={day} className="text-[10px] text-muted-foreground text-center py-2 font-medium">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-2">
          {/* Empty cells for offset */}
          {Array.from({ length: calendarData.startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {/* Day cells */}
          {calendarData.days.map((day, i) => {
            const intensity = day.minutes === 0 ? 0 : Math.min(day.minutes / 120, 1);
            const isToday = isSameDay(day.date, new Date());
            const isFuture = day.date > new Date();
            
            return (
              <div
                key={i}
                className={cn(
                  "aspect-square rounded-lg flex flex-col items-center justify-center text-xs relative transition-colors p-1",
                  isToday && "ring-2 ring-primary/50",
                  isFuture && "opacity-30"
                )}
                style={!isFuture && intensity > 0 ? { 
                  backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.45})` 
                } : !isFuture && intensity === 0 ? {
                  backgroundColor: `hsl(var(--muted) / 0.4)`
                } : undefined}
                title={`${format(day.date, "EEEE, MMM d")}: ${day.minutes > 0 ? formatDuration(day.minutes) : 'No study'}`}
              >
                <span className={cn(
                  "tabular-nums font-medium",
                  intensity > 0.5 ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {format(day.date, "d")}
                </span>
                {day.minutes > 0 && (
                  <span className={cn(
                    "text-[8px] tabular-nums",
                    intensity > 0.5 ? "text-primary-foreground/80" : "text-muted-foreground/80"
                  )}>
                    {day.minutes}m
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground">
          <span>Less</span>
          <div className="flex gap-1">
            {[0, 0.25, 0.5, 0.75, 1].map((intensity) => (
              <div
                key={intensity}
                className="w-4 h-4 rounded-sm"
                style={intensity > 0 ? { 
                  backgroundColor: `hsl(var(--primary) / ${0.15 + intensity * 0.45})` 
                } : {
                  backgroundColor: `hsl(var(--muted) / 0.4)`
                }}
              />
            ))}
          </div>
          <span>More</span>
        </div>
      </div>

      {/* Streaks */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-2xl font-light text-foreground">{longestStreak} days</p>
          <p className="text-xs text-muted-foreground mt-0.5">Longest Streak</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-5">
          <p className="text-2xl font-light text-foreground">
            {periodStats.uniqueDays > 0 
              ? Math.round((periodStats.uniqueDays / Math.max(1, differenceInDays(dateBoundaries.end, dateBoundaries.start) + 1)) * 100)
              : 0}%
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Consistency Rate</p>
        </div>
      </div>
    </div>
  );
};
