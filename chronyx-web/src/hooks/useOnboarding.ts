import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const ONBOARDING_KEY = "chronyx_onboarding_complete";

export const useOnboarding = () => {
  const { user } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }

      try {
        // Check local storage first for quick response
        const localComplete = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
        if (localComplete === "true") {
          setShowOnboarding(false);
          setIsLoading(false);
          return;
        }

        // Check if user has any data (indicating they've used the app before)
        const [todosResult, expensesResult, profileResult] = await Promise.all([
          supabase.from("todos").select("id").eq("user_id", user.id).limit(1),
          supabase.from("expenses").select("id").eq("user_id", user.id).limit(1),
          supabase.from("profiles").select("display_name").eq("id", user.id).single()
        ]);

        const hasData = 
          (todosResult.data && todosResult.data.length > 0) ||
          (expensesResult.data && expensesResult.data.length > 0) ||
          (profileResult.data?.display_name);

        if (hasData) {
          // User has data, mark onboarding as complete
          localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
          setShowOnboarding(false);
        } else {
          // New user, show onboarding
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error("Error checking onboarding status:", error);
        setShowOnboarding(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  const completeOnboarding = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, "true");
    }
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    if (user) {
      localStorage.removeItem(`${ONBOARDING_KEY}_${user.id}`);
    }
    setShowOnboarding(true);
  };

  return {
    showOnboarding,
    isLoading,
    completeOnboarding,
    resetOnboarding
  };
};
