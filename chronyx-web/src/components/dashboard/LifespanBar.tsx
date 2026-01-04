interface LifespanBarProps {
  daysLived: number;
  daysRemaining: number;
}

const LifespanBar = ({ daysLived, daysRemaining }: LifespanBarProps) => {
  const totalDays = daysLived + daysRemaining;
  const percentage = (daysLived / totalDays) * 100;

  // Year markers for age 30, 40, 50, 60
  const markers = [30, 40, 50, 60].map(age => ({
    age,
    position: ((age * 365) / totalDays) * 100,
  }));

  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
        Life Progress
      </h3>

      {/* Progress Bar */}
      <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-4">
        <div 
          className="absolute inset-y-0 left-0 bg-vyom-accent rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${percentage}%` }}
        />
        {/* Year Markers */}
        {markers.map(({ age, position }) => (
          <div
            key={age}
            className="absolute top-0 bottom-0 w-px bg-foreground/20"
            style={{ left: `${position}%` }}
          />
        ))}
      </div>

      {/* Marker Labels */}
      <div className="relative h-6 mb-6">
        {markers.map(({ age, position }) => (
          <span
            key={age}
            className="absolute text-xs text-muted-foreground -translate-x-1/2"
            style={{ left: `${position}%` }}
          >
            {age}
          </span>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {daysLived.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Days Lived
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-foreground">
            {daysRemaining.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Days Remaining
          </p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-vyom-accent">
            {percentage.toFixed(1)}%
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">
            Complete
          </p>
        </div>
      </div>
    </div>
  );
};

export default LifespanBar;
