import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {  Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AnimatePresence, motion } from "framer-motion";
import { OfflineIndicator } from "@/components/pwa/OfflineIndicator";
import { PWAUpdater } from "@/components/pwa/PWAUpdater";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Refund from "./pages/Refund";
import Pricing from "./pages/Pricing";
import About from "./pages/About";
import AppLayout from "./components/layout/AppLayout";
import Dashboard from "./pages/app/Dashboard";
import Todos from "./pages/app/Todos";
import Study from "./pages/app/Study";
import Loans from "./pages/app/Loans";
import Insurance from "./pages/app/Insurance";
import Expenses from "./pages/app/Expenses";
import Income from "./pages/app/Income";
import Reports from "./pages/app/Reports";
import Lifespan from "./pages/app/Lifespan";
import Achievements from "./pages/app/Achievements";
import Activity from "./pages/app/Activity";
import Settings from "./pages/app/Settings";
import Profile from "./pages/app/Profile";
import Memory from "./pages/app/Memory";
import MemoryTimeline from "./pages/app/MemoryTimeline";
import Search from "./pages/app/Search";
import Backup from "./pages/app/Backup";
import Documents from "./pages/app/Documents";
import Social from "./pages/app/Social";
import NotFound from "./pages/NotFound";
import AuthCallback from "./pages/auth/AuthCallback";


const queryClient = new QueryClient();

const pageTransition = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.3 }
};

const AnimatedRoutes = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route 
          path="/" 
          element={
            <motion.div {...pageTransition}>
              <Landing />
            </motion.div>
          } 
        />
        <Route 
          path="/login" 
          element={
            <motion.div {...pageTransition}>
              <Login />
            </motion.div>
          } 
        />
        {/* 👇 ADD THIS */}
        <Route 
          path="/auth/callback"
          element={
            <motion.div {...pageTransition}>
              <AuthCallback />
            </motion.div>
          }
        />
        <Route 
          path="/privacy" 
          element={
            <motion.div {...pageTransition}>
              <Privacy />
            </motion.div>
          } 
        />
        <Route 
          path="/terms" 
          element={
            <motion.div {...pageTransition}>
              <Terms />
            </motion.div>
          } 
        />
        <Route 
          path="/refund" 
          element={
            <motion.div {...pageTransition}>
              <Refund />
            </motion.div>
          } 
        />
        <Route 
          path="/pricing" 
          element={
            <motion.div {...pageTransition}>
              <Pricing />
            </motion.div>
          } 
        />
        <Route 
          path="/about" 
          element={
            <motion.div {...pageTransition}>
              <About />
            </motion.div>
          } 
        />
        <Route path="/app" element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="todos" element={<Todos />} />
          <Route path="study" element={<Study />} />
          <Route path="loans" element={<Loans />} />
          <Route path="insurance" element={<Insurance />} />
          <Route path="expenses" element={<Expenses />} />
          <Route path="income" element={<Income />} />
          <Route path="reports" element={<Reports />} />
          <Route path="lifespan" element={<Lifespan />} />
          <Route path="achievements" element={<Achievements />} />
          <Route path="activity" element={<Activity />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<Profile />} />
          <Route path="memory" element={<Memory />} />
          <Route path="memory/timeline" element={<MemoryTimeline />} />
          <Route path="search" element={<Search />} />
          <Route path="backup" element={<Backup />} />
          <Route path="documents" element={<Documents />} />
          <Route path="social" element={<Social />} />
        </Route>
        <Route 
          path="*" 
          element={
            <motion.div {...pageTransition}>
              <NotFound />
            </motion.div>
          } 
        />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <OfflineIndicator />
          <PWAUpdater />
          <AnimatedRoutes />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
