import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { SidebarQuickAdd } from "./SidebarQuickAdd";
import { SyncStatusIndicator } from "./SyncStatusIndicator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ChronyxMiniLogo } from "./ChronyxMiniLogo";
import {
  LayoutDashboard,
  CheckSquare,
  BookOpen,
  Wallet,
  Shield,
  Clock,
  Trophy,
  Activity,
  LogOut,
  Settings,
  Menu,
  X,
  Moon,
  Sun,
  Receipt,
  TrendingUp,
  ImageIcon,
  ChevronLeft,
  ChevronRight,
  Search,
  Mail,
  Phone,
  CheckCircle2,
  AlertCircle,
  User,
  FileText,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navItems = [
  { path: "/app", label: "Dashboard", icon: LayoutDashboard },
  { path: "/app/todos", label: "Todos", icon: CheckSquare },
  { path: "/app/study", label: "Study", icon: BookOpen },
  { path: "/app/memory", label: "Memory", icon: ImageIcon },
  { path: "/app/documents", label: "Documents", icon: FileText },
  { path: "/app/social", label: "Social", icon: Users },
  { path: "/app/expenses", label: "Expenses", icon: Receipt },
  { path: "/app/income", label: "Income", icon: TrendingUp },
  { path: "/app/reports", label: "Reports & Budget", icon: Activity },
  { path: "/app/loans", label: "Loans & EMI", icon: Wallet },
  { path: "/app/insurance", label: "Insurance", icon: Shield },
  { path: "/app/lifespan", label: "Lifespan", icon: Clock },
  { path: "/app/achievements", label: "Achievements", icon: Trophy },
  { path: "/app/profile", label: "Profile & Plan", icon: User },
  { path: "/app/settings", label: "Settings", icon: Settings },
];

interface UserProfile {
  display_name: string | null;
  phone_number: string | null;
  email_verified: boolean;
  phone_verified: boolean;
  secondary_email: string | null;
  secondary_phone: string | null;
  primary_contact: string | null;
  avatar_url: string | null;
}

const AppSidebar = () => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [verifyDialog, setVerifyDialog] = useState<{
    open: boolean;
    type: "email" | "phone";
    value: string;
  }>({ open: false, type: "email", value: "" });
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  // Load collapsed state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed) {
      setIsCollapsed(savedCollapsed === "true");
    }
  }, []);

  // Save collapsed state
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
  }, [isCollapsed]);

  // Fetch user profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("display_name, phone_number, email_verified, phone_verified, secondary_email, secondary_phone, primary_contact, avatar_url")
        .eq("id", user.id)
        .single();
      if (data) {
        setProfile(data as UserProfile);
      }
    };
    fetchProfile();
  }, [user]);

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const closeMobile = () => setMobileOpen(false);

  const [otpSending, setOtpSending] = useState(false);
  const [pendingOtp, setPendingOtp] = useState<{ hash: string; expiresAt: string } | null>(null);

  const handleSendOtp = async () => {
    setOtpSending(true);
    try {
      const endpoint = verifyDialog.type === "email" 
        ? "send-email-otp" 
        : "send-sms-otp";
      
      const payload = verifyDialog.type === "email" 
        ? { email: verifyDialog.value }
        : { phone: verifyDialog.value };

      const response = await supabase.functions.invoke(endpoint, {
        body: payload,
      });

      if (response.error) throw response.error;

      if (response.data?.success && response.data?.otpHash) {
        setPendingOtp({
          hash: response.data.otpHash,
          expiresAt: response.data.expiresAt || new Date(Date.now() + 600000).toISOString(),
        });
        toast.success(`OTP sent to your ${verifyDialog.type}!`);
      } else {
        throw new Error(response.data?.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Failed to send OTP:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send OTP. Please try again.");
    } finally {
      setOtpSending(false);
    }
  };

  // Hash OTP for verification
  const hashOtp = async (otp: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const handleVerifyOTP = async () => {
    setIsVerifying(true);
    
    try {
      // Verify OTP by hashing input and comparing
      if (pendingOtp) {
        const inputHash = await hashOtp(otp);
        
        if (inputHash === pendingOtp.hash) {
          const updateField = verifyDialog.type === "email" ? "email_verified" : "phone_verified";
          const { error } = await supabase
            .from("profiles")
            .update({ [updateField]: true })
            .eq("id", user?.id);
          
          if (!error) {
            setProfile((prev) => prev ? { ...prev, [updateField]: true } : null);
            toast.success(`${verifyDialog.type === "email" ? "Email" : "Phone"} verified successfully!`);
            setVerifyDialog({ open: false, type: "email", value: "" });
            setOtp("");
            setPendingOtp(null);
          }
        } else {
          toast.error("Invalid OTP. Please try again.");
        }
      } else {
        toast.error("Please request an OTP first.");
      }
    } catch (error) {
      toast.error("Verification failed. Please try again.");
    }
    setIsVerifying(false);
  };

  const SidebarContent = ({ collapsed = false }: { collapsed?: boolean }) => (
    <TooltipProvider delayDuration={0}>
      <>
        {/* Header with User Info */}
        <div className={cn(
          "border-b border-sidebar-border",
          collapsed ? "p-2" : "p-4"
        )}>
          {/* Logo and collapse toggle */}
          <div className="flex items-center justify-between mb-3">
            <Link 
              to="/app" 
              className="flex items-center gap-2 group" 
              onClick={closeMobile}
            >
              <ChronyxMiniLogo size={collapsed ? "sm" : "md"} />
              {!collapsed && (
                <span className="text-lg font-light tracking-[0.2em] text-sidebar-foreground group-hover:text-primary transition-colors">
                  CHRONYX
                </span>
              )}
            </Link>
            <div className="flex items-center gap-1">
              {/* Sync Status */}
              <SyncStatusIndicator />
              {/* Mobile close button */}
              <button
                onClick={() => setMobileOpen(false)}
                className="lg:hidden p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground"
              >
                <X className="w-5 h-5" />
              </button>
              {/* Desktop collapse button */}
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="hidden lg:flex p-2 text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 rounded-md transition-colors"
              >
                {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Search Bar - only when not collapsed */}
          {!collapsed && (
            <Link
              to="/app/search"
              className="flex items-center gap-2 px-3 py-2 mb-3 rounded-md bg-sidebar-accent/30 hover:bg-sidebar-accent/50 text-sidebar-foreground/60 hover:text-sidebar-foreground transition-colors text-sm"
              onClick={closeMobile}
            >
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </Link>
          )}

          {/* User Info */}
          {!collapsed && (
            <div className="space-y-3">
              {/* Avatar and Name Row */}
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10 border border-sidebar-border">
                  {profile?.avatar_url?.startsWith("emoji:") ? (
                    <AvatarFallback className="text-lg bg-sidebar-accent">
                      {profile.avatar_url.replace("emoji:", "")}
                    </AvatarFallback>
                  ) : profile?.avatar_url ? (
                    <AvatarImage src={profile.avatar_url} alt="Profile" />
                  ) : (
                    <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
                      <User className="w-5 h-5" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  {profile?.display_name && (
                    <p className="text-sm font-medium text-sidebar-foreground truncate">
                      {profile.display_name}
                    </p>
                  )}
                  <p className="text-xs text-sidebar-foreground/60 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>

              {/* Verification Status */}
              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1 text-sidebar-foreground/70">
                  <Mail className="w-3 h-3" />
                  {profile?.email_verified ? (
                    <CheckCircle2 className="w-3 h-3 text-green-500" />
                  ) : (
                    <button
                      onClick={() => setVerifyDialog({ open: true, type: "email", value: user?.email || "" })}
                      className="hover:text-amber-400"
                    >
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                    </button>
                  )}
                </div>
                {profile?.phone_number && (
                  <div className="flex items-center gap-1 text-sidebar-foreground/70">
                    <Phone className="w-3 h-3" />
                    {profile?.phone_verified ? (
                      <CheckCircle2 className="w-3 h-3 text-green-500" />
                    ) : (
                      <button
                        onClick={() => setVerifyDialog({ open: true, type: "phone", value: profile.phone_number || "" })}
                        className="hover:text-amber-400"
                      >
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Collapsed user icon */}
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Avatar className="w-8 h-8 border border-sidebar-border">
                    {profile?.avatar_url?.startsWith("emoji:") ? (
                      <AvatarFallback className="text-sm bg-sidebar-accent">
                        {profile.avatar_url.replace("emoji:", "")}
                      </AvatarFallback>
                    ) : profile?.avatar_url ? (
                      <AvatarImage src={profile.avatar_url} alt="Profile" />
                    ) : (
                      <AvatarFallback className="bg-sidebar-accent text-sidebar-foreground">
                        <User className="w-4 h-4" />
                      </AvatarFallback>
                    )}
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>{profile?.display_name || user?.email}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Quick Add */}
        <div className={cn(
          "border-b border-sidebar-border",
          collapsed ? "p-2" : "px-4 py-2"
        )}>
          <SidebarQuickAdd collapsed={collapsed} onClose={closeMobile} />
        </div>

        {/* Navigation */}
        <nav className={cn(
          "flex-1 space-y-1 vyom-scrollbar overflow-y-auto",
          collapsed ? "p-2" : "p-4"
        )}>
          {navItems.map(({ path, label, icon: Icon }) => {
            const isActive = location.pathname === path;
            
            if (collapsed) {
              return (
                <Tooltip key={path}>
                  <TooltipTrigger asChild>
                    <Link
                      to={path}
                      onClick={closeMobile}
                      className={cn(
                        "flex items-center justify-center p-2.5 rounded-md transition-colors",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <Link
                key={path}
                to={path}
                onClick={closeMobile}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "border-t border-sidebar-border space-y-1",
          collapsed ? "p-2" : "p-4"
        )}>
          {collapsed ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center justify-center p-2.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
                  >
                    {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>{theme === "dark" ? "Light Mode" : "Dark Mode"}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center justify-center p-2.5 rounded-md text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Sign Out</p>
                </TooltipContent>
              </Tooltip>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
              >
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                {theme === "dark" ? "Light Mode" : "Dark Mode"}
              </button>
              
              {/* Email above logout */}
              <div className="px-3 py-1.5 text-xs text-sidebar-foreground/50 truncate">
                {user?.email}
              </div>
              
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors w-full"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              
              {/* Branding and Version */}
              <div className="pt-2 space-y-1 text-center">
                <div className="text-[10px] text-sidebar-foreground/30">
                  CHRONYX by CROPXON
                </div>
                <div className="text-[10px] text-sidebar-foreground/20 font-mono">
                  V1.0.0
                </div>
              </div>
            </>
          )}
        </div>
      </>
    </TooltipProvider>
  );

  return (
    <>
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-sidebar border-b border-sidebar-border flex items-center justify-between px-4 z-40">
        <Link to="/app" className="text-lg font-light tracking-[0.2em] text-sidebar-foreground">
          CHRONYX
        </Link>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileOpen(true)}
          className="text-sidebar-foreground"
        >
          <Menu className="w-5 h-5" />
        </Button>
      </header>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-foreground/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col z-50 transform transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <SidebarContent collapsed={false} />
      </aside>

      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden lg:flex fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border flex-col transition-all duration-300",
          isCollapsed ? "w-14" : "w-64"
        )}
      >
        <SidebarContent collapsed={isCollapsed} />
      </aside>

      {/* OTP Verification Dialog */}
      <Dialog open={verifyDialog.open} onOpenChange={(open) => {
        setVerifyDialog((v) => ({ ...v, open }));
        if (!open) {
          setOtp("");
          setPendingOtp(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify {verifyDialog.type === "email" ? "Email" : "Phone"}</DialogTitle>
            <DialogDescription>
              We'll send a verification code to {verifyDialog.value}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!pendingOtp ? (
              <Button onClick={handleSendOtp} disabled={otpSending} className="w-full">
                {otpSending ? "Sending..." : `Send OTP via ${verifyDialog.type === "email" ? "Email" : "SMS"}`}
              </Button>
            ) : (
              <>
                <Input
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="text-center text-lg tracking-widest"
                />
                <p className="text-xs text-muted-foreground text-center">
                  OTP sent to your {verifyDialog.type}.{" "}
                  <button 
                    type="button"
                    onClick={handleSendOtp} 
                    disabled={otpSending}
                    className="text-primary hover:underline"
                  >
                    Resend
                  </button>
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setVerifyDialog({ open: false, type: "email", value: "" });
              setOtp("");
              setPendingOtp(null);
            }}>
              Cancel
            </Button>
            {pendingOtp && (
              <Button onClick={handleVerifyOTP} disabled={otp.length !== 6 || isVerifying}>
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AppSidebar;
