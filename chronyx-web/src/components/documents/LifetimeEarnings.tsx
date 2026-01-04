import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  IndianRupee, 
  Trash2, 
  Edit2,
  Briefcase,
  TrendingUp,
  Calculator
} from "lucide-react";
import { format, differenceInMonths } from "date-fns";

interface WorkRecord {
  id: string;
  company_name: string;
  role: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean | null;
}

interface SalaryRecord {
  id: string;
  work_history_id: string;
  salary_type: string;
  monthly_amount: number | null;
  annual_amount: number | null;
  bonus: number | null;
  variable_pay: number | null;
  effective_date: string | null;
  notes: string | null;
  created_at: string;
}

const LifetimeEarnings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SalaryRecord | null>(null);
  const [formData, setFormData] = useState({
    work_history_id: "",
    salary_type: "monthly",
    monthly_amount: "",
    annual_amount: "",
    bonus: "",
    variable_pay: "",
    effective_date: "",
    notes: ""
  });

  const { data: workRecords = [] } = useQuery({
    queryKey: ["work-history", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("work_history")
        .select("*")
        .eq("user_id", user?.id)
        .order("start_date", { ascending: false });
      if (error) throw error;
      return data as WorkRecord[];
    },
    enabled: !!user?.id
  });

  const { data: salaryRecords = [], isLoading } = useQuery({
    queryKey: ["salary-records", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_records")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SalaryRecord[];
    },
    enabled: !!user?.id
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase.from("salary_records").insert({
        user_id: user?.id,
        work_history_id: data.work_history_id,
        salary_type: data.salary_type,
        monthly_amount: data.monthly_amount ? parseFloat(data.monthly_amount) : null,
        annual_amount: data.annual_amount ? parseFloat(data.annual_amount) : null,
        bonus: data.bonus ? parseFloat(data.bonus) : 0,
        variable_pay: data.variable_pay ? parseFloat(data.variable_pay) : 0,
        effective_date: data.effective_date || null,
        notes: data.notes || null
      });
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: "Added salary record"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-records"] });
      setIsAddOpen(false);
      resetForm();
      toast({ title: "Salary record added" });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from("salary_records")
        .update({
          work_history_id: data.work_history_id,
          salary_type: data.salary_type,
          monthly_amount: data.monthly_amount ? parseFloat(data.monthly_amount) : null,
          annual_amount: data.annual_amount ? parseFloat(data.annual_amount) : null,
          bonus: data.bonus ? parseFloat(data.bonus) : 0,
          variable_pay: data.variable_pay ? parseFloat(data.variable_pay) : 0,
          effective_date: data.effective_date || null,
          notes: data.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-records"] });
      setEditingRecord(null);
      resetForm();
      toast({ title: "Record updated" });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("salary_records").delete().eq("id", id);
      if (error) throw error;

      await supabase.from("activity_logs").insert({
        user_id: user?.id,
        module: "Documents",
        action: "Deleted salary record"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["salary-records"] });
      toast({ title: "Record deleted" });
    }
  });

  const resetForm = () => {
    setFormData({
      work_history_id: "",
      salary_type: "monthly",
      monthly_amount: "",
      annual_amount: "",
      bonus: "",
      variable_pay: "",
      effective_date: "",
      notes: ""
    });
  };

  const openEdit = (record: SalaryRecord) => {
    setEditingRecord(record);
    setFormData({
      work_history_id: record.work_history_id,
      salary_type: record.salary_type,
      monthly_amount: record.monthly_amount?.toString() || "",
      annual_amount: record.annual_amount?.toString() || "",
      bonus: record.bonus?.toString() || "",
      variable_pay: record.variable_pay?.toString() || "",
      effective_date: record.effective_date || "",
      notes: record.notes || ""
    });
  };

  const getWorkRecord = (id: string) => {
    return workRecords.find(w => w.id === id);
  };

  // Calculate earnings per job
  const calculateJobEarnings = (salary: SalaryRecord, work: WorkRecord | undefined) => {
    if (!work) return 0;
    
    const start = new Date(work.start_date);
    const end = work.is_current ? new Date() : work.end_date ? new Date(work.end_date) : new Date();
    const months = differenceInMonths(end, start);
    
    let monthlyPay = salary.monthly_amount || 0;
    if (!monthlyPay && salary.annual_amount) {
      monthlyPay = salary.annual_amount / 12;
    }
    
    const baseEarnings = monthlyPay * months;
    const bonusTotal = salary.bonus || 0;
    const variableTotal = salary.variable_pay || 0;
    
    return baseEarnings + bonusTotal + variableTotal;
  };

  // Calculate lifetime total
  const lifetimeTotal = salaryRecords.reduce((total, salary) => {
    const work = getWorkRecord(salary.work_history_id);
    return total + calculateJobEarnings(salary, work);
  }, 0);

  // Group by year
  const earningsByYear: Record<number, number> = {};
  salaryRecords.forEach(salary => {
    const work = getWorkRecord(salary.work_history_id);
    if (!work) return;
    
    const startYear = new Date(work.start_date).getFullYear();
    const endYear = work.is_current ? new Date().getFullYear() : work.end_date ? new Date(work.end_date).getFullYear() : new Date().getFullYear();
    
    let monthlyPay = salary.monthly_amount || 0;
    if (!monthlyPay && salary.annual_amount) {
      monthlyPay = salary.annual_amount / 12;
    }
    
    for (let year = startYear; year <= endYear; year++) {
      if (!earningsByYear[year]) earningsByYear[year] = 0;
      
      // Calculate months worked in this year for this job
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const jobStart = new Date(work.start_date);
      const jobEnd = work.is_current ? new Date() : work.end_date ? new Date(work.end_date) : new Date();
      
      const effectiveStart = jobStart > yearStart ? jobStart : yearStart;
      const effectiveEnd = jobEnd < yearEnd ? jobEnd : yearEnd;
      
      if (effectiveStart <= effectiveEnd) {
        const monthsInYear = differenceInMonths(effectiveEnd, effectiveStart) + 1;
        earningsByYear[year] += monthlyPay * monthsInYear;
      }
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', { 
      style: 'currency', 
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-medium">Lifetime Earnings</h2>
          <p className="text-sm text-muted-foreground">
            Track your complete earnings history
          </p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { resetForm(); setIsAddOpen(true); }} disabled={workRecords.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              Add Salary
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Salary Record</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Employment</Label>
                <Select 
                  value={formData.work_history_id}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, work_history_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment" />
                  </SelectTrigger>
                  <SelectContent>
                    {workRecords.map(work => (
                      <SelectItem key={work.id} value={work.id}>
                        {work.company_name} - {work.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Salary Type</Label>
                <Select 
                  value={formData.salary_type}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, salary_type: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual CTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Monthly Amount</Label>
                  <Input
                    type="number"
                    value={formData.monthly_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: e.target.value }))}
                    placeholder="₹"
                  />
                </div>
                <div>
                  <Label>Annual CTC</Label>
                  <Input
                    type="number"
                    value={formData.annual_amount}
                    onChange={(e) => setFormData(prev => ({ ...prev, annual_amount: e.target.value }))}
                    placeholder="₹"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Bonus (optional)</Label>
                  <Input
                    type="number"
                    value={formData.bonus}
                    onChange={(e) => setFormData(prev => ({ ...prev, bonus: e.target.value }))}
                    placeholder="₹"
                  />
                </div>
                <div>
                  <Label>Variable Pay (optional)</Label>
                  <Input
                    type="number"
                    value={formData.variable_pay}
                    onChange={(e) => setFormData(prev => ({ ...prev, variable_pay: e.target.value }))}
                    placeholder="₹"
                  />
                </div>
              </div>

              <div>
                <Label>Effective Date (optional)</Label>
                <Input
                  type="date"
                  value={formData.effective_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, effective_date: e.target.value }))}
                />
              </div>

              <div>
                <Label>Notes (optional)</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                />
              </div>

              <Button 
                onClick={() => addMutation.mutate(formData)}
                disabled={!formData.work_history_id || addMutation.isPending}
                className="w-full"
              >
                {addMutation.isPending ? "Saving..." : "Save Record"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6 text-center">
            <IndianRupee className="h-8 w-8 mx-auto mb-2 text-primary" />
            <p className="text-2xl font-light">{formatCurrency(lifetimeTotal)}</p>
            <p className="text-sm text-muted-foreground">Lifetime Earnings</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-6 text-center">
            <Briefcase className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-light">{salaryRecords.length}</p>
            <p className="text-sm text-muted-foreground">Salary Records</p>
          </CardContent>
        </Card>
        <Card className="bg-muted/30 border-border/50">
          <CardContent className="p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            <p className="text-2xl font-light">{Object.keys(earningsByYear).length}</p>
            <p className="text-sm text-muted-foreground">Years of Earnings</p>
          </CardContent>
        </Card>
      </div>

      {workRecords.length === 0 && (
        <Card className="bg-muted/30">
          <CardContent className="p-8 text-center">
            <Briefcase className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="text-muted-foreground">Add work history first to track earnings</p>
          </CardContent>
        </Card>
      )}

      {/* Earnings by Employer */}
      {salaryRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Earnings by Employer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Monthly</TableHead>
                  <TableHead className="text-right">Total Earned</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salaryRecords.map(salary => {
                  const work = getWorkRecord(salary.work_history_id);
                  const totalEarned = calculateJobEarnings(salary, work);
                  
                  return (
                    <TableRow key={salary.id}>
                      <TableCell className="font-medium">{work?.company_name || "Unknown"}</TableCell>
                      <TableCell>{work?.role || "-"}</TableCell>
                      <TableCell className="text-right">
                        {salary.monthly_amount ? formatCurrency(salary.monthly_amount) : "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-primary">
                        {formatCurrency(totalEarned)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(salary)}>
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => {
                              if (confirm("Delete this salary record?")) {
                                deleteMutation.mutate(salary.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Year-wise Breakdown */}
      {Object.keys(earningsByYear).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Year-wise Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(earningsByYear)
                  .sort(([a], [b]) => parseInt(b) - parseInt(a))
                  .map(([year, amount]) => (
                    <TableRow key={year}>
                      <TableCell className="font-medium">{year}</TableCell>
                      <TableCell className="text-right">{formatCurrency(amount)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={!!editingRecord} onOpenChange={(open) => !open && setEditingRecord(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Salary Record</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>Employment</Label>
              <Select 
                value={formData.work_history_id}
                onValueChange={(v) => setFormData(prev => ({ ...prev, work_history_id: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {workRecords.map(work => (
                    <SelectItem key={work.id} value={work.id}>
                      {work.company_name} - {work.role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monthly Amount</Label>
                <Input
                  type="number"
                  value={formData.monthly_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, monthly_amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Annual CTC</Label>
                <Input
                  type="number"
                  value={formData.annual_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, annual_amount: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Bonus</Label>
                <Input
                  type="number"
                  value={formData.bonus}
                  onChange={(e) => setFormData(prev => ({ ...prev, bonus: e.target.value }))}
                />
              </div>
              <div>
                <Label>Variable Pay</Label>
                <Input
                  type="number"
                  value={formData.variable_pay}
                  onChange={(e) => setFormData(prev => ({ ...prev, variable_pay: e.target.value }))}
                />
              </div>
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={2}
              />
            </div>

            <Button 
              onClick={() => editingRecord && updateMutation.mutate({ ...formData, id: editingRecord.id })}
              disabled={updateMutation.isPending}
              className="w-full"
            >
              {updateMutation.isPending ? "Saving..." : "Update Record"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LifetimeEarnings;
