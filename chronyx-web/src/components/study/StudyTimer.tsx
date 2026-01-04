import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface StudyTimerProps {
  onComplete: (duration: number, subject: string, plannedDuration: number) => void;
  subjects: string[];
  defaultSubject?: string;
}

type TimerState = "idle" | "running" | "paused";

export const StudyTimer = ({ onComplete, subjects, defaultSubject = "Programming" }: StudyTimerProps) => {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState<string>("30");
  const [subject, setSubject] = useState(defaultSubject);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const startTimer = useCallback(() => {
    if (timerState === "idle") {
      startTimeRef.current = new Date();
    }
    setTimerState("running");
    
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [timerState]);

  const pauseTimer = useCallback(() => {
    setTimerState("paused");
    clearTimer();
  }, [clearTimer]);

  const resetTimer = useCallback(() => {
    setTimerState("idle");
    setElapsedSeconds(0);
    startTimeRef.current = null;
    clearTimer();
  }, [clearTimer]);

  const completeSession = useCallback(() => {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const planned = parseInt(plannedMinutes) || 0;
    
    onComplete(durationMinutes, subject, planned);
    resetTimer();
  }, [elapsedSeconds, plannedMinutes, subject, onComplete, resetTimer]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const elapsedMinutes = Math.floor(elapsedSeconds / 60);
  const planned = parseInt(plannedMinutes) || 0;
  const progressPercentage = planned > 0 ? Math.min((elapsedMinutes / planned) * 100, 100) : 0;
  const isOvertime = elapsedMinutes > planned && planned > 0;

  return (
    <div className="bg-card border border-border rounded-lg p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm text-muted-foreground uppercase tracking-wider">Study Timer</h3>
        {timerState !== "idle" && (
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full",
            timerState === "running" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
          )}>
            {timerState === "running" ? "In Progress" : "Paused"}
          </span>
        )}
      </div>

      {/* Timer Display */}
      <div className="text-center py-4">
        <p className={cn(
          "text-5xl font-light tracking-tight tabular-nums transition-colors",
          isOvertime ? "text-amber-500" : "text-foreground"
        )}>
          {formatTime(elapsedSeconds)}
        </p>
        {timerState !== "idle" && planned > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            {isOvertime 
              ? `+${elapsedMinutes - planned}m overtime`
              : `${planned - elapsedMinutes}m remaining`
            }
          </p>
        )}
      </div>

      {/* Progress Bar */}
      {timerState !== "idle" && planned > 0 && (
        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full rounded-full transition-all duration-300",
              isOvertime ? "bg-amber-500/60" : "bg-primary/50"
            )}
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      )}

      {/* Controls */}
      {timerState === "idle" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Subject</label>
              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {subjects.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs text-muted-foreground">Planned (min)</label>
              <Input
                type="number"
                value={plannedMinutes}
                onChange={(e) => setPlannedMinutes(e.target.value)}
                placeholder="30"
                min="1"
                className="bg-background border-border"
              />
            </div>
          </div>
          <Button 
            onClick={startTimer} 
            className="w-full"
            disabled={!plannedMinutes || parseInt(plannedMinutes) <= 0}
          >
            <Play className="w-4 h-4 mr-2" />
            Start Session
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          {timerState === "running" ? (
            <Button 
              variant="outline" 
              className="flex-1 border-border"
              onClick={pauseTimer}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
          ) : (
            <Button 
              variant="outline" 
              className="flex-1 border-border"
              onClick={startTimer}
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
          )}
          <Button 
            variant="outline" 
            size="icon"
            className="border-border"
            onClick={resetTimer}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button 
            className="flex-1"
            onClick={completeSession}
            disabled={elapsedSeconds < 60}
          >
            <Square className="w-4 h-4 mr-2" />
            Finish
          </Button>
        </div>
      )}

      {/* Session Info */}
      {timerState !== "idle" && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2 border-t border-border">
          <span>{subject}</span>
          <span>Planned: {planned}m</span>
        </div>
      )}
    </div>
  );
};
