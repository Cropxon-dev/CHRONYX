import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from "date-fns";
import { FileDown, Loader2, Calendar, TrendingUp, TrendingDown, Landmark, Shield } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportData {
  period: string;
  income: { source: string; amount: number }[];
  expenses: { category: string; amount: number }[];
  loans: { bank: string; type: string; remaining: number; paidThisPeriod: number }[];
  insurance: { name: string; premium: number; coverage: number }[];
  totals: {
    totalIncome: number;
    totalExpenses: number;
    netFlow: number;
    totalLoanRemaining: number;
    totalInsuranceCoverage: number;
  };
}

const FinancialReportPDF = () => {
  const { user } = useAuth();
  const [reportType, setReportType] = useState<"monthly" | "yearly">("monthly");
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), "yyyy-MM"));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), "yyyy"));
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  const months = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, "yyyy-MM"), label: format(date, "MMMM yyyy") };
  });

  const years = Array.from({ length: 5 }, (_, i) => {
    const year = new Date().getFullYear() - i;
    return { value: year.toString(), label: year.toString() };
  });

  const fetchReportData = async () => {
    if (!user) return;
    setLoading(true);

    try {
      let startDate: string, endDate: string, periodLabel: string;

      if (reportType === "monthly") {
        const date = new Date(selectedMonth + "-01");
        startDate = format(startOfMonth(date), "yyyy-MM-dd");
        endDate = format(endOfMonth(date), "yyyy-MM-dd");
        periodLabel = format(date, "MMMM yyyy");
      } else {
        const date = new Date(parseInt(selectedYear), 0, 1);
        startDate = format(startOfYear(date), "yyyy-MM-dd");
        endDate = format(endOfYear(date), "yyyy-MM-dd");
        periodLabel = selectedYear;
      }

      // Fetch income
      const { data: incomeData } = await supabase
        .from("income_entries")
        .select("amount, income_sources(source_name)")
        .eq("user_id", user.id)
        .gte("income_date", startDate)
        .lte("income_date", endDate);

      const incomeBySource: Record<string, number> = {};
      incomeData?.forEach((entry: any) => {
        const source = entry.income_sources?.source_name || "Unknown";
        incomeBySource[source] = (incomeBySource[source] || 0) + Number(entry.amount);
      });

      // Fetch expenses
      const { data: expenseData } = await supabase
        .from("expenses")
        .select("amount, category")
        .eq("user_id", user.id)
        .gte("expense_date", startDate)
        .lte("expense_date", endDate);

      const expensesByCategory: Record<string, number> = {};
      expenseData?.forEach((entry) => {
        expensesByCategory[entry.category] = (expensesByCategory[entry.category] || 0) + Number(entry.amount);
      });

      // Fetch loans
      const { data: loans } = await supabase
        .from("loans")
        .select("id, bank_name, loan_type, principal_amount")
        .eq("user_id", user.id);

      const loanDetails = await Promise.all(
        (loans || []).map(async (loan) => {
          const { data: schedule } = await supabase
            .from("emi_schedule")
            .select("remaining_principal, emi_amount, payment_status")
            .eq("loan_id", loan.id);

          const remaining = schedule?.find((s) => s.payment_status === "Pending")?.remaining_principal || 0;
          const paidThisPeriod = schedule
            ?.filter((s) => s.payment_status === "Paid")
            .reduce((sum, s) => sum + Number(s.emi_amount), 0) || 0;

          return {
            bank: loan.bank_name,
            type: loan.loan_type,
            remaining: Number(remaining),
            paidThisPeriod,
          };
        })
      );

      // Fetch insurance
      const { data: insurances } = await supabase
        .from("insurances")
        .select("policy_name, premium_amount, sum_assured")
        .eq("user_id", user.id)
        .eq("status", "active");

      const totalIncome = Object.values(incomeBySource).reduce((a, b) => a + b, 0);
      const totalExpenses = Object.values(expensesByCategory).reduce((a, b) => a + b, 0);

      setReportData({
        period: periodLabel,
        income: Object.entries(incomeBySource).map(([source, amount]) => ({ source, amount })),
        expenses: Object.entries(expensesByCategory).map(([category, amount]) => ({ category, amount })),
        loans: loanDetails,
        insurance: (insurances || []).map((ins) => ({
          name: ins.policy_name,
          premium: Number(ins.premium_amount),
          coverage: Number(ins.sum_assured),
        })),
        totals: {
          totalIncome,
          totalExpenses,
          netFlow: totalIncome - totalExpenses,
          totalLoanRemaining: loanDetails.reduce((sum, l) => sum + l.remaining, 0),
          totalInsuranceCoverage: (insurances || []).reduce((sum, i) => sum + Number(i.sum_assured), 0),
        },
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchReportData();
  }, [user, reportType, selectedMonth, selectedYear]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const generatePDF = () => {
    if (!reportData) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.text("Financial Report", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(12);
    doc.text(reportData.period, pageWidth / 2, 28, { align: "center" });

    let yPos = 40;

    // Summary
    doc.setFontSize(14);
    doc.text("Summary", 14, yPos);
    yPos += 8;

    autoTable(doc, {
      startY: yPos,
      head: [["Metric", "Amount"]],
      body: [
        ["Total Income", formatCurrency(reportData.totals.totalIncome)],
        ["Total Expenses", formatCurrency(reportData.totals.totalExpenses)],
        ["Net Flow", formatCurrency(reportData.totals.netFlow)],
        ["Outstanding Loans", formatCurrency(reportData.totals.totalLoanRemaining)],
        ["Insurance Coverage", formatCurrency(reportData.totals.totalInsuranceCoverage)],
      ],
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246] },
    });

    yPos = (doc as any).lastAutoTable.finalY + 15;

    // Income
    if (reportData.income.length > 0) {
      doc.setFontSize(14);
      doc.text("Income Breakdown", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Source", "Amount"]],
        body: reportData.income.map((i) => [i.source, formatCurrency(i.amount)]),
        theme: "striped",
        headStyles: { fillColor: [34, 197, 94] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Expenses
    if (reportData.expenses.length > 0) {
      doc.setFontSize(14);
      doc.text("Expense Breakdown", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Category", "Amount"]],
        body: reportData.expenses.map((e) => [e.category, formatCurrency(e.amount)]),
        theme: "striped",
        headStyles: { fillColor: [239, 68, 68] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Check if we need a new page
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }

    // Loans
    if (reportData.loans.length > 0) {
      doc.setFontSize(14);
      doc.text("Loan Status", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Bank", "Type", "Remaining", "Paid This Period"]],
        body: reportData.loans.map((l) => [
          l.bank,
          l.type,
          formatCurrency(l.remaining),
          formatCurrency(l.paidThisPeriod),
        ]),
        theme: "striped",
        headStyles: { fillColor: [168, 85, 247] },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;
    }

    // Insurance
    if (reportData.insurance.length > 0) {
      doc.setFontSize(14);
      doc.text("Insurance Policies", 14, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [["Policy", "Premium", "Coverage"]],
        body: reportData.insurance.map((i) => [
          i.name,
          formatCurrency(i.premium),
          formatCurrency(i.coverage),
        ]),
        theme: "striped",
        headStyles: { fillColor: [14, 165, 233] },
      });
    }

    // Footer
    const pageCount = doc.internal.pages.length - 1;
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(
        `Generated on ${format(new Date(), "PPP")} | Page ${i} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: "center" }
      );
    }

    doc.save(`financial-report-${reportData.period.toLowerCase().replace(/\s/g, "-")}.pdf`);
    toast.success("Report downloaded successfully");
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Generate Report
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Report Type</label>
              <Select value={reportType} onValueChange={(v: "monthly" | "yearly") => setReportType(v)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {reportType === "monthly" ? (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Month</label>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm text-muted-foreground">Year</label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y.value} value={y.value}>
                        {y.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-end">
              <Button onClick={generatePDF} disabled={loading || !reportData}>
                {loading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="w-4 h-4 mr-2" />
                )}
                Download PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {reportData && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-green-500 mb-2">
                  <TrendingUp className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Income</span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(reportData.totals.totalIncome)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive mb-2">
                  <TrendingDown className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Expenses</span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(reportData.totals.totalExpenses)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <span className="text-xs uppercase tracking-wider">Net Flow</span>
                </div>
                <p className={`text-xl font-semibold ${reportData.totals.netFlow >= 0 ? "text-green-500" : "text-destructive"}`}>
                  {formatCurrency(reportData.totals.netFlow)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Landmark className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Loans</span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(reportData.totals.totalLoanRemaining)}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Shield className="w-4 h-4" />
                  <span className="text-xs uppercase tracking-wider">Coverage</span>
                </div>
                <p className="text-xl font-semibold text-foreground">
                  {formatCurrency(reportData.totals.totalInsuranceCoverage)}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Income */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Income Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.income.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.income.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.source}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No income recorded</p>
                )}
              </CardContent>
            </Card>

            {/* Expenses */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                  Expense Categories
                </CardTitle>
              </CardHeader>
              <CardContent>
                {reportData.expenses.length > 0 ? (
                  <div className="space-y-2">
                    {reportData.expenses.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span className="text-muted-foreground">{item.category}</span>
                        <span className="font-medium text-foreground">{formatCurrency(item.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No expenses recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialReportPDF;
