import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { format, parseISO } from "date-fns";
import { 
  CreditCard, 
  FileText, 
  DollarSign, 
  Edit2, 
  Plus,
  CheckCircle,
  ArrowDownCircle,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "./LoanSummaryCards";

interface LoanHistoryProps {
  loanId: string;
  currency: "INR" | "USD";
}

interface HistoryEvent {
  id: string;
  type: "loan_created" | "emi_paid" | "part_payment" | "foreclosure" | "document_uploaded" | "loan_updated";
  date: string;
  title: string;
  description?: string;
  amount?: number;
  method?: string;
}

export const LoanHistory = ({ loanId, currency }: LoanHistoryProps) => {
  // Fetch EMI events
  const { data: emiEvents = [] } = useQuery({
    queryKey: ["emi-events", loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emi_events")
        .select("*")
        .eq("loan_id", loanId)
        .order("event_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!loanId,
  });

  // Fetch paid EMIs
  const { data: paidEmis = [] } = useQuery({
    queryKey: ["paid-emis", loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("emi_schedule")
        .select("*")
        .eq("loan_id", loanId)
        .eq("payment_status", "Paid")
        .order("paid_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!loanId,
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ["loan-documents-history", loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loan_documents")
        .select("*")
        .eq("loan_id", loanId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!loanId,
  });

  // Fetch loan for creation date
  const { data: loan } = useQuery({
    queryKey: ["loan-detail", loanId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("loans")
        .select("*")
        .eq("id", loanId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!loanId,
  });

  // Combine all events into a timeline
  const history: HistoryEvent[] = [];

  // Add loan creation
  if (loan) {
    history.push({
      id: `loan-created-${loan.id}`,
      type: "loan_created",
      date: loan.created_at,
      title: "Loan Added",
      description: `${loan.bank_name} ${loan.loan_type} Loan - ${formatCurrency(loan.principal_amount, currency)}`,
    });
  }

  // Add EMI events
  emiEvents.forEach((event) => {
    if (event.event_type === "part_payment") {
      history.push({
        id: event.id,
        type: "part_payment",
        date: event.event_date,
        title: "Part Payment Applied",
        description: `${event.reduction_type === "tenure" ? "Tenure reduced" : "EMI reduced"}`,
        amount: event.amount,
        method: event.mode || undefined,
      });
    } else if (event.event_type === "foreclosure") {
      history.push({
        id: event.id,
        type: "foreclosure",
        date: event.event_date,
        title: "Loan Foreclosed",
        description: `Interest saved: ${formatCurrency(event.interest_saved || 0, currency)}`,
        amount: event.amount,
        method: event.mode || undefined,
      });
    }
  });

  // Add paid EMIs
  paidEmis.forEach((emi) => {
    if (emi.paid_date) {
      history.push({
        id: emi.id,
        type: "emi_paid",
        date: emi.paid_date,
        title: `EMI #${emi.emi_month} Paid`,
        description: `Principal: ${formatCurrency(emi.principal_component, currency)} | Interest: ${formatCurrency(emi.interest_component, currency)}`,
        amount: emi.emi_amount,
        method: emi.payment_method || undefined,
      });
    }
  });

  // Add documents
  documents.forEach((doc) => {
    history.push({
      id: doc.id,
      type: "document_uploaded",
      date: doc.uploaded_at,
      title: "Document Uploaded",
      description: `${doc.document_type}: ${doc.file_name}`,
    });
  });

  // Sort by date descending
  history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const getEventIcon = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "loan_created":
        return <Plus className="w-4 h-4" />;
      case "emi_paid":
        return <CheckCircle className="w-4 h-4" />;
      case "part_payment":
        return <ArrowDownCircle className="w-4 h-4" />;
      case "foreclosure":
        return <XCircle className="w-4 h-4" />;
      case "document_uploaded":
        return <FileText className="w-4 h-4" />;
      case "loan_updated":
        return <Edit2 className="w-4 h-4" />;
      default:
        return <CreditCard className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: HistoryEvent["type"]) => {
    switch (type) {
      case "loan_created":
        return "bg-primary/20 text-primary";
      case "emi_paid":
        return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400";
      case "part_payment":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
      case "foreclosure":
        return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
      case "document_uploaded":
        return "bg-slate-500/20 text-slate-600 dark:text-slate-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  return (
    <div className="space-y-4">
      {history.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground bg-card border border-border rounded-lg">
          No activity recorded yet
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-2 bottom-2 w-px bg-border" />

          <div className="space-y-4">
            {history.map((event) => (
              <div key={event.id} className="flex gap-4 relative">
                {/* Icon */}
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    getEventColor(event.type)
                  )}
                >
                  {getEventIcon(event.type)}
                </div>

                {/* Content */}
                <div className="flex-1 bg-card border border-border rounded-lg p-4 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{event.title}</p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {event.description}
                        </p>
                      )}
                    </div>
                    {event.amount && (
                      <p className="text-sm font-medium flex-shrink-0">
                        {formatCurrency(event.amount, currency)}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{format(parseISO(event.date), "MMM d, yyyy h:mm a")}</span>
                    {event.method && (
                      <span className="px-1.5 py-0.5 bg-muted rounded">{event.method}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
