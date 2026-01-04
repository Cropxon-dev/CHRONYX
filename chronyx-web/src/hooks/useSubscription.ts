import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'free' | 'pro' | 'premium';
  status: 'active' | 'cancelled' | 'expired' | 'pending';
  razorpay_order_id: string | null;
  razorpay_payment_id: string | null;
  amount_paid: number;
  currency: string;
  payment_method: string | null;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentHistory {
  id: string;
  user_id: string;
  subscription_id: string | null;
  razorpay_order_id: string;
  razorpay_payment_id: string | null;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  plan_type: string;
  receipt_sent: boolean;
  receipt_sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSubscription(data as Subscription | null);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!user) {
      setPaymentHistory([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory((data as PaymentHistory[]) || []);
    } catch (error) {
      console.error('Error fetching payment history:', error);
    }
  };

  const createSubscription = async (
    planType: 'pro' | 'premium',
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    amountPaid: number
  ) => {
    if (!user) return null;

    try {
      // Create subscription
      const { data: sub, error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          plan_type: planType,
          status: 'active',
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          amount_paid: amountPaid,
          expires_at: planType === 'premium' ? null : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (subError) throw subError;

      // Create payment history record
      const { error: historyError } = await supabase
        .from('payment_history')
        .insert({
          user_id: user.id,
          subscription_id: sub.id,
          razorpay_order_id: razorpayOrderId,
          razorpay_payment_id: razorpayPaymentId,
          razorpay_signature: razorpaySignature,
          amount: amountPaid,
          status: 'success',
          plan_type: planType,
        });

      if (historyError) throw historyError;

      await fetchSubscription();
      await fetchPaymentHistory();

      return sub;
    } catch (error) {
      console.error('Error creating subscription:', error);
      return null;
    }
  };

  const getCurrentPlan = (): 'free' | 'pro' | 'premium' => {
    if (!subscription || subscription.status !== 'active') return 'free';
    return subscription.plan_type;
  };

  const isPro = () => {
    const plan = getCurrentPlan();
    return plan === 'pro' || plan === 'premium';
  };

  const isPremium = () => {
    return getCurrentPlan() === 'premium';
  };

  useEffect(() => {
    fetchSubscription();
    fetchPaymentHistory();
  }, [user]);

  return {
    subscription,
    paymentHistory,
    loading,
    createSubscription,
    getCurrentPlan,
    isPro,
    isPremium,
    refetch: () => {
      fetchSubscription();
      fetchPaymentHistory();
    },
  };
};
