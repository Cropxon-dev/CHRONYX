import { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";
import { LeftSketchAnimation, RightSketchAnimation, FloatingParticles } from "@/components/auth/LoginAnimations";
import { motion } from "framer-motion";

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, signInWithGoogle, user, loading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  // Get the intended destination from state, or default to /app
  const from = (location.state as { from?: string })?.from || "/app";

  useEffect(() => {
    if (!loading && user) {
      // Navigate to the intended destination after login
      navigate(from, { replace: true });
    }
  }, [user, loading, navigate, from]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password);
        if (error) {
          if (error.message.includes("already registered")) {
            toast({
              title: "Account exists",
              description: "This email is already registered. Please sign in instead.",
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sign up failed",
              description: error.message,
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Welcome to CHRONYX",
            description: "Your account has been created. But Before SignIn Please Check your Mail Inbox/spam and verify the link to login",
          });
          navigate(from, { replace: true });
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast({
            title: "Sign in failed",
            description: "Invalid email or password.",
            variant: "destructive",
          });
        } else {
          navigate(from, { replace: true });
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast({
          title: "Google sign in failed",
          description: error.message,
          variant: "destructive",
        });
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen vyom-gradient-bg flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </main>
    );
  }

  return (
    <motion.main 
      className="min-h-screen vyom-gradient-bg flex items-center justify-center px-4 sm:px-6 relative overflow-hidden"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      {/* Floating Particles Background */}
      <FloatingParticles />
      
      <div className="w-full max-w-5xl flex items-center justify-center gap-8 relative z-10">
        {/* Left Animation */}
        <LeftSketchAnimation />
        
        <div className="w-full max-w-sm">
        {/* Back Link */}
        <Link 
          to="/" 
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 sm:mb-12"
        >
          ← Back
        </Link>

        {/* Login Card with Glow Effect */}
        <motion.div 
          className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-sm relative"
          animate={{
            boxShadow: [
              "0 0 20px 0px hsl(var(--primary) / 0.05)",
              "0 0 40px 5px hsl(var(--primary) / 0.1)",
              "0 0 20px 0px hsl(var(--primary) / 0.05)",
            ],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            {/* Pulsing Logo */}
            <motion.div
              className="mx-auto mb-3 w-10 h-10 sm:w-12 sm:h-12"
              animate={{
                scale: [1, 1.05, 1],
                opacity: [0.8, 1, 0.8],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
                <defs>
                  <linearGradient id="login-logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="hsl(var(--primary))" />
                    <stop offset="100%" stopColor="hsl(var(--primary) / 0.6)" />
                  </linearGradient>
                </defs>
                <circle cx="50" cy="50" r="45" stroke="url(#login-logo-gradient)" strokeWidth="2" fill="none" className="opacity-80" />
                <circle cx="50" cy="50" r="35" stroke="hsl(var(--primary))" strokeWidth="1" strokeDasharray="6 4" fill="none" className="opacity-40" />
                <circle cx="50" cy="50" r="5" fill="hsl(var(--primary))" className="opacity-90" />
                {[0, 90, 180, 270].map((angle, i) => (
                  <circle 
                    key={i}
                    cx={50 + 40 * Math.cos((angle - 90) * Math.PI / 180)}
                    cy={50 + 40 * Math.sin((angle - 90) * Math.PI / 180)}
                    r="2"
                    fill="hsl(var(--primary))"
                    className="opacity-50"
                  />
                ))}
              </svg>
            </motion.div>
            <h1 className="text-xl sm:text-2xl font-light tracking-[0.2em] text-foreground mb-2 sm:mb-3">
              CHRONYX
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              This space is private.
            </p>
          </div>

          {/* Google Sign In Button */}
          <Button
            type="button"
            variant="outline"
            className="w-full h-10 sm:h-11 mb-4 sm:mb-6 gap-2"
            onClick={handleGoogleSignIn}
            disabled={isGoogleLoading}
          >
            <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isGoogleLoading ? "Connecting..." : "Continue with Google"}
          </Button>

          <div className="relative mb-4 sm:mb-6">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="h-10 sm:h-11 bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="h-10 sm:h-11 bg-background"
              />
            </div>

            <Button 
              type="submit" 
              variant="vyom-primary"
              className="w-full h-10 sm:h-11 mt-4 sm:mt-6"
              disabled={isLoading}
            >
              {isLoading ? "Please wait..." : isSignUp ? "Create Account" : "Enter"}
            </Button>
          </form>

          {/* Toggle */}
          <div className="mt-4 sm:mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {isSignUp ? "Already have an account? Sign in" : "New here? Create an account"}
            </button>
          </div>
        </motion.div>

        {/* Google OAuth Setup Note */}
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Note: Google sign-in requires OAuth configuration.
        </p>
        </div>
        
        {/* Right Animation */}
        <RightSketchAnimation />
      </div>
    </motion.main>
  );
};

export default Login;
