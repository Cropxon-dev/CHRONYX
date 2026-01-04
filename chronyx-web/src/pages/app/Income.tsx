import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Wallet, TrendingUp, Calendar, Layers } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useActivityLog } from "@/hooks/useActivityLog";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import IncomeSourcesList from "@/components/income/IncomeSourcesList";
import IncomeEntriesList from "@/components/income/IncomeEntriesList";
import AddIncomeSourceForm from "@/components/income/AddIncomeSourceForm";
import AddIncomeEntryForm from "@/components/income/AddIncomeEntryForm";
import { SavingsGoals } from "@/components/savings/SavingsGoals";

interface IncomeStats {
  monthTotal: number;
  yearTotal: number;
  activeSources: number;
  topSource: string;
}

const Income = () => {
  const { user } = useAuth();
  const { logActivity } = useActivityLog();
  const [activeTab, setActiveTab] = useState("entries");
  const [stats, setStats] = useState<IncomeStats>({
    monthTotal: 0,
    yearTotal: 0,
    activeSources: 0,
    topSource: "-",
  });
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [isSourceDialogOpen, setIsSourceDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, refreshKey]);

  const fetchStats = async () => {
    if (!user) return;

    const monthStart = format(startOfMonth(new Date()), "yyyy-MM-dd");
    const monthEnd = format(endOfMonth(new Date()), "yyyy-MM-dd");
    const yearStart = `${new Date().getFullYear()}-01-01`;
    const yearEnd = `${new Date().getFullYear()}-12-31`;

    // This month's income
    const { data: monthEntries } = await supabase
      .from("income_entries")
      .select("amount, income_source_id")
      .eq("user_id", user.id)
      .gte("income_date", monthStart)
      .lte("income_date", monthEnd);

    const monthTotal = monthEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // This year's income
    const { data: yearEntries } = await supabase
      .from("income_entries")
      .select("amount")
      .eq("user_id", user.id)
      .gte("income_date", yearStart)
      .lte("income_date", yearEnd);

    const yearTotal = yearEntries?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;

    // Active sources count
    const { count: sourcesCount } = await supabase
      .from("income_sources")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // Top source this month
    const sourceTotals: Record<string, number> = {};
    monthEntries?.forEach((e) => {
      if (e.income_source_id) {
        sourceTotals[e.income_source_id] = (sourceTotals[e.income_source_id] || 0) + Number(e.amount);
      }
    });

    let topSourceName = "-";
    const topSourceId = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (topSourceId) {
      const { data: source } = await supabase
        .from("income_sources")
        .select("source_name")
        .eq("id", topSourceId)
        .single();
      if (source) topSourceName = source.source_name;
    }

    setStats({
      monthTotal,
      yearTotal,
      activeSources: sourcesCount || 0,
      topSource: topSourceName,
    });
  };

  const handleEntryAdded = () => {
    setIsEntryDialogOpen(false);
    setRefreshKey((k) => k + 1);
    logActivity("Added income entry", "Income");
  };

  const handleSourceAdded = () => {
    setIsSourceDialogOpen(false);
    setRefreshKey((k) => k + 1);
    logActivity("Added income source", "Income");
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-foreground tracking-wide">Income</h1>
          <p className="text-sm text-muted-foreground mt-1">Track your income sources and entries</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isSourceDialogOpen} onOpenChange={setIsSourceDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Layers className="w-4 h-4 mr-2" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Income Source</DialogTitle>
              </DialogHeader>
              <AddIncomeSourceForm onSuccess={handleSourceAdded} />
            </DialogContent>
          </Dialog>
          <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="vyom">
                <Plus className="w-4 h-4 mr-2" />
                Add Income
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Income Entry</DialogTitle>
              </DialogHeader>
              <AddIncomeEntryForm onSuccess={handleEntryAdded} />
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5" />
              This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              ₹{stats.monthTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Wallet className="w-3.5 h-3.5" />
              This Year
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              ₹{stats.yearTotal.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-3.5 h-3.5" />
              Active Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground">
              {stats.activeSources}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" />
              Top Source
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground truncate">
              {stats.topSource}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="entries">Income Entries</TabsTrigger>
          <TabsTrigger value="sources">Income Sources</TabsTrigger>
        </TabsList>

        <TabsContent value="entries" className="mt-4">
          <IncomeEntriesList key={refreshKey} onUpdate={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>

        <TabsContent value="sources" className="mt-4">
          <IncomeSourcesList key={refreshKey} onUpdate={() => setRefreshKey((k) => k + 1)} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Income;
