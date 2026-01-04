import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Bell, Loader2, Mail, CheckCircle, AlertCircle } from "lucide-react";

const TestReminderButtons = () => {
  const [testingEmi, setTestingEmi] = useState(false);
  const [testingInsurance, setTestingInsurance] = useState(false);
  const [emiResult, setEmiResult] = useState<{ success: boolean; message: string } | null>(null);
  const [insuranceResult, setInsuranceResult] = useState<{ success: boolean; message: string } | null>(null);

  const testEmiReminders = async () => {
    setTestingEmi(true);
    setEmiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-emi-reminders');
      
      if (error) throw error;
      
      setEmiResult({ 
        success: true, 
        message: `Sent ${data?.emailsSent || 0} EMI reminder(s)` 
      });
      toast.success("EMI reminder test completed");
    } catch (error: any) {
      console.error("EMI reminder test error:", error);
      setEmiResult({ 
        success: false, 
        message: error.message || "Failed to send EMI reminders" 
      });
      toast.error("EMI reminder test failed");
    } finally {
      setTestingEmi(false);
    }
  };

  const testInsuranceReminders = async () => {
    setTestingInsurance(true);
    setInsuranceResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('send-insurance-reminders');
      
      if (error) throw error;
      
      setInsuranceResult({ 
        success: true, 
        message: `Sent ${data?.emailsSent || 0} insurance reminder(s)` 
      });
      toast.success("Insurance reminder test completed");
    } catch (error: any) {
      console.error("Insurance reminder test error:", error);
      setInsuranceResult({ 
        success: false, 
        message: error.message || "Failed to send insurance reminders" 
      });
      toast.error("Insurance reminder test failed");
    } finally {
      setTestingInsurance(false);
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5" />
          Test Email Reminders
        </CardTitle>
        <CardDescription>
          Manually trigger reminder emails to verify the setup works correctly
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 space-y-2">
            <Button
              onClick={testEmiReminders}
              disabled={testingEmi}
              variant="outline"
              className="w-full"
            >
              {testingEmi ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Test EMI Reminders
            </Button>
            {emiResult && (
              <div className={`flex items-center gap-2 text-sm ${emiResult.success ? 'text-green-600' : 'text-destructive'}`}>
                {emiResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {emiResult.message}
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <Button
              onClick={testInsuranceReminders}
              disabled={testingInsurance}
              variant="outline"
              className="w-full"
            >
              {testingInsurance ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Test Insurance Reminders
            </Button>
            {insuranceResult && (
              <div className={`flex items-center gap-2 text-sm ${insuranceResult.success ? 'text-green-600' : 'text-destructive'}`}>
                {insuranceResult.success ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {insuranceResult.message}
              </div>
            )}
          </div>
        </div>
        
        <p className="text-xs text-muted-foreground">
          Note: Emails will only be sent if there are upcoming EMIs (within 3 days) or insurance renewals matching your reminder settings.
        </p>
      </CardContent>
    </Card>
  );
};

export default TestReminderButtons;