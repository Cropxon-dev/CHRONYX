import { cn } from "@/lib/utils";

interface HeatmapProps {
  title: string;
  data: number[]; // 0-4 intensity levels for each day
}

const Heatmap = ({ title, data }: HeatmapProps) => {
  const getColorClass = (value: number) => {
    switch (value) {
      case 0: return "bg-muted";
      case 1: return "bg-vyom-accent/20";
      case 2: return "bg-vyom-accent/40";
      case 3: return "bg-vyom-accent/60";
      case 4: return "bg-vyom-accent";
      default: return "bg-muted";
    }
  };

  // Organize data into weeks (7 days each)
  const weeks: number[][] = [];
  for (let i = 0; i < data.length; i += 7) {
    weeks.push(data.slice(i, i + 7));
  }

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
        {title}
      </h3>
      
      <div className="flex gap-1">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day, dayIndex) => (
              <div
                key={dayIndex}
                className={cn(
                  "w-3 h-3 rounded-sm transition-colors",
                  getColorClass(day)
                )}
              />
            ))}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-2 mt-4 text-xs text-muted-foreground">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={cn("w-3 h-3 rounded-sm", getColorClass(level))}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
};

export default Heatmap;
