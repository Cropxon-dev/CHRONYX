import { useAuth } from "@/contexts/AuthContext";
import { useSubscription, PaymentHistory } from "@/hooks/useSubscription";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Crown, Sparkles, User, CreditCard, Calendar, CheckCircle2, XCircle, Clock, RefreshCw, Download, FileText } from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { jsPDF } from "jspdf";
import { toast } from "sonner";

const Profile = () => {
  const { user } = useAuth();
  const { subscription, paymentHistory, loading, getCurrentPlan, isPro, isPremium } = useSubscription();
  const navigate = useNavigate();

  const getPlanIcon = () => {
    const plan = getCurrentPlan();
    if (plan === 'premium') return <Crown className="h-5 w-5 text-amber-500" />;
    if (plan === 'pro') return <Sparkles className="h-5 w-5 text-primary" />;
    return <User className="h-5 w-5 text-muted-foreground" />;
  };

  const getPlanBadgeVariant = () => {
    const plan = getCurrentPlan();
    if (plan === 'premium') return 'default';
    if (plan === 'pro') return 'secondary';
    return 'outline';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-amber-500" />;
      case 'refunded':
        return <RefreshCw className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
    }).format(amount);
  };

  const generateInvoice = (payment: PaymentHistory) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      
      // Header
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("CHRONYX", 20, 30);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text("Invoice", pageWidth - 40, 30);
      
      // Invoice details box
      doc.setFontSize(10);
      doc.text(`Invoice No: INV-${payment.razorpay_order_id?.slice(-8).toUpperCase() || payment.id.slice(0, 8).toUpperCase()}`, 20, 50);
      doc.text(`Date: ${format(new Date(payment.created_at), 'MMMM d, yyyy')}`, 20, 57);
      doc.text(`Payment ID: ${payment.razorpay_payment_id || 'N/A'}`, 20, 64);
      
      // Customer details
      doc.setFont("helvetica", "bold");
      doc.text("Bill To:", 20, 80);
      doc.setFont("helvetica", "normal");
      doc.text(user?.email || 'Customer', 20, 88);
      doc.text(`User ID: ${user?.id?.slice(0, 8)}...`, 20, 95);
      
      // Table header
      const tableTop = 115;
      doc.setFillColor(240, 240, 240);
      doc.rect(20, tableTop - 5, pageWidth - 40, 10, 'F');
      doc.setFont("helvetica", "bold");
      doc.text("Description", 25, tableTop);
      doc.text("Amount", pageWidth - 50, tableTop);
      
      // Table content
      doc.setFont("helvetica", "normal");
      const planName = payment.plan_type.charAt(0).toUpperCase() + payment.plan_type.slice(1);
      doc.text(`CHRONYX ${planName} Plan - Monthly Subscription`, 25, tableTop + 15);
      doc.text(formatAmount(payment.amount, payment.currency), pageWidth - 50, tableTop + 15);
      
      // Total
      doc.line(20, tableTop + 25, pageWidth - 20, tableTop + 25);
      doc.setFont("helvetica", "bold");
      doc.text("Total", 25, tableTop + 35);
      doc.text(formatAmount(payment.amount, payment.currency), pageWidth - 50, tableTop + 35);
      
      // Payment status
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const statusText = payment.status === 'success' ? 'PAID' : payment.status.toUpperCase();
      doc.text(`Status: ${statusText}`, 20, tableTop + 55);
      
      // Footer
      doc.setFontSize(8);
      doc.text("Thank you for your purchase!", pageWidth / 2, 250, { align: 'center' });
      doc.text("For support, contact support@chronyx.app", pageWidth / 2, 257, { align: 'center' });
      doc.text("This is a computer-generated invoice.", pageWidth / 2, 264, { align: 'center' });
      
      // Save
      const fileName = `CHRONYX-Invoice-${format(new Date(payment.created_at), 'yyyy-MM-dd')}.pdf`;
      doc.save(fileName);
      
      toast.success("Invoice downloaded successfully");
    } catch (error) {
      console.error("Error generating invoice:", error);
      toast.error("Failed to generate invoice");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-6 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Profile</h1>
        <Button variant="outline" onClick={() => navigate('/app/settings')}>
          Edit Settings
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{user?.email || 'Not available'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">User ID</p>
              <p className="font-mono text-xs text-muted-foreground">{user?.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Member Since</p>
              <p className="font-medium">
                {user?.created_at ? format(new Date(user.created_at), 'MMMM d, yyyy') : 'N/A'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getPlanIcon()}
              Subscription Status
            </CardTitle>
            <CardDescription>Your current plan and benefits</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current Plan</span>
              <Badge variant={getPlanBadgeVariant()} className="capitalize">
                {getCurrentPlan()}
              </Badge>
            </div>

            {subscription && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant={subscription.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                      {subscription.status}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Started</span>
                    <span>{format(new Date(subscription.started_at), 'MMM d, yyyy')}</span>
                  </div>
                  {subscription.expires_at && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Expires</span>
                      <span>{format(new Date(subscription.expires_at), 'MMM d, yyyy')}</span>
                    </div>
                  )}
                  {!subscription.expires_at && getCurrentPlan() === 'premium' && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Validity</span>
                      <Badge variant="outline" className="text-green-600">Lifetime</Badge>
                    </div>
                  )}
                </div>
              </>
            )}

            {!isPro() && !isPremium() && (
              <Button className="w-full mt-4" onClick={() => navigate('/pricing')}>
                Upgrade to Pro
              </Button>
            )}
            {isPro() && !isPremium() && (
              <Button className="w-full mt-4" variant="outline" onClick={() => navigate('/pricing')}>
                Upgrade to Premium
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Plan Features */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Your Plan Features
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium text-green-600">✓ Included</h4>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Expense tracking</li>
                <li>• Income management</li>
                <li>• Basic reports</li>
                <li>• Study tracker</li>
                <li>• Todo management</li>
              </ul>
            </div>
            {isPro() && (
              <div className="space-y-2">
                <h4 className="font-medium text-primary">✓ Pro Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Extra memory storage</li>
                  <li>• Financial insights</li>
                  <li>• Tax savings tools</li>
                  <li>• Advanced analytics</li>
                  <li>• Priority support</li>
                </ul>
              </div>
            )}
            {isPremium() && (
              <div className="space-y-2">
                <h4 className="font-medium text-amber-600">✓ Premium Features</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• Lifetime access</li>
                  <li>• Unlimited storage</li>
                  <li>• Early access to features</li>
                  <li>• Dedicated support</li>
                  <li>• All future updates</li>
                </ul>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment History
          </CardTitle>
          <CardDescription>Your transaction records</CardDescription>
        </CardHeader>
        <CardContent>
          {paymentHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No payment history yet</p>
              <p className="text-sm">Your transactions will appear here</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Receipt</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paymentHistory.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {payment.plan_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(payment.amount, payment.currency)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(payment.status)}
                        <span className="capitalize">{payment.status}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => generateInvoice(payment)}
                        className="h-8 px-2"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Invoice
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
