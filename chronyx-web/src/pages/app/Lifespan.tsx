import { useState, useEffect, useCallback } from "react";
import LifespanBar from "@/components/dashboard/LifespanBar";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { Settings, Clock, Calendar, Globe } from "lucide-react";

interface LifespanCalculation {
  yearsLived: number;
  monthsLived: number;
  weeksLived: number;
  daysLived: number;
  hoursLived: number;
  minutesLived: number;
  secondsLived: number;
  yearsRemaining: number;
  monthsRemaining: number;
  daysRemaining: number;
  hoursRemaining: number;
  minutesRemaining: number;
  secondsRemaining: number;
  percentComplete: number;
  currentDate: string;
  currentTime: string;
  currentYear: number;
  timezone: string;
}

const calculateLifespan = (birthDate: Date, targetAge: number): LifespanCalculation => {
  const now = new Date();
  const targetDate = new Date(birthDate);
  targetDate.setFullYear(birthDate.getFullYear() + targetAge);

  // Precise time calculations using UTC for consistency
  const msLived = now.getTime() - birthDate.getTime();
  const msRemaining = Math.max(0, targetDate.getTime() - now.getTime());
  const totalMs = targetDate.getTime() - birthDate.getTime();

  const secondsLived = Math.floor(msLived / 1000);
  const minutesLived = Math.floor(msLived / (1000 * 60));
  const hoursLived = Math.floor(msLived / (1000 * 60 * 60));
  const daysLived = Math.floor(msLived / (1000 * 60 * 60 * 24));
  const weeksLived = Math.floor(daysLived / 7);
  
  // Calculate years and months more precisely
  let years = now.getFullYear() - birthDate.getFullYear();
  let months = now.getMonth() - birthDate.getMonth();
  if (now.getDate() < birthDate.getDate()) {
    months--;
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  const totalMonthsLived = years * 12 + months;

  // Remaining calculations
  const secondsRemaining = Math.floor(msRemaining / 1000);
  const minutesRemaining = Math.floor(msRemaining / (1000 * 60));
  const hoursRemaining = Math.floor(msRemaining / (1000 * 60 * 60));
  const daysRemaining = Math.floor(msRemaining / (1000 * 60 * 60 * 24));
  
  let yearsRemaining = targetDate.getFullYear() - now.getFullYear();
  let monthsRemainingCalc = targetDate.getMonth() - now.getMonth();
  if (now.getDate() > targetDate.getDate()) {
    monthsRemainingCalc--;
  }
  if (monthsRemainingCalc < 0) {
    yearsRemaining--;
    monthsRemainingCalc += 12;
  }
  yearsRemaining = Math.max(0, yearsRemaining);
  monthsRemainingCalc = Math.max(0, monthsRemainingCalc);

  const percentComplete = (msLived / totalMs) * 100;

  // Get current date/time in user's timezone
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const currentDate = now.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: timezone
  });
  const currentTime = now.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true,
    timeZone: timezone
  });
  const currentYear = now.getFullYear();

  return {
    yearsLived: years,
    monthsLived: totalMonthsLived,
    weeksLived,
    daysLived,
    hoursLived,
    minutesLived,
    secondsLived,
    yearsRemaining,
    monthsRemaining: monthsRemainingCalc,
    daysRemaining,
    hoursRemaining,
    minutesRemaining,
    secondsRemaining,
    percentComplete: Math.min(100, percentComplete),
    currentDate,
    currentTime,
    currentYear,
    timezone,
  };
};

