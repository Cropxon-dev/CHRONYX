import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { 
  Download, 
  Upload, 
  FileArchive, 
  Database,
  Image,
  Wallet,
  Shield,
  BookOpen,
  CheckSquare,
  Trophy,
  Activity,
  AlertCircle,
  Check,
  Loader2
} from "lucide-react";
import { format } from "date-fns";

type BackupModule = "memories" | "finance" | "study" | "documents" | "all";

interface BackupStats {
  memories: number;
  expenses: number;
  income: number;
  loans: number;
  insurances: number;
  todos: number;
  studyLogs: number;
  achievements: number;
}

const Backup = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [selectedModules, setSelectedModules] = useState<Set<BackupModule>>(new Set(["all"]));
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isRestoring, setIsRestoring] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["backup-stats", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      const [
        { count: memoriesCount },
        { count: expensesCount },
        { count: incomeCount },
        { count: loansCount },
        { count: insurancesCount },
        { count: todosCount },
        { count: studyLogsCount },
        { count: achievementsCount },
      ] = await Promise.all([
        supabase.from("memories").select("*", { count: "exact", head: true }),
        supabase.from("expenses").select("*", { count: "exact", head: true }),
        supabase.from("income_entries").select("*", { count: "exact", head: true }),
        supabase.from("loans").select("*", { count: "exact", head: true }),
        supabase.from("insurances").select("*", { count: "exact", head: true }),
        supabase.from("todos").select("*", { count: "exact", head: true }),
        supabase.from("study_logs").select("*", { count: "exact", head: true }),
        supabase.from("achievements").select("*", { count: "exact", head: true }),
      ]);

      return {
        memories: memoriesCount || 0,
        expenses: expensesCount || 0,
        income: incomeCount || 0,
        loans: loansCount || 0,
        insurances: insurancesCount || 0,
        todos: todosCount || 0,
        studyLogs: studyLogsCount || 0,
        achievements: achievementsCount || 0,
      } as BackupStats;
    },
    enabled: !!user,
  });

  const toggleModule = (module: BackupModule) => {
    setSelectedModules((prev) => {
      const next = new Set(prev);
      if (module === "all") {
        return new Set(["all"]);
      }
      next.delete("all");
      if (next.has(module)) {
        next.delete(module);
      } else {
        next.add(module);
      }
      if (next.size === 0) {
        return new Set(["all"]);
      }
      return next;
    });
  };

  const handleExport = async () => {
    if (!user) return;
    setIsExporting(true);
    setExportProgress(0);

    try {
      const exportData: Record<string, any> = {
        exportDate: new Date().toISOString(),
        version: "1.0",
        userId: user.id,
        email: user.email,
      };

      const includeAll = selectedModules.has("all");

      // Export memories
      if (includeAll || selectedModules.has("memories")) {
        setExportProgress(10);
        const { data: memories } = await supabase.from("memories").select("*");
        const { data: collections } = await supabase.from("memory_collections").select("*");
        const { data: folders } = await supabase.from("memory_folders").select("*");
        exportData.memories = { memories, collections, folders };
      }

      // Export finance
      if (includeAll || selectedModules.has("finance")) {
        setExportProgress(30);
        const { data: expenses } = await supabase.from("expenses").select("*");
        const { data: incomeEntries } = await supabase.from("income_entries").select("*");
        const { data: incomeSources } = await supabase.from("income_sources").select("*");
        const { data: loans } = await supabase.from("loans").select("*");
        const { data: emiSchedule } = await supabase.from("emi_schedule").select("*");
        const { data: savingsGoals } = await supabase.from("savings_goals").select("*");
        const { data: budgetLimits } = await supabase.from("budget_limits").select("*");
        exportData.finance = { 
          expenses, incomeEntries, incomeSources, loans, emiSchedule, savingsGoals, budgetLimits 
        };
      }

      // Export study
      if (includeAll || selectedModules.has("study")) {
        setExportProgress(50);
        const { data: studyLogs } = await supabase.from("study_logs").select("*");
        const { data: studyGoals } = await supabase.from("study_goals").select("*");
        const { data: syllabusTopics } = await supabase.from("syllabus_topics").select("*");
        const { data: syllabusPhases } = await supabase.from("syllabus_phases").select("*");
        const { data: syllabusModules } = await supabase.from("syllabus_modules").select("*");
        exportData.study = { studyLogs, studyGoals, syllabusTopics, syllabusPhases, syllabusModules };
      }

      // Export documents (insurances)
      if (includeAll || selectedModules.has("documents")) {
        setExportProgress(70);
        const { data: insurances } = await supabase.from("insurances").select("*");
        const { data: claims } = await supabase.from("insurance_claims").select("*");
        const { data: familyMembers } = await supabase.from("family_members").select("*");
        exportData.documents = { insurances, claims, familyMembers };
      }

      // Always export core data
      setExportProgress(85);
      const { data: todos } = await supabase.from("todos").select("*");
      const { data: achievements } = await supabase.from("achievements").select("*");
      const { data: activityLogs } = await supabase.from("activity_logs").select("*").limit(1000);
      const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      
      exportData.core = { todos, achievements, activityLogs, profile };

      setExportProgress(95);

      // Create and download file
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vyom-backup-${format(new Date(), "yyyy-MM-dd-HHmmss")}.json`;
      a.click();
      URL.revokeObjectURL(url);

      setExportProgress(100);
      logActivity("Created full backup", "Settings");
      toast({ title: "Backup created successfully" });
    } catch (error) {
      console.error("Backup failed:", error);
      toast({ title: "Backup failed", variant: "destructive" });
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) return;
    setIsRestoring(true);

    try {
      const content = await restoreFile.text();
      const data = JSON.parse(content);

      // Validate backup structure
      if (!data.version || !data.exportDate) {
        throw new Error("Invalid backup file format");
      }

      // Show what will be restored
      const summary = [];
      if (data.memories?.memories?.length) summary.push(`${data.memories.memories.length} memories`);
      if (data.finance?.expenses?.length) summary.push(`${data.finance.expenses.length} expenses`);
      if (data.study?.studyLogs?.length) summary.push(`${data.study.studyLogs.length} study logs`);
      if (data.core?.todos?.length) summary.push(`${data.core.todos.length} todos`);

      toast({
        title: "Backup validated",
        description: `Ready to restore: ${summary.join(", ")}. Full restore coming soon.`,
      });
      
      logActivity("Validated backup file", "Settings");
    } catch (error) {
      console.error("Restore failed:", error);
      toast({ title: "Invalid backup file", variant: "destructive" });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Backup & Restore</h1>
        <p className="text-sm text-muted-foreground mt-1">Export and protect your VYOM data</p>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Image className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-light">{stats?.memories || 0}</p>
              <p className="text-xs text-muted-foreground">Memories</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-light">{(stats?.expenses || 0) + (stats?.income || 0)}</p>
              <p className="text-xs text-muted-foreground">Transactions</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-light">{stats?.studyLogs || 0}</p>
              <p className="text-xs text-muted-foreground">Study Logs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Trophy className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="text-2xl font-light">{stats?.achievements || 0}</p>
              <p className="text-xs text-muted-foreground">Achievements</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Full Backup */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileArchive className="w-5 h-5" />
            Full Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Create a complete backup of all your CHRONYX data. This includes memories metadata, 
            financial records, study progress, documents, and all settings.
          </p>

          {/* Module Selection */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Select what to include:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { id: "all", label: "Everything", icon: Database },
                { id: "memories", label: "Memories", icon: Image },
                { id: "finance", label: "Finance", icon: Wallet },
                { id: "study", label: "Study", icon: BookOpen },
                { id: "documents", label: "Insurance", icon: Shield },
              ].map(({ id, label, icon: Icon }) => (
                <div
                  key={id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedModules.has(id as BackupModule)
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-accent/30"
                  }`}
                  onClick={() => toggleModule(id as BackupModule)}
                >
                  <Checkbox checked={selectedModules.has(id as BackupModule)} />
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {isExporting && (
            <div className="space-y-2">
              <Progress value={exportProgress} />
              <p className="text-sm text-muted-foreground text-center">
                Exporting... {exportProgress}%
              </p>
            </div>
          )}

          <Button onClick={handleExport} disabled={isExporting} className="w-full sm:w-auto">
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Create Backup
          </Button>
        </CardContent>
      </Card>

      {/* Restore */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="w-5 h-5" />
            Restore from Backup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600">Restore with caution</p>
              <p className="text-muted-foreground mt-1">
                Restoring will merge backup data with existing data. Duplicates will be skipped.
                This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <Input
              type="file"
              accept=".json"
              onChange={(e) => setRestoreFile(e.target.files?.[0] || null)}
            />
            {restoreFile && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="w-4 h-4 text-green-500" />
                {restoreFile.name}
              </div>
            )}
          </div>

          <Button 
            variant="outline" 
            onClick={handleRestore} 
            disabled={!restoreFile || isRestoring}
          >
            {isRestoring ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Validate & Preview
          </Button>
        </CardContent>
      </Card>

      {/* Data Safety Note */}
      <div className="text-center text-sm text-muted-foreground">
        <p>Your data belongs to you. Export regularly to keep a local copy.</p>
        <p className="mt-1">Backup files are standard JSON — human-readable and portable.</p>
      </div>
    </div>
  );
};

export default Backup;
