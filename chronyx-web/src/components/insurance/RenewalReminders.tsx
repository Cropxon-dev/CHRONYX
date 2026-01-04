import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Bell, Loader2 } from "lucide-react";

interface RenewalRemindersProps {
  insuranceId: string;
  currentReminderDays?: number[];
  onUpdate?: () => void;
}

const REMINDER_OPTIONS = [
  { value: 30, label: "30 days before" },
  { value: 14, label: "14 days before" },
  { value: 7, label: "7 days before" },
  { value: 3, label: "3 days before" },
  { value: 1, label: "1 day before" },
];

export const RenewalReminders = ({ insuranceId, currentReminderDays, onUpdate }: RenewalRemindersProps) => {
  const { toast } = useToast();
  const [selectedDays, setSelectedDays] = useState<number[]>(currentReminderDays || [30, 7, 1]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentReminderDays) {
      setSelectedDays(currentReminderDays);
    }
  }, [currentReminderDays]);

  const toggleDay = (day: number) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => b - a)
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("insurances")
        .update({ reminder_days: selectedDays })
        .eq("id", insuranceId);

      if (error) throw error;
      toast({ title: "Reminder settings saved" });
      onUpdate?.();
    } catch (error) {
      console.error("Error saving reminders:", error);
      toast({ title: "Failed to save settings", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border border-border">
      <div className="flex items-center gap-2">
        <Bell className="w-4 h-4 text-muted-foreground" />
        <Label className="text-sm font-medium">Email Renewal Reminders</Label>
      </div>

      <div className="space-y-2">
        {REMINDER_OPTIONS.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <Checkbox
              id={`reminder-${option.value}`}
              checked={selectedDays.includes(option.value)}
              onCheckedChange={() => toggleDay(option.value)}
            />
            <label
              htmlFor={`reminder-${option.value}`}
              className="text-sm cursor-pointer"
            >
              {option.label}
            </label>
          </div>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving}
        size="sm"
        className="w-full"
      >
        {saving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Reminder Settings"
        )}
      </Button>

      <p className="text-xs text-muted-foreground">
        You'll receive email reminders at the selected intervals before your policy renewal date.
      </p>
    </div>
  );
};
