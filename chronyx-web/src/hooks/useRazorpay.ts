import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => void;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: {
    color?: string;
  };
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, callback: () => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface PlanConfig {
  pro: { amount: number; description: string };
  premium: { amount: number; description: string };
}

const PLAN_CONFIG: PlanConfig = {
  pro: {
    amount: 299, // INR per month
    description: "CHRONYX Pro - Monthly Subscription",
  },
  premium: {
    amount: 1999, // INR one-time
    description: "CHRONYX Premium - Lifetime Access",
  },
};

export const useRazorpay = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const loadRazorpayScript = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }, []);

  const initiatePayment = useCallback(
    async (plan: "pro" | "premium", userDetails?: { name?: string; email?: string; phone?: string }) => {
      setIsLoading(true);

      try {
        // Load Razorpay script
        const scriptLoaded = await loadRazorpayScript();
        if (!scriptLoaded) {
          throw new Error("Failed to load payment gateway");
        }

        const planConfig = PLAN_CONFIG[plan];

        // Create order via edge function
        const { data: orderData, error: orderError } = await supabase.functions.invoke(
          "create-razorpay-order",
          {
            body: {
              amount: planConfig.amount,
              plan,
              currency: "INR",
            },
          }
        );

        if (orderError || !orderData) {
          throw new Error(orderError?.message || "Failed to create order");
        }

        const { orderId, keyId, amount, currency } = orderData;

        // Get current user
        const { data: { user } } = await supabase.auth.getUser();

        return new Promise<{ success: boolean; paymentId?: string; razorpay_order_id?: string; razorpay_payment_id?: string; razorpay_signature?: string }>((resolve) => {
          const options: RazorpayOptions = {
            key: keyId,
            amount: amount,
            currency: currency,
            name: "CHRONYX by CROPXON",
            description: planConfig.description,
            order_id: orderId,
            handler: async (response: RazorpayResponse) => {
              try {
                // Verify payment
                const { data: verifyData, error: verifyError } = await supabase.functions.invoke(
                  "verify-razorpay-payment",
                  {
                    body: {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                      plan,
                      userId: user?.id,
                    },
                  }
                );

                if (verifyError || !verifyData?.verified) {
                  toast({
                    title: "Payment Verification Failed",
                    description: "Please contact support if amount was deducted.",
                    variant: "destructive",
                  });
                  resolve({ success: false });
                  return;
                }

                toast({
                  title: "Payment Successful!",
                  description: `Welcome to CHRONYX ${plan === "pro" ? "Pro" : "Premium"}!`,
                });
                resolve({ 
                  success: true, 
                  paymentId: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature
                });
              } catch (error) {
                console.error("Verification error:", error);
                resolve({ success: false });
              }
            },
            prefill: {
              name: userDetails?.name || "",
              email: userDetails?.email || user?.email || "",
              contact: userDetails?.phone || "",
            },
            theme: {
              color: "#6366f1",
            },
          };

          const rzp = new window.Razorpay(options);
          rzp.on("payment.failed", () => {
            toast({
              title: "Payment Failed",
              description: "Please try again or use a different payment method.",
              variant: "destructive",
            });
            resolve({ success: false });
          });
          rzp.open();
        });
      } catch (error) {
        console.error("Payment initiation error:", error);
        toast({
          title: "Payment Error",
          description: error instanceof Error ? error.message : "Failed to initiate payment",
          variant: "destructive",
        });
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [loadRazorpayScript, toast]
  );

  return {
    initiatePayment,
    isLoading,
    planConfig: PLAN_CONFIG,
  };
};
