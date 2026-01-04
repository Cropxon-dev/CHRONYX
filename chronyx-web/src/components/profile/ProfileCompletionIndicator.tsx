import { useMemo } from "react";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Circle, User, Mail, Phone, Calendar, Shield, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProfileData {
  display_name: string | null;
  email: string | null;
  email_verified: boolean | null;
  phone_number: string | null;
  phone_verified: boolean | null;
  birth_date: string | null;
  avatar_url: string | null;
  secondary_email: string | null;
  secondary_phone: string | null;
}

interface ProfileCompletionIndicatorProps {
  profile: ProfileData | null;
  className?: string;
}

interface CompletionItem {
  label: string;
  completed: boolean;
  icon: React.ElementType;
  weight: number;
}

export const ProfileCompletionIndicator = ({ profile, className }: ProfileCompletionIndicatorProps) => {
  const completionItems = useMemo<CompletionItem[]>(() => {
    if (!profile) return [];
    
    return [
      { 
        label: "Display Name", 
        completed: !!profile.display_name?.trim(), 
        icon: User,
        weight: 15
      },
      { 
        label: "Profile Photo", 
        completed: !!profile.avatar_url, 
        icon: Camera,
        weight: 10
      },
      { 
        label: "Email Address", 
        completed: !!profile.email, 
        icon: Mail,
        weight: 20
      },
      { 
        label: "Email Verified", 
        completed: !!profile.email_verified, 
        icon: Shield,
        weight: 15
      },
      { 
        label: "Phone Number", 
        completed: !!profile.phone_number?.trim(), 
        icon: Phone,
        weight: 10
      },
      { 
        label: "Phone Verified", 
        completed: !!profile.phone_verified, 
        icon: Shield,
        weight: 10
      },
      { 
        label: "Birth Date", 
        completed: !!profile.birth_date, 
        icon: Calendar,
        weight: 15
      },
      { 
        label: "Backup Contact", 
        completed: !!(profile.secondary_email?.trim() || profile.secondary_phone?.trim()), 
        icon: Phone,
        weight: 5
      },
    ];
  }, [profile]);

  const { completedWeight, totalWeight, percentage } = useMemo(() => {
    const total = completionItems.reduce((sum, item) => sum + item.weight, 0);
    const completed = completionItems
      .filter(item => item.completed)
      .reduce((sum, item) => sum + item.weight, 0);
    
    return {
      completedWeight: completed,
      totalWeight: total,
      percentage: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  }, [completionItems]);

  const getStatusColor = (percent: number) => {
    if (percent >= 80) return "text-green-500";
    if (percent >= 50) return "text-amber-500";
    return "text-red-500";
  };

  const getProgressColor = (percent: number) => {
    if (percent >= 80) return "bg-green-500";
    if (percent >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  if (!profile) return null;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-foreground">Profile Completion</h3>
          <p className="text-xs text-muted-foreground">
            Complete your profile to unlock all features
          </p>
        </div>
        <div className={cn("text-2xl font-bold", getStatusColor(percentage))}>
          {percentage}%
        </div>
      </div>

      <div className="relative">
        <Progress 
          value={percentage} 
          className="h-2"
          indicatorClassName={getProgressColor(percentage)}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        {completionItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg text-xs transition-colors",
                item.completed 
                  ? "bg-green-500/10 text-green-600 dark:text-green-400" 
                  : "bg-muted/50 text-muted-foreground"
              )}
            >
              {item.completed ? (
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
              ) : (
                <Circle className="w-3.5 h-3.5 flex-shrink-0" />
              )}
              <span className="truncate">{item.label}</span>
            </div>
          );
        })}
      </div>

      {percentage < 100 && (
        <p className="text-xs text-muted-foreground text-center pt-2 border-t border-border">
          {percentage < 50 
            ? "Complete at least 50% to unlock reminders" 
            : percentage < 80 
              ? "Almost there! Complete more to boost your profile"
              : "Just a few more steps to 100%!"
          }
        </p>
      )}
    </div>
  );
};
