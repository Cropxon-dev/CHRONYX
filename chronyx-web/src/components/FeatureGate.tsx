import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Crown, Sparkles } from 'lucide-react';
import { useFeatureGate, Feature } from '@/hooks/useFeatureGate';
import { Button } from '@/components/ui/button';

interface FeatureGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
  showUpgradePrompt?: boolean;
}

export const FeatureGate = ({ 
  feature, 
  children, 
  fallback,
  showUpgradePrompt = true 
}: FeatureGateProps) => {
  const { canAccessFeature, getRequiredPlan, loading } = useFeatureGate();

  if (loading) {
    return <div className="animate-pulse bg-muted/30 rounded-lg h-20" />;
  }

  if (canAccessFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showUpgradePrompt) {
    return null;
  }

  const requiredPlan = getRequiredPlan(feature);
  const Icon = requiredPlan === 'premium' ? Crown : Sparkles;

  return (
    <div className="relative overflow-hidden rounded-lg border border-dashed border-muted-foreground/30 bg-muted/10 p-6">
      {/* Blur overlay effect */}
      <div className="absolute inset-0 backdrop-blur-[2px] bg-background/60 flex items-center justify-center z-10">
        <div className="text-center p-4">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="w-5 h-5 text-primary" />
          </div>
          <p className="text-sm font-medium text-foreground mb-1">
            {requiredPlan === 'premium' ? 'Premium' : 'Pro'} Feature
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Upgrade to unlock this feature
          </p>
          <Link to="/pricing">
            <Button size="sm" className="gap-2">
              <Icon className="w-3.5 h-3.5" />
              Upgrade to {requiredPlan === 'premium' ? 'Premium' : 'Pro'}
            </Button>
          </Link>
        </div>
      </div>

      {/* Blurred content preview */}
      <div className="opacity-30 blur-sm pointer-events-none">
        {children}
      </div>
    </div>
  );
};

// HOC for wrapping entire components
export function withFeatureGate<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  feature: Feature
) {
  return function FeatureGatedComponent(props: P) {
    return (
      <FeatureGate feature={feature}>
        <WrappedComponent {...props} />
      </FeatureGate>
    );
  };
}

// Badge component for showing feature availability
export const FeatureBadge = ({ feature }: { feature: Feature }) => {
  const { getRequiredPlan } = useFeatureGate();
  const requiredPlan = getRequiredPlan(feature);
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
      requiredPlan === 'premium' 
        ? 'bg-amber-500/20 text-amber-600' 
        : 'bg-primary/20 text-primary'
    }`}>
      {requiredPlan === 'premium' ? (
        <Crown className="w-3 h-3" />
      ) : (
        <Sparkles className="w-3 h-3" />
      )}
      {requiredPlan === 'premium' ? 'Premium' : 'Pro'}
    </span>
  );
};