const Lifespan = () => {
  const [reflection, setReflection] = useState("");
  const { user } = useAuth();
  const [birthDate, setBirthDate] = useState<Date | null>(null);
  const [targetAge, setTargetAge] = useState(60);
  const [loading, setLoading] = useState(true);
  const [lifespan, setLifespan] = useState<LifespanCalculation | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("birth_date, target_age")
      .eq("id", user?.id)
      .maybeSingle();

    if (data) {
      setBirthDate(data.birth_date ? new Date(data.birth_date) : null);
      setTargetAge(data.target_age || 60);
    }
    setLoading(false);
  };

  const updateLifespan = useCallback(() => {
    const effectiveBirthDate = birthDate || new Date(1991, 0, 1);
    setLifespan(calculateLifespan(effectiveBirthDate, targetAge));
  }, [birthDate, targetAge]);

  // Live ticking - update every second
  useEffect(() => {
    updateLifespan();
    const interval = setInterval(updateLifespan, 1000);
    return () => clearInterval(interval);
  }, [updateLifespan]);

  if (loading || !lifespan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const milestones = [
    { age: 18, label: "Adulthood" },
    { age: 25, label: "Quarter Century" },
    { age: 30, label: "Thirty" },
    { age: 35, label: "Mid-Thirties" },
    { age: 40, label: "Forty" },
    { age: 50, label: "Half Century" },
    { age: 60, label: "Sixty" },
    { age: 70, label: "Seventy" },
    { age: 80, label: "Eighty" },
  ].filter(m => m.age <= targetAge);

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Lifespan</h1>
        <p className="text-sm text-muted-foreground mt-1">Perspective on time</p>
      </header>

      {/* Configure Prompt */}
      {!birthDate && (
        <div className="bg-vyom-accent-soft border border-vyom-accent/20 rounded-lg p-4">
          <p className="text-sm text-foreground mb-2">
            Configure your birth date in settings for accurate lifespan calculations.
          </p>
          <Link to="/app/settings">
            <Button variant="vyom" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Go to Settings
            </Button>
          </Link>
        </div>
      )}

      {/* Current Date/Time Display */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-vyom-accent" />
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Current Time
            </h3>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Globe className="w-3 h-3" />
            <span>{lifespan.timezone}</span>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center md:text-left">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Date</p>
            <p className="text-lg font-medium text-foreground">{lifespan.currentDate}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Time</p>
            <p className="text-3xl font-mono font-bold text-vyom-accent tabular-nums">{lifespan.currentTime}</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Year</p>
            <p className="text-lg font-medium text-foreground">{lifespan.currentYear}</p>
          </div>
        </div>
      </div>

      {/* Main Visualization */}
      <LifespanBar daysLived={lifespan.daysLived} daysRemaining={lifespan.daysRemaining} />

      {/* Live Counter - Matching Reference Design */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center gap-2 mb-6">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Live Counter
          </h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-muted/30 rounded-xl p-6 text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tabular-nums tracking-tight">
              {lifespan.secondsLived.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-3">Seconds Lived</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tabular-nums tracking-tight">
              {lifespan.minutesLived.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-3">Minutes Lived</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tabular-nums tracking-tight">
              {lifespan.hoursLived.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-3">Hours Lived</p>
          </div>
          <div className="bg-muted/30 rounded-xl p-6 text-center">
            <p className="text-3xl sm:text-4xl lg:text-5xl font-light text-foreground tabular-nums tracking-tight">
              {lifespan.daysLived.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mt-3">Days Lived</p>
          </div>
        </div>

        {/* Remaining Time */}
        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-4">Time Remaining (Target: {targetAge} years)</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/20 rounded-xl">
              <p className="text-2xl sm:text-3xl font-light text-foreground">{lifespan.yearsRemaining}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">Years</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-xl">
              <p className="text-2xl sm:text-3xl font-light text-foreground">{lifespan.daysRemaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">Days</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-xl">
              <p className="text-2xl sm:text-3xl font-light text-foreground">{lifespan.hoursRemaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">Hours</p>
            </div>
            <div className="text-center p-4 bg-muted/20 rounded-xl">
              <p className="text-2xl sm:text-3xl font-light text-foreground">{lifespan.secondsRemaining.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground uppercase tracking-widest mt-2">Seconds</p>
            </div>
          </div>
        </div>
      </div>

      {/* Time Lived Detail */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
          Time Lived Summary
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{lifespan.yearsLived}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Years</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{lifespan.monthsLived}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Months</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{lifespan.weeksLived.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Weeks</p>
          </div>
          <div>
            <p className="text-2xl sm:text-3xl font-semibold text-foreground">{lifespan.daysLived.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Days</p>
          </div>
        </div>
        
        {/* Progress Bar */}
        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-muted-foreground">Life Progress</span>
            <span className="font-semibold text-vyom-accent">{lifespan.percentComplete.toFixed(2)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-vyom-accent rounded-full transition-all duration-1000"
              style={{ width: `${lifespan.percentComplete}%` }}
            />
          </div>
        </div>
      </div>

      {/* Milestones */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-6">
          Life Milestones
        </h3>
        <div className="space-y-4">
          {milestones.map(({ age, label }) => {
            const status = lifespan.yearsLived >= age ? "passed" : "upcoming";
            const yearsAway = age - lifespan.yearsLived;
            return (
              <div key={age} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status === "passed" ? "bg-vyom-success" : "bg-muted"
                  }`} />
                  <div>
                    <span className="text-sm font-medium text-foreground">Age {age}</span>
                    <span className="text-xs text-muted-foreground ml-2">— {label}</span>
                  </div>
                </div>
                <span className={`text-xs font-medium ${
                  status === "passed" ? "text-vyom-success" : "text-muted-foreground"
                }`}>
                  {status === "passed" ? "✓ Reached" : `${yearsAway} years away`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reflection */}
      <div className="bg-card border border-border rounded-lg p-6">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
          Reflection
        </h3>
        <Textarea
          value={reflection}
          onChange={(e) => setReflection(e.target.value)}
          placeholder="What matters most to you right now?"
          className="min-h-[120px] bg-background resize-none"
        />
        <Button variant="vyom" size="sm" className="mt-4">
          Save Reflection
        </Button>
      </div>
    </div>
  );
};

export default Lifespan;
