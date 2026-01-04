import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format, startOfYear, endOfYear, eachDayOfInterval, getDay, parseISO, startOfWeek, addYears, subYears, isSameYear } from "date-fns";

interface StudyLog {
  id: string;
  subject: string;
  duration: number;
  date: string;
}

interface YearlyHeatmapProps {
  studyLogs: StudyLog[];
}

const formatDuration = (minutes: number) => {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export const YearlyHeatmap = ({ studyLogs }: YearlyHeatmapProps) => {
  const [selectedYear, setSelectedYear] = useState(new Date());
  const currentYear = new Date();

  // Build GitHub-style heatmap data
  const heatmapData = useMemo(() => {
    const yearStart = startOfYear(selectedYear);
    const yearEnd = endOfYear(selectedYear);
    
    // Get all days in the year
    const allDays = eachDayOfInterval({ start: yearStart, end: yearEnd });
    
    // Create a map of date -> minutes
    const dateMinutes: Record<string, number> = {};
    studyLogs.forEach(log => {
      const logDate = parseISO(log.date);
      if (logDate >= yearStart && logDate <= yearEnd) {
        const dateKey = format(logDate, "yyyy-MM-dd");
        dateMinutes[dateKey] = (dateMinutes[dateKey] || 0) + log.duration;
      }
    });

    // Find max for scaling
    const maxMinutes = Math.max(...Object.values(dateMinutes), 1);

    // Group days into weeks (columns)
    const firstDayOfYear = startOfWeek(yearStart, { weekStartsOn: 0 }); // GitHub uses Sunday start
    const weeks: Array<Array<{ date: Date; minutes: number; isInYear: boolean }>> = [];
    let currentWeek: Array<{ date: Date; minutes: number; isInYear: boolean }> = [];
    
    // Add padding days from the previous year
    let currentDate = firstDayOfYear;
    while (currentDate < yearStart) {
      currentWeek.push({ date: currentDate, minutes: 0, isInYear: false });
      currentDate = new Date(currentDate);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Add all days
    allDays.forEach((day) => {
      const dayOfWeek = getDay(day); // 0 = Sunday
      const dateKey = format(day, "yyyy-MM-dd");
      
      if (dayOfWeek === 0 && currentWeek.length > 0) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      
      currentWeek.push({
        date: day,
        minutes: dateMinutes[dateKey] || 0,
        isInYear: true,
      });
    });

    // Push the last week
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }

    // Calculate month labels positions
    const monthLabels: { month: string; weekIndex: number }[] = [];
    let currentMonth = -1;
    weeks.forEach((week, weekIndex) => {
      const firstDayInWeek = week.find(d => d.isInYear);
      if (firstDayInWeek) {
        const month = firstDayInWeek.date.getMonth();
        if (month !== currentMonth) {
          currentMonth = month;
          monthLabels.push({ month: MONTHS[month], weekIndex });
        }
      }
    });

    // Calculate year totals
    const totalMinutes = Object.values(dateMinutes).reduce((a, b) => a + b, 0);
    const activeDays = Object.keys(dateMinutes).length;
    const totalDaysInYear = allDays.length;

    return { weeks, monthLabels, maxMinutes, totalMinutes, activeDays, totalDaysInYear };
  }, [studyLogs, selectedYear]);

  const getIntensityClass = (minutes: number, max: number) => {
    if (minutes === 0) return "bg-muted/40";
    const ratio = minutes / max;
    if (ratio < 0.25) return "bg-primary/20";
    if (ratio < 0.5) return "bg-primary/40";
    if (ratio < 0.75) return "bg-primary/60";
    return "bg-primary/80";
  };

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Yearly Overview</h3>
          <p className="text-xs text-muted-foreground mt-1">
            {heatmapData.activeDays} active days • {formatDuration(heatmapData.totalMinutes)} total
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setSelectedYear(prev => subYears(prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[60px] text-center">
            {format(selectedYear, "yyyy")}
          </span>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-7 w-7"
            onClick={() => setSelectedYear(prev => addYears(prev, 1))}
            disabled={isSameYear(selectedYear, currentYear)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Month Labels */}
      <div className="overflow-x-auto pb-2">
        <div className="inline-block min-w-full">
          {/* Month labels row */}
          <div className="flex mb-1 ml-8">
            <div className="flex" style={{ gap: "3px" }}>
              {heatmapData.monthLabels.map((label, i) => (
                <div 
                  key={i}
                  className="text-[10px] text-muted-foreground"
                  style={{ 
                    position: "relative",
                    left: `${label.weekIndex * 13}px`,
                    marginRight: i < heatmapData.monthLabels.length - 1 
                      ? `${(heatmapData.monthLabels[i + 1]?.weekIndex - label.weekIndex - 1) * 13}px` 
                      : "0"
                  }}
                >
                  {label.month}
                </div>
              ))}
            </div>
          </div>

          {/* Heatmap grid */}
          <div className="flex">
            {/* Weekday labels */}
            <div className="flex flex-col mr-2" style={{ gap: "3px" }}>
              {WEEKDAYS.map((day, i) => (
                <div 
                  key={i} 
                  className="text-[9px] text-muted-foreground h-[10px] flex items-center justify-end pr-1"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Weeks grid */}
            <div className="flex" style={{ gap: "3px" }}>
              {heatmapData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="flex flex-col" style={{ gap: "3px" }}>
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={cn(
                        "w-[10px] h-[10px] rounded-[2px] transition-colors",
                        !day.isInYear && "opacity-0",
                        day.isInYear && getIntensityClass(day.minutes, heatmapData.maxMinutes)
                      )}
                      title={day.isInYear ? `${format(day.date, "EEEE, MMM d, yyyy")}: ${day.minutes > 0 ? formatDuration(day.minutes) : 'No study'}` : ""}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-end gap-2 mt-4 text-[10px] text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-0.5">
              <div className="w-[10px] h-[10px] rounded-[2px] bg-muted/40" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/20" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/40" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/60" />
              <div className="w-[10px] h-[10px] rounded-[2px] bg-primary/80" />
            </div>
            <span>More</span>
          </div>
        </div>
      </div>
    </div>
  );
};
