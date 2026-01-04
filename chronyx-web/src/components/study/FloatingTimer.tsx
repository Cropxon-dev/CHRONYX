import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { Play, Pause, Square, RotateCcw, X, Timer, Minimize2, Maximize2, Coffee, Target, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useToast } from "@/hooks/use-toast";

interface FloatingTimerProps {
  onComplete: (duration: number, subject: string, plannedDuration: number) => void;
  subjects: string[];
  defaultSubject?: string;
  isOpen: boolean;
  onClose: () => void;
}

type TimerState = "idle" | "running" | "paused";
type PomodoroPhase = "work" | "shortBreak" | "longBreak";

interface PomodoroSettings {
  enabled: boolean;
  workMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  sessionsBeforeLongBreak: number;
  autoStartBreaks: boolean;
  autoStartWork: boolean;
}

const defaultPomodoroSettings: PomodoroSettings = {
  enabled: false,
  workMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartBreaks: true,
  autoStartWork: false,
};

// Completion sound using Web Audio API
const playCompletionSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    playNote(523.25, now, 0.3);
    playNote(659.25, now + 0.15, 0.3);
    playNote(783.99, now + 0.3, 0.5);
    
    setTimeout(() => audioContext.close(), 2000);
  } catch (error) {
    console.log("Could not play completion sound:", error);
  }
};

// Break notification sound (different tone)
const playBreakSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = frequency;
      oscillator.type = 'triangle';
      
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      
      oscillator.start(startTime);
      oscillator.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    // Descending chime for break
    playNote(783.99, now, 0.3);
    playNote(659.25, now + 0.15, 0.3);
    playNote(523.25, now + 0.3, 0.4);
    
    setTimeout(() => audioContext.close(), 2000);
  } catch (error) {
    console.log("Could not play break sound:", error);
  }
};

