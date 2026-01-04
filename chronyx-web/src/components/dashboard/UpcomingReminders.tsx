import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { format, addDays, isBefore, isAfter } from "date-fns";
import { Wallet, Shield, Calendar, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface Reminder {
  id: string;
  type: "emi" | "insurance";
  title: string;
  dueDate: Date;
  amount: number;
  daysUntil: number;
}

const UpcomingReminders = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchReminders();
    }
  }, [user]);

  const fetchReminders = async () => {
    if (!user) return;

    const today = new Date();
    const nextWeek = addDays(today, 7);
    const todayStr = format(today, "yyyy-MM-dd");
    const nextWeekStr = format(nextWeek, "yyyy-MM-dd");

    try {
      // Fetch upcoming EMIs
      const { data: emiData } = await supabase
        .from("emi_schedule")
        .select(`
          id,
          emi_date,
          emi_amount,
          loan_id,
          loans!inner(bank_name, loan_type, user_id)
        `)
        .eq("payment_status", "Pending")
        .gte("emi_date", todayStr)
        .lte("emi_date", nextWeekStr)
        .order("emi_date", { ascending: true });

      // Fetch upcoming insurance renewals
      const { data: insuranceData } = await supabase
        .from("insurances")
        .select("id, policy_name, renewal_date, premium_amount")
        .eq("user_id", user.id)
        .eq("status", "active")
        .gte("renewal_date", todayStr)
        .lte("renewal_date", nextWeekStr)
        .order("renewal_date", { ascending: true });

      const allReminders: Reminder[] = [];

      // Process EMI reminders
      if (emiData) {
        emiData.forEach((emi: any) => {
          const dueDate = new Date(emi.emi_date);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          allReminders.push({
            id: emi.id,
            type: "emi",
            title: `${emi.loans.bank_name} - ${emi.loans.loan_type}`,
            dueDate,
            amount: emi.emi_amount,
            daysUntil,
          });
        });
      }

      // Process insurance reminders
      if (insuranceData) {
        insuranceData.forEach((insurance) => {
          const dueDate = new Date(insurance.renewal_date);
          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          allReminders.push({
            id: insurance.id,
            type: "insurance",
            title: insurance.policy_name,
            dueDate,
            amount: insurance.premium_amount,
            daysUntil,
          });
        });
      }

      // Sort by due date
      allReminders.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
      setReminders(allReminders);
    } catch (error) {
      console.error("Error fetching reminders:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysLabel = (days: number) => {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    return `${days} days`;
  };

  const getDaysBadgeVariant = (days: number) => {
    if (days <= 1) return "destructive";
    if (days <= 3) return "secondary";
    return "outline";
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Upcoming (7 Days)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calendar className="w-4 h-4" />
          Upcoming (7 Days)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <div className="text-sm text-muted-foreground flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            No upcoming payments
          </div>
        ) : (
          <div className="space-y-3">
            {reminders.slice(0, 5).map((reminder) => (
              <Link
                key={`${reminder.type}-${reminder.id}`}
                to={reminder.type === "emi" ? "/app/loans" : "/app/insurance"}
                className="flex items-center justify-between p-2 rounded-md hover:bg-muted/50 transition-colors -mx-2"
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded ${reminder.type === "emi" ? "bg-blue-500/10 text-blue-500" : "bg-green-500/10 text-green-500"}`}>
                    {reminder.type === "emi" ? (
                      <Wallet className="w-3.5 h-3.5" />
                    ) : (
                      <Shield className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground line-clamp-1">
                      {reminder.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      ₹{reminder.amount.toLocaleString()}
                    </p>
                  </div>
                </div>
                <Badge variant={getDaysBadgeVariant(reminder.daysUntil)} className="text-xs">
                  {getDaysLabel(reminder.daysUntil)}
                </Badge>
              </Link>
            ))}
            {reminders.length > 5 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                +{reminders.length - 5} more
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingReminders;
