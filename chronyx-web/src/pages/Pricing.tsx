import { Link } from "react-router-dom";
import { ArrowLeft, Check, Sparkles, Crown, Zap, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useRazorpay } from "@/hooks/useRazorpay";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";

const Pricing = () => {
  const { initiatePayment, isLoading } = useRazorpay();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createSubscription, getCurrentPlan, refetch } = useSubscription();

  const currentPlan = getCurrentPlan();

  const handlePlanSelect = async (planType: "free" | "pro" | "premium") => {
    if (planType === "free") {
      navigate("/login");
      return;
    }

    if (!user) {
      navigate("/login");
      return;
    }

    // Check if already on this plan or higher
    if (currentPlan === planType) {
      toast.info(`You're already on the ${planType} plan`);
      return;
    }

    if (currentPlan === 'premium') {
      toast.info("You already have lifetime Premium access!");
      return;
    }

    const result = await initiatePayment(planType);
    
    if (result?.success && result.razorpay_order_id && result.razorpay_payment_id && result.razorpay_signature) {
      // Payment was successful, create subscription record
      await createSubscription(
        planType,
        result.razorpay_order_id,
        result.razorpay_payment_id,
        result.razorpay_signature,
        planType === 'pro' ? 29900 : 199900
      );
      
      refetch();
      toast.success(`Welcome to ${planType === 'pro' ? 'Pro' : 'Premium'}!`);
      navigate('/app/profile');
    }
  };

  const plans = [
    {
      name: "Free",
      price: "₹0",
      period: "forever",
      description: "Everything you need to get started",
      icon: Zap,
      highlight: false,
      planType: "free" as const,
      features: [
        "Unlimited tasks & todos",
        "Study syllabus tracking",
        "Expense & income tracking",
        "Loan EMI management",
        "Insurance policy tracking",
        "2GB memory storage",
        "Basic reports & insights",
        "Data export (JSON/PDF)",
        "Email support",
      ],
      cta: "Get Started Free",
    },
    {
      name: "Pro",
      price: "₹299",
      period: "/month",
      description: "Enhanced features for serious users",
      icon: Sparkles,
      highlight: true,
      popular: true,
      planType: "pro" as const,
      features: [
        "Everything in Free, plus:",
        "10GB memory storage",
        "Advanced financial analytics",
        "Tax savings calculator",
        "CA-free tax insights",
        "Priority reminders",
        "Advanced reports",
        "Priority email support",
        "Early access to new features",
      ],
      cta: "Upgrade to Pro",
    },
    {
      name: "Premium",
      price: "₹1,999",
      period: "one-time",
      description: "Lifetime access with all features",
      icon: Crown,
      highlight: false,
      lifetime: true,
      planType: "premium" as const,
      features: [
        "Everything in Pro, plus:",
        "Unlimited storage",
        "Advanced AI insights",
        "Custom integrations",
        "White-glove onboarding",
        "Lifetime updates",
        "Early access to all releases",
        "Private Discord access",
        "Direct founder support",
      ],
      cta: "Get Lifetime Access",
    },
  ];

  return (
    <motion.main
      className="min-h-screen bg-background"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Link>

        <div className="text-center mb-12">
          <h1 className="text-3xl sm:text-4xl font-light tracking-wide text-foreground mb-3">
            Simple, Honest Pricing
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Start free, upgrade when you need more. No hidden fees, no surprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`relative rounded-xl border p-6 ${
                  plan.highlight
                    ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                    : "border-border bg-card/50"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-medium rounded-full">
                    Most Popular
                  </div>
                )}
                
                {plan.lifetime && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-white text-xs font-medium rounded-full">
                    Best Value
                  </div>
                )}

                <div className="flex items-center gap-2 mb-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    plan.highlight ? "bg-primary/20" : "bg-muted"
                  }`}>
                    <Icon className={`w-5 h-5 ${plan.highlight ? "text-primary" : "text-muted-foreground"}`} />
                  </div>
                  <h2 className="text-xl font-medium text-foreground">{plan.name}</h2>
                </div>

                <div className="mb-4">
                  <span className="text-3xl font-light text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm ml-1">{plan.period}</span>
                </div>

                <p className="text-sm text-muted-foreground mb-6">{plan.description}</p>

                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                        plan.highlight ? "text-primary" : "text-muted-foreground"
                      }`} />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button 
                  className={`w-full ${
                    plan.highlight 
                      ? "" 
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                  variant={plan.highlight ? "default" : "secondary"}
                  onClick={() => handlePlanSelect(plan.planType)}
                  disabled={isLoading && plan.planType !== "free"}
                >
                  {isLoading && plan.planType !== "free" ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.cta
                  )}
                </Button>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <h3 className="text-lg font-medium text-foreground mb-3">Frequently Asked Questions</h3>
          <div className="max-w-2xl mx-auto space-y-4 text-left">
            <div className="p-4 rounded-lg bg-card/50 border border-border">
              <h4 className="font-medium text-foreground mb-1">Can I switch plans later?</h4>
              <p className="text-sm text-muted-foreground">Yes, you can upgrade or downgrade anytime. Upgrades are immediate, downgrades take effect at the next billing cycle.</p>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border border-border">
              <h4 className="font-medium text-foreground mb-1">Is my data safe?</h4>
              <p className="text-sm text-muted-foreground">Absolutely. We use end-to-end encryption and your data is never shared with third parties.</p>
            </div>
            <div className="p-4 rounded-lg bg-card/50 border border-border">
              <h4 className="font-medium text-foreground mb-1">What payment methods do you accept?</h4>
              <p className="text-sm text-muted-foreground">We accept UPI, credit/debit cards, net banking, and popular wallets through Razorpay.</p>
            </div>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-border text-center">
          <p className="text-xs text-muted-foreground/60">CHRONYX by CROPXON</p>
        </div>
      </div>
    </motion.main>
  );
};

export default Pricing;