export const FloatingTimer = ({ 
  onComplete, 
  subjects, 
  defaultSubject = "Programming",
  isOpen,
  onClose,
}: FloatingTimerProps) => {
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [plannedMinutes, setPlannedMinutes] = useState<string>("25");
  const [subject, setSubject] = useState(defaultSubject);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showStopWarning, setShowStopWarning] = useState(false);
  
  // Pomodoro state
  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings>(() => {
    const saved = localStorage.getItem("pomodoro-settings");
    return saved ? { ...defaultPomodoroSettings, ...JSON.parse(saved) } : defaultPomodoroSettings;
  });
  const [pomodoroPhase, setPomodoroPhase] = useState<PomodoroPhase>("work");
  const [completedSessions, setCompletedSessions] = useState(0);
  const [showSettingsPopover, setShowSettingsPopover] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const timerRef = useRef<HTMLDivElement>(null);
  const { logActivity } = useActivityLog();
  const { toast } = useToast();

  // Save Pomodoro settings
  useEffect(() => {
    localStorage.setItem("pomodoro-settings", JSON.stringify(pomodoroSettings));
    if (pomodoroSettings.enabled && timerState === "idle") {
      setPlannedMinutes(String(pomodoroSettings.workMinutes));
    }
  }, [pomodoroSettings]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  // Get current phase duration
  const getCurrentPhaseDuration = useCallback(() => {
    if (!pomodoroSettings.enabled) return parseInt(plannedMinutes) || 25;
    switch (pomodoroPhase) {
      case "work": return pomodoroSettings.workMinutes;
      case "shortBreak": return pomodoroSettings.shortBreakMinutes;
      case "longBreak": return pomodoroSettings.longBreakMinutes;
      default: return pomodoroSettings.workMinutes;
    }
  }, [pomodoroSettings, pomodoroPhase, plannedMinutes]);

  const startTimer = useCallback(() => {
    if (timerState === "idle") {
      startTimeRef.current = new Date();
      const phaseLabel = pomodoroSettings.enabled && pomodoroPhase !== "work" 
        ? `${pomodoroPhase === "shortBreak" ? "Short" : "Long"} break` 
        : subject;
      logActivity(`Started ${pomodoroSettings.enabled ? "Pomodoro" : "study"} session: ${phaseLabel}`, "Study");
    }
    setTimerState("running");
    
    intervalRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
  }, [timerState, subject, logActivity, pomodoroSettings.enabled, pomodoroPhase]);

  const pauseTimer = useCallback(() => {
    setTimerState("paused");
    clearTimer();
    logActivity(`Paused study session: ${subject}`, "Study");
  }, [clearTimer, subject, logActivity]);

  const resetTimer = useCallback(() => {
    setTimerState("idle");
    setElapsedSeconds(0);
    startTimeRef.current = null;
    clearTimer();
  }, [clearTimer]);

  // Handle Pomodoro phase completion
  const handlePhaseComplete = useCallback(() => {
    const phaseDuration = getCurrentPhaseDuration();
    
    if (pomodoroPhase === "work") {
      // Complete work session
      const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
      playCompletionSound();
      
      onComplete(durationMinutes, subject, phaseDuration);
      logActivity(`Completed Pomodoro work session: ${durationMinutes} minutes of ${subject}`, "Study");
      
      const newCompletedSessions = completedSessions + 1;
      setCompletedSessions(newCompletedSessions);
      
      // Determine next break type
      const nextPhase = newCompletedSessions % pomodoroSettings.sessionsBeforeLongBreak === 0 
        ? "longBreak" 
        : "shortBreak";
      
      toast({
        title: "Work session complete! 🎉",
        description: `Time for a ${nextPhase === "longBreak" ? "long" : "short"} break.`,
      });
      
      setPomodoroPhase(nextPhase);
      setElapsedSeconds(0);
      clearTimer();
      
      if (pomodoroSettings.autoStartBreaks) {
        startTimeRef.current = new Date();
        setTimerState("running");
        intervalRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        setTimerState("idle");
      }
    } else {
      // Complete break
      playBreakSound();
      logActivity(`Completed ${pomodoroPhase === "shortBreak" ? "short" : "long"} break`, "Study");
      
      toast({
        title: "Break over!",
        description: "Ready to focus again?",
      });
      
      setPomodoroPhase("work");
      setElapsedSeconds(0);
      clearTimer();
      
      if (pomodoroSettings.autoStartWork) {
        startTimeRef.current = new Date();
        setTimerState("running");
        intervalRef.current = setInterval(() => {
          setElapsedSeconds((prev) => prev + 1);
        }, 1000);
      } else {
        setTimerState("idle");
      }
    }
  }, [
    pomodoroPhase, elapsedSeconds, subject, completedSessions, 
    pomodoroSettings, onComplete, logActivity, toast, clearTimer, getCurrentPhaseDuration
  ]);

  // Check for phase completion in Pomodoro mode
  useEffect(() => {
    if (pomodoroSettings.enabled && timerState === "running") {
      const phaseDuration = getCurrentPhaseDuration();
      if (elapsedSeconds >= phaseDuration * 60) {
        handlePhaseComplete();
      }
    }
  }, [elapsedSeconds, pomodoroSettings.enabled, timerState, getCurrentPhaseDuration, handlePhaseComplete]);

  const handleFinishClick = () => {
    if (elapsedSeconds >= 60) {
      setShowStopWarning(true);
    }
  };

  const completeSession = useCallback(() => {
    const durationMinutes = Math.max(1, Math.round(elapsedSeconds / 60));
    const planned = parseInt(plannedMinutes) || 0;
    
    playCompletionSound();
    
    logActivity(`Completed study session: ${durationMinutes} minutes of ${subject}`, "Study");
    toast({
      title: "Session Complete! 🎉",
      description: `You studied ${subject} for ${durationMinutes} minutes.`,
    });
    
    onComplete(durationMinutes, subject, planned);
    resetTimer();
    setShowStopWarning(false);
    
    if (pomodoroSettings.enabled) {
      setCompletedSessions((prev) => prev + 1);
    }
  }, [elapsedSeconds, plannedMinutes, subject, onComplete, resetTimer, logActivity, toast, pomodoroSettings.enabled]);

  const handleClose = () => {
    if (timerState !== "idle") {
      setShowStopWarning(true);
    } else {
      onClose();
    }
  };

  const handleForceClose = () => {
    clearTimer();
    resetTimer();
    setShowStopWarning(false);
    onClose();
  };

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.code === "Space" && timerState !== "idle") {
        e.preventDefault();
        if (timerState === "running") {
          pauseTimer();
          toast({ title: "Timer paused", description: "Press Space to resume" });
        } else if (timerState === "paused") {
          startTimer();
          toast({ title: "Timer resumed" });
        }
      }
      
      if (e.code === "Escape") {
        e.preventDefault();
        setIsMinimized(true);
        toast({ title: "Timer minimized", description: "Click to expand" });
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, timerState, pauseTimer, startTimer, toast]);

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
  const planned = pomodoroSettings.enabled ? getCurrentPhaseDuration() : (parseInt(plannedMinutes) || 0);
  const progressPercentage = planned > 0 ? Math.min((elapsedMinutes / planned) * 100, 100) : 0;
  const isOvertime = elapsedMinutes > planned && planned > 0;
  const isBreak = pomodoroSettings.enabled && (pomodoroPhase === "shortBreak" || pomodoroPhase === "longBreak");

  if (!isOpen) return null;

  return (
    <>
      {/* Floating Timer Panel */}
      <div 
        ref={timerRef}
        className={cn(
          "fixed z-50 transition-all duration-300 ease-out shadow-2xl",
          isMinimized 
            ? "top-4 right-4 w-auto" 
            : "top-4 right-4 w-80"
        )}
      >
        <div className={cn(
          "bg-card border border-border rounded-xl overflow-hidden backdrop-blur-xl",
          timerState === "running" && !isBreak && "ring-2 ring-primary/50",
          timerState === "running" && isBreak && "ring-2 ring-green-500/50"
        )}>
          {/* Header */}
          <div className={cn(
            "flex items-center justify-between px-3 py-2 border-b border-border",
            isBreak ? "bg-green-500/10" : "bg-muted/50"
          )}>
            <div className="flex items-center gap-2">
              {isBreak ? (
                <Coffee className="w-4 h-4 text-green-500" />
              ) : (
                <Timer className={cn(
                  "w-4 h-4",
                  timerState === "running" && "text-primary animate-pulse"
                )} />
              )}
              <span className="text-sm font-medium">
                {pomodoroSettings.enabled 
                  ? (isBreak ? (pomodoroPhase === "longBreak" ? "Long Break" : "Short Break") : "Pomodoro")
                  : "Study Timer"
                }
              </span>
              {timerState === "running" && (
                <span className={cn(
                  "w-2 h-2 rounded-full animate-pulse",
                  isBreak ? "bg-green-500" : "bg-green-500"
                )} />
              )}
              {pomodoroSettings.enabled && (
                <span className="text-xs text-muted-foreground">
                  #{completedSessions + (pomodoroPhase === "work" ? 1 : 0)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {/* Settings */}
              <Popover open={showSettingsPopover} onOpenChange={setShowSettingsPopover}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    disabled={timerState !== "idle"}
                  >
                    <SettingsIcon className="w-3 h-3" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm font-medium">Pomodoro Mode</Label>
                        <p className="text-xs text-muted-foreground">
                          Work/break cycles
                        </p>
                      </div>
                      <Switch
                        checked={pomodoroSettings.enabled}
                        onCheckedChange={(enabled) => {
                          setPomodoroSettings((prev) => ({ ...prev, enabled }));
                          if (enabled) {
                            setPlannedMinutes(String(pomodoroSettings.workMinutes));
                          }
                        }}
                      />
                    </div>
                    
                    {pomodoroSettings.enabled && (
                      <>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Work (min)</Label>
                            <Input
                              type="number"
                              min="1"
                              max="120"
                              value={pomodoroSettings.workMinutes}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 25;
                                setPomodoroSettings((prev) => ({ ...prev, workMinutes: val }));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Short Break</Label>
                            <Input
                              type="number"
                              min="1"
                              max="30"
                              value={pomodoroSettings.shortBreakMinutes}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 5;
                                setPomodoroSettings((prev) => ({ ...prev, shortBreakMinutes: val }));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Long Break</Label>
                            <Input
                              type="number"
                              min="1"
                              max="60"
                              value={pomodoroSettings.longBreakMinutes}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 15;
                                setPomodoroSettings((prev) => ({ ...prev, longBreakMinutes: val }));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Sessions/Long</Label>
                            <Input
                              type="number"
                              min="1"
                              max="10"
                              value={pomodoroSettings.sessionsBeforeLongBreak}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 4;
                                setPomodoroSettings((prev) => ({ ...prev, sessionsBeforeLongBreak: val }));
                              }}
                              className="h-8 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Auto-start breaks</Label>
                            <Switch
                              checked={pomodoroSettings.autoStartBreaks}
                              onCheckedChange={(val) => 
                                setPomodoroSettings((prev) => ({ ...prev, autoStartBreaks: val }))
                              }
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Auto-start work</Label>
                            <Switch
                              checked={pomodoroSettings.autoStartWork}
                              onCheckedChange={(val) => 
                                setPomodoroSettings((prev) => ({ ...prev, autoStartWork: val }))
                              }
                            />
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
              
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsMinimized(!isMinimized)}
                title={isMinimized ? "Expand" : "Minimize (Escape)"}
              >
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClose}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Content */}
          {isMinimized ? (
            <div 
              className="px-3 py-2 flex items-center gap-2 cursor-pointer"
              onClick={() => setIsMinimized(false)}
            >
              <span className={cn(
                "text-lg font-mono tabular-nums",
                isOvertime && "text-amber-500",
                timerState === "running" && !isBreak && "text-primary",
                timerState === "running" && isBreak && "text-green-500"
              )}>
                {formatTime(elapsedSeconds)}
              </span>
              {timerState === "running" ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={(e) => { e.stopPropagation(); pauseTimer(); }}
                  title="Pause (Space)"
                >
                  <Pause className="w-3 h-3" />
                </Button>
              ) : timerState === "paused" ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6" 
                  onClick={(e) => { e.stopPropagation(); startTimer(); }}
                  title="Resume (Space)"
                >
                  <Play className="w-3 h-3" />
                </Button>
              ) : null}
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Timer Display */}
              <div className="text-center py-2">
                <p className={cn(
                  "text-4xl font-light tracking-tight tabular-nums transition-colors",
                  isOvertime ? "text-amber-500" : isBreak ? "text-green-500" : "text-foreground"
                )}>
                  {formatTime(elapsedSeconds)}
                </p>
                {timerState !== "idle" && planned > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
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
                      isOvertime ? "bg-amber-500/60" : isBreak ? "bg-green-500/50" : "bg-primary/50"
                    )}
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              )}

              {/* Pomodoro phase indicator */}
              {pomodoroSettings.enabled && timerState !== "idle" && (
                <div className="flex items-center justify-center gap-1.5">
                  {Array.from({ length: pomodoroSettings.sessionsBeforeLongBreak }).map((_, i) => (
                    <div 
                      key={i}
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i < completedSessions % pomodoroSettings.sessionsBeforeLongBreak
                          ? "bg-primary"
                          : i === completedSessions % pomodoroSettings.sessionsBeforeLongBreak && pomodoroPhase === "work"
                          ? "bg-primary/50 animate-pulse"
                          : "bg-muted"
                      )}
                    />
                  ))}
                </div>
              )}

              {/* Keyboard shortcuts hint */}
              {timerState !== "idle" && (
                <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Space</kbd>
                    {timerState === "running" ? "Pause" : "Resume"}
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px]">Esc</kbd>
                    Minimize
                  </span>
                </div>
              )}

              {/* Controls */}
              {timerState === "idle" ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Subject</label>
                      <Select value={subject} onValueChange={setSubject}>
                        <SelectTrigger className="h-9 text-sm bg-background border-border">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {subjects.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">
                        {pomodoroSettings.enabled ? "Work (min)" : "Minutes"}
                      </label>
                      <Input
                        type="number"
                        value={pomodoroSettings.enabled ? pomodoroSettings.workMinutes : plannedMinutes}
                        onChange={(e) => {
                          if (pomodoroSettings.enabled) {
                            const val = parseInt(e.target.value) || 25;
                            setPomodoroSettings((prev) => ({ ...prev, workMinutes: val }));
                          } else {
                            setPlannedMinutes(e.target.value);
                          }
                        }}
                        placeholder="25"
                        min="1"
                        className="h-9 text-sm bg-background border-border"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={startTimer} 
                    className="w-full"
                    disabled={!pomodoroSettings.enabled && (!plannedMinutes || parseInt(plannedMinutes) <= 0)}
                  >
                    {pomodoroSettings.enabled ? (
                      <>
                        <Target className="w-4 h-4 mr-2" />
                        Start Pomodoro
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Start Session
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    {timerState === "running" ? (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={pauseTimer}
                        title="Pause (Space)"
                      >
                        <Pause className="w-4 h-4 mr-2" />
                        Pause
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={startTimer}
                        title="Resume (Space)"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={resetTimer}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </Button>
                  </div>
                  {!isBreak && (
                    <Button 
                      className="w-full"
                      onClick={handleFinishClick}
                      disabled={elapsedSeconds < 60}
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Finish Session
                    </Button>
                  )}
                  {isBreak && (
                    <Button 
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        clearTimer();
                        setPomodoroPhase("work");
                        setElapsedSeconds(0);
                        setTimerState("idle");
                        toast({ title: "Break skipped", description: "Ready to work!" });
                      }}
                    >
                      Skip Break
                    </Button>
                  )}
                </div>
              )}

              {/* Session Info */}
              {timerState !== "idle" && (
                <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border">
                  <span>{isBreak ? "Taking a break" : subject}</span>
                  <span>
                    {pomodoroSettings.enabled 
                      ? `${completedSessions} sessions today`
                      : `Planned: ${planned}m`
                    }
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Stop Warning Dialog */}
      <AlertDialog open={showStopWarning} onOpenChange={setShowStopWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>End study session?</AlertDialogTitle>
            <AlertDialogDescription>
              You've studied for {Math.round(elapsedSeconds / 60)} minutes. Do you want to save this session or discard it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowStopWarning(false)}>
              Continue Studying
            </AlertDialogCancel>
            <Button 
              variant="outline" 
              onClick={handleForceClose}
              className="text-destructive"
            >
              Discard
            </Button>
            <AlertDialogAction onClick={completeSession}>
              Save & Finish
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FloatingTimer;
