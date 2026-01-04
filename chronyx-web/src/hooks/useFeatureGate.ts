import { useSubscription } from './useSubscription';

export type Feature = 
  | 'advanced_analytics'
  | 'tax_calculator'
  | 'priority_reminders'
  | 'advanced_reports'
  | 'unlimited_storage'
  | 'ai_insights'
  | 'custom_integrations'
  | 'extended_storage';

// Feature to plan mapping
const FEATURE_REQUIREMENTS: Record<Feature, ('pro' | 'premium')[]> = {
  advanced_analytics: ['pro', 'premium'],
  tax_calculator: ['pro', 'premium'],
  priority_reminders: ['pro', 'premium'],
  advanced_reports: ['pro', 'premium'],
  extended_storage: ['pro', 'premium'],
  unlimited_storage: ['premium'],
  ai_insights: ['premium'],
  custom_integrations: ['premium'],
};

export const useFeatureGate = () => {
  const { getCurrentPlan, isPro, isPremium, loading } = useSubscription();

  const canAccessFeature = (feature: Feature): boolean => {
    const currentPlan = getCurrentPlan();
    const requiredPlans = FEATURE_REQUIREMENTS[feature];
    return requiredPlans.includes(currentPlan as 'pro' | 'premium');
  };

  const getRequiredPlan = (feature: Feature): 'pro' | 'premium' => {
    const requiredPlans = FEATURE_REQUIREMENTS[feature];
    return requiredPlans[0]; // Return the minimum required plan
  };

  const getUpgradeMessage = (feature: Feature): string => {
    const requiredPlan = getRequiredPlan(feature);
    return `This feature requires a ${requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} plan. Upgrade to unlock.`;
  };

  return {
    canAccessFeature,
    getRequiredPlan,
    getUpgradeMessage,
    isPro,
    isPremium,
    currentPlan: getCurrentPlan(),
    loading,
  };
};
