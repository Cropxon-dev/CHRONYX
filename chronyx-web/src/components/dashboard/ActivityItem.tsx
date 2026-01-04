interface ActivityItemProps {
  action: string;
  module: string;
  timestamp: string;
}

const ActivityItem = ({ action, module, timestamp }: ActivityItemProps) => {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-vyom-accent" />
        <div>
          <p className="text-sm text-foreground">{action}</p>
          <p className="text-xs text-muted-foreground">{module}</p>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{timestamp}</span>
    </div>
  );
};

export default ActivityItem;
