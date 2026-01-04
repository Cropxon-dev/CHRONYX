import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, FileJson, FileText } from "lucide-react";
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

interface ExportData {
  profile: any;
  todos: any[];
  studyLogs: any[];
  achievements: any[];
  activityLogs: any[];
  exportedAt: string;
}

export const DataExport = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const [exporting, setExporting] = useState(false);

  const fetchAllData = async (): Promise<ExportData> => {
    const [profileRes, todosRes, studyLogsRes, achievementsRes, activityLogsRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user?.id).maybeSingle(),
      supabase.from("todos").select("*").order("date", { ascending: false }),
      supabase.from("study_logs").select("*").order("date", { ascending: false }),
      supabase.from("achievements").select("*").order("achieved_at", { ascending: false }),
      supabase.from("activity_logs").select("*").order("created_at", { ascending: false }),
    ]);

    return {
      profile: profileRes.data,
      todos: todosRes.data || [],
      studyLogs: studyLogsRes.data || [],
      achievements: achievementsRes.data || [],
      activityLogs: activityLogsRes.data || [],
      exportedAt: new Date().toISOString(),
    };
  };

  const exportAsJSON = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const data = await fetchAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chronyx-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({ title: "Data exported as JSON" });
      logActivity("Exported data as JSON", "Settings");
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const exportAsPDF = async () => {
    if (!user) return;
    setExporting(true);

    try {
      const data = await fetchAllData();
      
      // Generate HTML content for PDF
      const htmlContent = generatePDFContent(data);
      
      // Open in new window for printing
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        
        // Wait for styles to load, then trigger print
        setTimeout(() => {
          printWindow.print();
        }, 500);
      }

      toast({ title: "PDF export ready for printing" });
      logActivity("Exported data as PDF", "Settings");
    } catch (error) {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const generatePDFContent = (data: ExportData): string => {
    const formatDate = (dateStr: string) => {
      try {
        return format(new Date(dateStr), "MMM d, yyyy");
      } catch {
        return dateStr;
      }
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>CHRONYX Data Export</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              padding: 40px;
              max-width: 800px;
              margin: 0 auto;
            }
            h1 { 
              font-size: 28px; 
              font-weight: 300; 
              margin-bottom: 8px;
              letter-spacing: 0.05em;
            }
            h2 { 
              font-size: 14px; 
              font-weight: 500; 
              text-transform: uppercase;
              letter-spacing: 0.1em;
              color: #666;
              margin: 32px 0 16px;
              padding-bottom: 8px;
              border-bottom: 1px solid #eee;
            }
            .meta {
              font-size: 12px;
              color: #888;
              margin-bottom: 32px;
            }
            .section { margin-bottom: 32px; }
            .item {
              padding: 12px 0;
              border-bottom: 1px solid #f0f0f0;
            }
            .item:last-child { border-bottom: none; }
            .item-title { font-weight: 500; }
            .item-meta { font-size: 13px; color: #666; }
            .item-desc { font-size: 14px; color: #444; margin-top: 4px; }
            .stat { 
              display: inline-block; 
              margin-right: 24px;
              margin-bottom: 8px;
            }
            .stat-value { font-size: 24px; font-weight: 300; }
            .stat-label { font-size: 11px; color: #888; text-transform: uppercase; letter-spacing: 0.1em; }
            .profile-info { margin-bottom: 16px; }
            .profile-info span { color: #666; }
            @media print {
              body { padding: 20px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>CHRONYX</h1>
          <p class="meta">Data Export • ${formatDate(data.exportedAt)}</p>
          
          ${data.profile ? `
            <div class="section">
              <h2>Profile</h2>
              <div class="profile-info">
                ${data.profile.display_name ? `<div><strong>Name:</strong> <span>${data.profile.display_name}</span></div>` : ''}
                ${data.profile.email ? `<div><strong>Email:</strong> <span>${data.profile.email}</span></div>` : ''}
                ${data.profile.birth_date ? `<div><strong>Birth Date:</strong> <span>${formatDate(data.profile.birth_date)}</span></div>` : ''}
                ${data.profile.target_age ? `<div><strong>Target Age:</strong> <span>${data.profile.target_age} years</span></div>` : ''}
              </div>
            </div>
          ` : ''}
          
          <div class="section">
            <h2>Summary</h2>
            <div class="stat">
              <div class="stat-value">${data.todos.length}</div>
              <div class="stat-label">Todos</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.studyLogs.length}</div>
              <div class="stat-label">Study Sessions</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.studyLogs.reduce((acc, log) => acc + (log.duration || 0), 0)}m</div>
              <div class="stat-label">Total Study Time</div>
            </div>
            <div class="stat">
              <div class="stat-value">${data.achievements.length}</div>
              <div class="stat-label">Achievements</div>
            </div>
          </div>
          
          ${data.todos.length > 0 ? `
            <div class="section">
              <h2>Todos (${data.todos.length})</h2>
              ${data.todos.slice(0, 50).map(todo => `
                <div class="item">
                  <div class="item-title">${todo.text}</div>
                  <div class="item-meta">${formatDate(todo.date)} • ${todo.status}</div>
                </div>
              `).join('')}
              ${data.todos.length > 50 ? `<p class="item-meta">...and ${data.todos.length - 50} more</p>` : ''}
            </div>
          ` : ''}
          
          ${data.studyLogs.length > 0 ? `
            <div class="section">
              <h2>Study Sessions (${data.studyLogs.length})</h2>
              ${data.studyLogs.slice(0, 50).map(log => `
                <div class="item">
                  <div class="item-title">${log.subject}${log.topic ? ` — ${log.topic}` : ''}</div>
                  <div class="item-meta">${formatDate(log.date)} • ${log.duration} minutes • Focus: ${log.focus_level || 'medium'}</div>
                  ${log.notes ? `<div class="item-desc">${log.notes}</div>` : ''}
                </div>
              `).join('')}
              ${data.studyLogs.length > 50 ? `<p class="item-meta">...and ${data.studyLogs.length - 50} more</p>` : ''}
            </div>
          ` : ''}
          
          ${data.achievements.length > 0 ? `
            <div class="section">
              <h2>Achievements (${data.achievements.length})</h2>
              ${data.achievements.map(ach => `
                <div class="item">
                  <div class="item-title">${ach.title}</div>
                  <div class="item-meta">${formatDate(ach.achieved_at)} • ${ach.category}</div>
                  ${ach.description ? `<div class="item-desc">${ach.description}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="border-border" disabled={exporting}>
          <Download className="w-4 h-4 mr-2" />
          {exporting ? "Exporting..." : "Export Data"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-card border-border">
        <DropdownMenuItem onClick={exportAsJSON} className="cursor-pointer">
          <FileJson className="w-4 h-4 mr-2" />
          Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} className="cursor-pointer">
          <FileText className="w-4 h-4 mr-2" />
          Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
