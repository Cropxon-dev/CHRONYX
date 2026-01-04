interface AchievementItemProps {
  date: string;
  title: string;
  description: string;
  category: string;
}

const AchievementItem = ({ date, title, description, category }: AchievementItemProps) => {
  return (
    <div className="relative pl-6 pb-6 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-0 top-2 bottom-0 w-px bg-border" />
      {/* Timeline dot */}
      <div className="absolute left-0 top-2 w-2 h-2 -translate-x-[3px] rounded-full bg-vyom-accent" />
      
      <div>
        <span className="text-xs text-muted-foreground">{date}</span>
        <h4 className="text-sm font-medium text-foreground mt-1">{title}</h4>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
        <span className="inline-block text-xs text-vyom-accent bg-vyom-accent-soft px-2 py-0.5 rounded mt-2">
          {category}
        </span>
      </div>
    </div>
  );
};

export default AchievementItem;
