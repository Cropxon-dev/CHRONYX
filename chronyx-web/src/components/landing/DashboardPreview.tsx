import { motion } from "framer-motion";
import { 
  CheckSquare, 
  BookOpen, 
  Wallet, 
  TrendingUp, 
  Clock,
  Calendar,
  BarChart3,
  PieChart
} from "lucide-react";

// Animated metric counter
const AnimatedCounter = ({ value, suffix = "" }: { value: number; suffix?: string }) => {
  return (
    <motion.span
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.3 }}
      >
        {value}{suffix}
      </motion.span>
    </motion.span>
  );
};

// Animated progress bar
const AnimatedProgress = ({ progress, delay = 0, color = "bg-primary" }: { progress: number; delay?: number; color?: string }) => (
  <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
    <motion.div
      className={`h-full ${color} rounded-full`}
      initial={{ width: 0 }}
      animate={{ width: `${progress}%` }}
      transition={{ duration: 1.2, delay, ease: "easeOut" }}
    />
  </div>
);

// Mini chart bars
const MiniBarChart = ({ delay = 0 }: { delay?: number }) => {
  const bars = [65, 45, 80, 55, 70, 90, 60];
  
  return (
    <div className="flex items-end gap-0.5 h-8">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-1.5 bg-primary/60 rounded-t-sm"
          initial={{ height: 0 }}
          animate={{ height: `${height}%` }}
          transition={{ duration: 0.5, delay: delay + i * 0.08, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

// Mini line chart
const MiniLineChart = ({ delay = 0 }: { delay?: number }) => {
  const points = [20, 35, 25, 45, 40, 55, 50, 70, 65, 85];
  const width = 80;
  const height = 32;
  const xStep = width / (points.length - 1);
  
  const pathD = points
    .map((y, i) => {
      const x = i * xStep;
      const yPos = height - (y / 100) * height;
      return `${i === 0 ? "M" : "L"} ${x} ${yPos}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} className="overflow-visible">
      <motion.path
        d={pathD}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.7 }}
        transition={{ duration: 1.5, delay, ease: "easeOut" }}
      />
      {/* Animated dot at end */}
      <motion.circle
        cx={width}
        cy={height - (points[points.length - 1] / 100) * height}
        r="2.5"
        fill="hsl(var(--primary))"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: delay + 1.2 }}
      />
    </svg>
  );
};

// Task item animation
const AnimatedTaskItem = ({ text, done, delay }: { text: string; done: boolean; delay: number }) => (
  <motion.div
    className="flex items-center gap-1.5 text-[9px]"
    initial={{ opacity: 0, x: -10 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.4, delay }}
  >
    <motion.div
      className={`w-2.5 h-2.5 rounded-sm border flex items-center justify-center ${
        done ? "bg-primary border-primary" : "border-border"
      }`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, delay: delay + 0.1 }}
    >
      {done && (
        <motion.svg
          width="6"
          height="6"
          viewBox="0 0 10 10"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.3, delay: delay + 0.2 }}
        >
          <motion.path
            d="M2 5 L4 7 L8 3"
            fill="none"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.svg>
      )}
    </motion.div>
    <span className={`${done ? "text-muted-foreground line-through" : "text-foreground/80"}`}>
      {text}
    </span>
  </motion.div>
);

// Circular progress ring
const CircularProgress = ({ progress, size = 40, delay = 0 }: { progress: number; size?: number; delay?: number }) => {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--border))"
        strokeWidth="2"
        className="opacity-30"
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 1.5, delay, ease: "easeOut" }}
      />
    </svg>
  );
};

// Mobile-friendly simplified dashboard preview
const MobileDashboardPreview = () => {
  return (
    <motion.div
      className="relative w-full max-w-xs mx-auto"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {/* Outer glow */}
      <div className="absolute -inset-3 bg-primary/5 blur-xl rounded-2xl" />
      
      {/* Main dashboard container */}
      <div className="relative bg-card/80 backdrop-blur-sm border border-border/40 rounded-lg overflow-hidden shadow-lg">
        {/* Header bar */}
        <motion.div
          className="flex items-center justify-between px-2 py-1.5 border-b border-border/30 bg-card/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-destructive/60" />
            <div className="w-1 h-1 rounded-full bg-chronyx-warning/60" />
            <div className="w-1 h-1 rounded-full bg-chronyx-success/60" />
          </div>
          <span className="text-[7px] text-muted-foreground tracking-wider">CHRONYX</span>
          <div className="w-6" />
        </motion.div>

        {/* Simplified content */}
        <div className="p-2 space-y-2">
          {/* Key metrics - 2 columns for mobile */}
          <div className="grid grid-cols-2 gap-1.5">
            <motion.div
              className="p-1.5 rounded-md bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <CheckSquare className="w-2 h-2 text-primary/70" />
                <span className="text-[7px] text-muted-foreground">Tasks</span>
              </div>
              <div className="text-xs font-medium text-foreground">12/15</div>
              <AnimatedProgress progress={80} delay={0.6} />
            </motion.div>

            <motion.div
              className="p-1.5 rounded-md bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 mb-0.5">
                <BookOpen className="w-2 h-2 text-primary/70" />
                <span className="text-[7px] text-muted-foreground">Study</span>
              </div>
              <div className="text-xs font-medium text-foreground">4h</div>
              <AnimatedProgress progress={65} delay={0.7} color="bg-chronyx-success" />
            </motion.div>
          </div>

          {/* Mini progress section */}
          <motion.div
            className="flex items-center gap-2 p-1.5 rounded-md bg-background/50 border border-border/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <CircularProgress progress={32} size={28} delay={0.8} />
            <div className="flex-1">
              <div className="text-[7px] text-muted-foreground">Life Progress</div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-foreground">32%</span>
                <div className="flex items-center gap-0.5 text-chronyx-success">
                  <TrendingUp className="w-2 h-2" />
                  <span className="text-[7px]">+12%</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Mini chart */}
          <motion.div
            className="p-1.5 rounded-md bg-background/50 border border-border/20"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[7px] font-medium text-foreground">Weekly Activity</span>
              <BarChart3 className="w-2 h-2 text-muted-foreground" />
            </div>
            <MiniBarChart delay={0.9} />
          </motion.div>
        </div>
      </div>

      {/* Floating label */}
      <motion.div
        className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-card/80 border border-border/30 rounded-full"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
      >
        <span className="text-[7px] text-muted-foreground tracking-wide">Live Preview</span>
      </motion.div>
    </motion.div>
  );
};

// Full desktop dashboard preview
const DesktopDashboardPreview = () => {
  return (
    <motion.div
      className="relative w-full max-w-sm"
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
    >
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-primary/5 blur-2xl rounded-3xl" />
      
      {/* Sketch corner decorations */}
      <motion.svg
        className="absolute -top-3 -left-3 w-6 h-6 text-primary/20"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <path d="M4 4 L4 12 M4 4 L12 4" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3,2" />
      </motion.svg>
      <motion.svg
        className="absolute -bottom-3 -right-3 w-6 h-6 text-primary/20"
        viewBox="0 0 24 24"
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.6 }}
      >
        <path d="M20 20 L20 12 M20 20 L12 20" stroke="currentColor" strokeWidth="1" fill="none" strokeDasharray="3,2" />
      </motion.svg>

      {/* Main dashboard container */}
      <div className="relative bg-card/80 backdrop-blur-sm border border-border/40 rounded-xl overflow-hidden shadow-lg">
        {/* Header bar */}
        <motion.div
          className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card/50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-destructive/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-chronyx-warning/60" />
            <div className="w-1.5 h-1.5 rounded-full bg-chronyx-success/60" />
          </div>
          <span className="text-[8px] text-muted-foreground tracking-wider">CHRONYX DASHBOARD</span>
          <div className="w-8" />
        </motion.div>

        {/* Dashboard content */}
        <div className="p-3 space-y-3">
          {/* Top metrics row */}
          <div className="grid grid-cols-3 gap-2">
            {/* Tasks metric */}
            <motion.div
              className="p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center gap-1 mb-1">
                <CheckSquare className="w-2.5 h-2.5 text-primary/70" />
                <span className="text-[8px] text-muted-foreground">Tasks</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                <AnimatedCounter value={12} />
                <span className="text-[8px] text-muted-foreground ml-0.5">/15</span>
              </div>
              <AnimatedProgress progress={80} delay={0.6} />
            </motion.div>

            {/* Study metric */}
            <motion.div
              className="p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="flex items-center gap-1 mb-1">
                <BookOpen className="w-2.5 h-2.5 text-primary/70" />
                <span className="text-[8px] text-muted-foreground">Study</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                <AnimatedCounter value={4} suffix="h" />
              </div>
              <AnimatedProgress progress={65} delay={0.7} color="bg-chronyx-success" />
            </motion.div>

            {/* Savings metric */}
            <motion.div
              className="p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
            >
              <div className="flex items-center gap-1 mb-1">
                <Wallet className="w-2.5 h-2.5 text-primary/70" />
                <span className="text-[8px] text-muted-foreground">Saved</span>
              </div>
              <div className="text-sm font-medium text-foreground">
                <AnimatedCounter value={85} suffix="%" />
              </div>
              <AnimatedProgress progress={85} delay={0.8} color="bg-chronyx-warning" />
            </motion.div>
          </div>

          {/* Middle section - Charts & Tasks */}
          <div className="grid grid-cols-2 gap-2">
            {/* Tasks list */}
            <motion.div
              className="p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-medium text-foreground">Today's Tasks</span>
                <Calendar className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
              <div className="space-y-1.5">
                <AnimatedTaskItem text="Review budget" done={true} delay={0.9} />
                <AnimatedTaskItem text="Study React" done={true} delay={1.0} />
                <AnimatedTaskItem text="Update notes" done={false} delay={1.1} />
              </div>
            </motion.div>

            {/* Mini chart */}
            <motion.div
              className="p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[8px] font-medium text-foreground">Weekly</span>
                <BarChart3 className="w-2.5 h-2.5 text-muted-foreground" />
              </div>
              <MiniBarChart delay={1.0} />
            </motion.div>
          </div>

          {/* Bottom section - Progress & Trends */}
          <div className="grid grid-cols-5 gap-2">
            {/* Lifespan ring */}
            <motion.div
              className="col-span-2 p-2 rounded-lg bg-background/50 border border-border/20 flex items-center gap-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <CircularProgress progress={32} size={36} delay={1.2} />
              <div>
                <div className="text-[8px] text-muted-foreground">Life Progress</div>
                <div className="text-xs font-medium text-foreground">32%</div>
              </div>
            </motion.div>

            {/* Trend line */}
            <motion.div
              className="col-span-3 p-2 rounded-lg bg-background/50 border border-border/20"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.0 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[8px] text-muted-foreground">Productivity</span>
                <div className="flex items-center gap-0.5 text-chronyx-success">
                  <TrendingUp className="w-2 h-2" />
                  <span className="text-[8px]">+12%</span>
                </div>
              </div>
              <MiniLineChart delay={1.3} />
            </motion.div>
          </div>
        </div>

        {/* Floating accent elements */}
        <motion.div
          className="absolute top-1/4 -right-1 w-8 h-8 rounded-full bg-primary/5 blur-lg"
          animate={{ 
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3]
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/4 -left-1 w-6 h-6 rounded-full bg-chronyx-success/10 blur-md"
          animate={{ 
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
      </div>

      {/* Floating label */}
      <motion.div
        className="absolute -bottom-6 left-1/2 -translate-x-1/2 px-3 py-1 bg-card/80 border border-border/30 rounded-full"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
      >
        <span className="text-[9px] text-muted-foreground tracking-wide">Live Preview</span>
      </motion.div>
    </motion.div>
  );
};

// Main component that switches between mobile and desktop versions
const DashboardPreview = () => {
  return (
    <>
      {/* Mobile version - shown on small screens */}
      <div className="block md:hidden">
        <MobileDashboardPreview />
      </div>
      {/* Desktop version - hidden on small screens */}
      <div className="hidden md:block">
        <DesktopDashboardPreview />
      </div>
    </>
  );
};

export default DashboardPreview;
