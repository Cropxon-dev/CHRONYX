import { cn } from "@/lib/utils";

interface MetricCardProps {
  value: string | number;
  label: string;
  suffix?: string;
  className?: string;
}

const MetricCard = ({ value, label, suffix, className }: MetricCardProps) => {
  return (
    <div className={cn(
      "bg-card border border-border rounded-lg p-6 transition-all duration-200 hover:border-border/80",
      className
    )}>
      <div className="flex items-baseline gap-1">
        <span className="vyom-metric-value">{value}</span>
        {suffix && (
          <span className="text-xl font-medium text-muted-foreground">{suffix}</span>
        )}
      </div>
      <p className="vyom-metric-label mt-2">{label}</p>
    </div>
  );
};

export default MetricCard;
