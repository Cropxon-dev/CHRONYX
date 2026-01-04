import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

// Muted color palette for VYOM design
const colorOptions = [
  { name: "Slate", value: "#64748b" },
  { name: "Stone", value: "#78716c" },
  { name: "Zinc", value: "#71717a" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Emerald", value: "#10b981" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Orange", value: "#f97316" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Purple", value: "#a855f7" },
];

interface SubjectColorPickerProps {
  subject: string;
  onColorChange?: (color: string) => void;
  compact?: boolean;
}

export const SubjectColorPicker = ({ subject, onColorChange, compact = false }: SubjectColorPickerProps) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: subjectColors = {} } = useQuery({
    queryKey: ["subject-colors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_colors")
        .select("subject, color");
      if (error) throw error;
      return Object.fromEntries(data.map(sc => [sc.subject, sc.color]));
    },
    enabled: !!user,
  });

  const currentColor = subjectColors[subject] || "#6366f1";

  const updateColorMutation = useMutation({
    mutationFn: async (color: string) => {
      const { error } = await supabase
        .from("subject_colors")
        .upsert({
          user_id: user!.id,
          subject,
          color,
        }, { onConflict: "user_id,subject" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-colors"] });
      setOpen(false);
    },
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {compact ? (
          <button
            className="w-4 h-4 rounded-full border border-border/50 transition-transform hover:scale-110"
            style={{ backgroundColor: currentColor }}
          />
        ) : (
          <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: currentColor }}
            />
            <Palette className="w-3 h-3 text-muted-foreground" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-3 bg-card border-border" align="start">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">{subject}</p>
          <div className="grid grid-cols-6 gap-1.5">
            {colorOptions.map((color) => (
              <button
                key={color.value}
                onClick={() => {
                  updateColorMutation.mutate(color.value);
                  onColorChange?.(color.value);
                }}
                className={cn(
                  "w-6 h-6 rounded-full transition-all hover:scale-110 flex items-center justify-center",
                  currentColor === color.value && "ring-2 ring-offset-2 ring-offset-card ring-primary"
                )}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {currentColor === color.value && (
                  <Check className="w-3 h-3 text-white" />
                )}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// Hook to get subject colors
export const useSubjectColors = () => {
  const { user } = useAuth();
  
  const { data: subjectColors = {} } = useQuery({
    queryKey: ["subject-colors", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_colors")
        .select("subject, color");
      if (error) throw error;
      return Object.fromEntries(data.map(sc => [sc.subject, sc.color]));
    },
    enabled: !!user,
  });

  const getColor = (subject: string) => subjectColors[subject] || "#6366f1";

  return { subjectColors, getColor };
};
