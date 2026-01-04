import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Target } from "lucide-react";
import FinancialReportPDF from "@/components/reports/FinancialReportPDF";
import BudgetPlanner from "@/components/budget/BudgetPlanner";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("reports");

  return (
    <div className="space-y-6 animate-fade-in">
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Reports & Budget</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Generate financial reports and manage category budgets
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Reports
          </TabsTrigger>
          <TabsTrigger value="budget" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Budget
          </TabsTrigger>
        </TabsList>

        <TabsContent value="reports" className="mt-6">
          <FinancialReportPDF />
        </TabsContent>

        <TabsContent value="budget" className="mt-6">
          <BudgetPlanner />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
