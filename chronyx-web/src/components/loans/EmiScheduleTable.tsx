import { useState } from "react";
import { cn } from "@/lib/utils";
import { Check, Clock, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "./LoanSummaryCards";
import { REPAYMENT_MODES } from "./BankLogos";
import { format, parseISO } from "date-fns";

interface EmiEntry {
  id: string;
  emi_month: number;
  emi_date: string;
  emi_amount: number;
  principal_component: number;
  interest_component: number;
  remaining_principal: number;
  payment_status: string;
  payment_method?: string;
  paid_date?: string;
  is_adjusted?: boolean;
}

interface EmiScheduleTableProps {
  schedule: EmiEntry[];
  currency: string;
  onMarkPaid: (emiId: string, paidDate: string, paymentMethod: string) => void;
  isLoading?: boolean;
}

export const EmiScheduleTable = ({
  schedule,
  currency,
  onMarkPaid,
  isLoading,
}: EmiScheduleTableProps) => {
  const [showAll, setShowAll] = useState(false);
  const [markPaidId, setMarkPaidId] = useState<string | null>(null);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("Auto Debit");

  const displaySchedule = showAll ? schedule : schedule.slice(0, 12);
  
  const statusIcon = (status: string) => {
    switch (status) {
      case "Paid":
        return <Check className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case "Pending":
        return <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />;
      case "Cancelled":
        return <X className="w-4 h-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const handleMarkPaid = () => {
    if (markPaidId) {
      onMarkPaid(markPaidId, paidDate, paymentMethod);
      setMarkPaidId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-medium text-muted-foreground">#</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Date</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">EMI</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Principal</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Interest</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground text-right">Balance</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Status</TableHead>
                <TableHead className="text-xs font-medium text-muted-foreground">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displaySchedule.map((emi) => (
                <TableRow 
                  key={emi.id}
                  className={cn(
                    "hover:bg-muted/20",
                    emi.payment_status === "Paid" && "bg-muted/10",
                    emi.is_adjusted && "border-l-2 border-l-amber-500"
                  )}
                >
                  <TableCell className="text-sm text-muted-foreground">{emi.emi_month}</TableCell>
                  <TableCell className="text-sm">
                    {format(parseISO(emi.emi_date), "MMM dd, yyyy")}
                  </TableCell>
                  <TableCell className="text-sm text-right font-medium">
                    {formatCurrency(Number(emi.emi_amount), currency)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(emi.principal_component), currency)}
                  </TableCell>
                  <TableCell className="text-sm text-right text-muted-foreground">
                    {formatCurrency(Number(emi.interest_component), currency)}
                  </TableCell>
                  <TableCell className="text-sm text-right">
                    {formatCurrency(Number(emi.remaining_principal), currency)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusIcon(emi.payment_status)}
                      <span className={cn(
                        "text-xs",
                        emi.payment_status === "Paid" && "text-green-600 dark:text-green-400",
                        emi.payment_status === "Pending" && "text-amber-600 dark:text-amber-400",
                        emi.payment_status === "Cancelled" && "text-muted-foreground"
                      )}>
                        {emi.payment_status}
                      </span>
                    </div>
                    {emi.paid_date && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {format(parseISO(emi.paid_date), "MMM dd")} via {emi.payment_method}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    {emi.payment_status === "Pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setMarkPaidId(emi.id)}
                        className="h-7 text-xs"
                        disabled={isLoading}
                      >
                        Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {schedule.length > 12 && (
        <Button
          variant="ghost"
          onClick={() => setShowAll(!showAll)}
          className="w-full text-muted-foreground"
        >
          {showAll ? (
            <>
              <ChevronUp className="w-4 h-4 mr-2" />
              Show Less
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 mr-2" />
              Show All {schedule.length} EMIs
            </>
          )}
        </Button>
      )}

      {/* Mark Paid Dialog */}
      <Dialog open={!!markPaidId} onOpenChange={() => setMarkPaidId(null)}>
        <DialogContent className="bg-card border-border sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-light tracking-wide">Mark EMI as Paid</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Date</Label>
              <Input
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
                className="bg-background border-border"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {REPAYMENT_MODES.map((mode) => (
                    <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setMarkPaidId(null)}
                className="flex-1 border-border"
              >
                Cancel
              </Button>
              <Button
                onClick={handleMarkPaid}
                disabled={isLoading}
                className="flex-1 bg-primary text-primary-foreground"
              >
                {isLoading ? "Saving..." : "Confirm"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
