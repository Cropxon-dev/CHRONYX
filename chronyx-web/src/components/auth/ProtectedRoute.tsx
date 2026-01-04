import { ReactNode, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface ProtectedRouteProps {
  children: ReactNode;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading, session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Wait for auth to fully load before making any decisions
    if (loading) return;

    // If no user/session after loading, redirect to login
    if (!user && !session) {
      // Store the intended destination for redirect after login
      const currentPath = location.pathname + location.search;
      navigate("/login", { 
        replace: true,
        state: { from: currentPath }
      });
    } else {
      // User is authenticated, ready to render
      setIsReady(true);
    }
  }, [user, session, loading, navigate, location]);

  // Show loading state while auth is being checked
  if (loading || (!isReady && !user)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  // Don't render children if not authenticated
  if (!user) {
    return null;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
