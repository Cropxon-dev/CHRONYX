import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface StudyExportData {
  studyLogs: any[];
  studyGoals: any[];
  syllabusTopics: any[];
  subjectColors: any[];
  exportedAt: string;
}

export const StudyDataExport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [exporting, setExporting] = useState(false);

  const fetchStudyData = async (): Promise<StudyExportData> => {
    const [logsRes, goalsRes, topicsRes, colorsRes] = await Promise.all([
      supabase.from("study_logs").select("*").order("date", { ascending: false }),
      supabase.from("study_goals").select("*").order("created_at", { ascending: false }),
      supabase.from("syllabus_topics").select("*").order("subject, chapter_name, sort_order"),
      supabase.from("subject_colors").select("*"),
    ]);

    return {
      studyLogs: logsRes.data || [],
      studyGoals: goalsRes.data || [],
      syllabusTopics: topicsRes.data || [],
      subjectColors: colorsRes.data || [],
      exportedAt: new Date().toISOString(),
    };
  };

  const exportAsJSON = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const data = await fetchStudyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vyom-study-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Study data exported as JSON" });
      logActivity("Exported study data as JSON", "Study");
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportAsMarkdown = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const data = await fetchStudyData();
      const markdown = generateMarkdownExport(data);
      
      const blob = new Blob([markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vyom-study-export-${format(new Date(), "yyyy-MM-dd")}.md`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Study data exported as Markdown" });
      logActivity("Exported study data as Markdown", "Study");
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const generateMarkdownExport = (data: StudyExportData): string => {
    const formatDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), "MMM d, yyyy");
      } catch {
        return dateStr;
      }
    };

    let md = `# VYOM Study Data Export\n\n`;
    md += `**Exported:** ${formatDate(data.exportedAt)}\n\n`;
    md += `---\n\n`;

    // Summary
    const totalMinutes = data.studyLogs.reduce((sum, log) => sum + (log.duration || 0), 0);
    const totalHours = Math.floor(totalMinutes / 60);
    const remainingMins = totalMinutes % 60;
    const completedTopics = data.syllabusTopics.filter(t => t.is_completed).length;

    md += `## Summary\n\n`;
    md += `- **Total Study Sessions:** ${data.studyLogs.length}\n`;
    md += `- **Total Study Time:** ${totalHours}h ${remainingMins}m\n`;
    md += `- **Active Goals:** ${data.studyGoals.filter(g => g.is_active).length}\n`;
    md += `- **Syllabus Topics:** ${data.syllabusTopics.length} (${completedTopics} completed)\n`;
    md += `\n---\n\n`;

    // Study Goals
    if (data.studyGoals.length > 0) {
      md += `## Study Goals\n\n`;
      data.studyGoals.forEach(goal => {
        md += `### ${goal.subject}\n`;
        md += `- **Target:** ${goal.target_hours_weekly} hours/week\n`;
        md += `- **Status:** ${goal.is_active ? 'Active' : 'Inactive'}\n`;
        md += `- **Started:** ${formatDate(goal.start_date)}\n\n`;
      });
      md += `---\n\n`;
    }

    // Syllabus Topics by Subject
    if (data.syllabusTopics.length > 0) {
      md += `## Syllabus\n\n`;
      const bySubject = data.syllabusTopics.reduce((acc, topic) => {
        if (!acc[topic.subject]) acc[topic.subject] = {};
        if (!acc[topic.subject][topic.chapter_name]) acc[topic.subject][topic.chapter_name] = [];
        acc[topic.subject][topic.chapter_name].push(topic);
        return acc;
      }, {} as Record<string, Record<string, any[]>>);

      Object.entries(bySubject).forEach(([subject, chapters]) => {
        md += `### ${subject}\n\n`;
        Object.entries(chapters).forEach(([chapter, topics]) => {
          md += `#### ${chapter}\n\n`;
          topics.forEach(topic => {
            const status = topic.is_completed ? '✅' : '⬜';
            md += `- ${status} ${topic.topic_name}`;
            if (topic.notes) md += ` — _${topic.notes}_`;
            md += `\n`;
          });
          md += `\n`;
        });
      });
      md += `---\n\n`;
    }

    // Recent Study Sessions
    if (data.studyLogs.length > 0) {
      md += `## Study Sessions (Last 100)\n\n`;
      md += `| Date | Subject | Topic | Duration | Focus | Notes |\n`;
      md += `|------|---------|-------|----------|-------|-------|\n`;
      
      data.studyLogs.slice(0, 100).forEach(log => {
        const notes = log.notes ? log.notes.replace(/\n/g, ' ').slice(0, 50) + (log.notes.length > 50 ? '...' : '') : '-';
        md += `| ${formatDate(log.date)} | ${log.subject} | ${log.topic || '-'} | ${log.duration}m | ${log.focus_level || 'medium'} | ${notes} |\n`;
      });
      md += `\n`;
    }

    return md;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="border-border" disabled={exporting}>
          {exporting ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-2" />
          )}
          Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsMarkdown} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Export as Markdown
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
