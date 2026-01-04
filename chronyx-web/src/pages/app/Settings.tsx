import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useActivityLog } from "@/hooks/useActivityLog";
import { useOnboarding } from "@/hooks/useOnboarding";
import { EnhancedCalendar } from "@/components/ui/date-picker-enhanced";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format, differenceInYears, differenceInMonths, differenceInDays } from "date-fns";
import { CalendarIcon, Save, Mail, Phone, CheckCircle2, AlertCircle, Shield, Database, HardDrive, Camera, User, Upload, RotateCcw, Sparkles, Crop, Trash2, AlertTriangle, Download, ShieldCheck } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { DataExport } from "@/components/export/DataExport";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ProfileCompletionIndicator } from "@/components/profile/ProfileCompletionIndicator";
import { ImageCropper } from "@/components/profile/ImageCropper";

interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  birth_date: string | null;
  target_age: number | null;
  phone_number: string | null;
  email_verified: boolean | null;
  phone_verified: boolean | null;
  secondary_email: string | null;
  secondary_phone: string | null;
  primary_contact: string | null;
  avatar_url: string | null;
}

// Avatar options for customization
const AVATAR_OPTIONS = [
  { id: "default", emoji: "👤", label: "Default" },
  { id: "smile", emoji: "😊", label: "Smile" },
  { id: "cool", emoji: "😎", label: "Cool" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "fire", emoji: "🔥", label: "Fire" },
  { id: "crown", emoji: "👑", label: "Crown" },
  { id: "diamond", emoji: "💎", label: "Diamond" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "thunder", emoji: "⚡", label: "Thunder" },
  { id: "leaf", emoji: "🍀", label: "Leaf" },
];

const Settings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logActivity } = useActivityLog();
  const { resetOnboarding } = useOnboarding();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [birthDate, setBirthDate] = useState<Date | undefined>();
  const [targetAge, setTargetAge] = useState(60);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [secondaryEmail, setSecondaryEmail] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [primaryContact, setPrimaryContact] = useState("email");
  
  // Avatar state
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [showAvatarDialog, setShowAvatarDialog] = useState(false);
  const [showCropper, setShowCropper] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // OTP verification state
  const [verifyDialog, setVerifyDialog] = useState<{
    open: boolean;
    type: "email" | "phone";
    value: string;
  }>({ open: false, type: "email", value: "" });
  const [otp, setOtp] = useState("");
  const [otpHash, setOtpHash] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  
  // Delete account state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteReason, setDeleteReason] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"reason" | "verify" | "confirm">("reason");
  const [deleteOtp, setDeleteOtp] = useState("");
  const [deleteOtpHash, setDeleteOtpHash] = useState("");
  const [deleteOtpSent, setDeleteOtpSent] = useState(false);
  const [deleteOtpVerified, setDeleteOtpVerified] = useState(false);
  const [sendingDeleteOtp, setSendingDeleteOtp] = useState(false);
  const [verifyingDeleteOtp, setVerifyingDeleteOtp] = useState(false);
  const [isDownloadingData, setIsDownloadingData] = useState(false);

  const DELETE_REASONS = [
    { value: "not_useful", label: "Not useful for my needs" },
    { value: "too_complex", label: "Too complex to use" },
    { value: "found_alternative", label: "Found a better alternative" },
    { value: "privacy_concerns", label: "Privacy concerns" },
    { value: "temporary_account", label: "This was a temporary account" },
    { value: "other", label: "Other reason" },
  ];

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user?.id)
      .maybeSingle();

    if (error) {
      console.error("Error fetching profile:", error);
    } else if (data) {
      setProfile(data as Profile);
      setDisplayName(data.display_name || "");
      setBirthDate(data.birth_date ? new Date(data.birth_date) : undefined);
      setTargetAge(data.target_age || 60);
      setPhoneNumber(data.phone_number || "");
      setSecondaryEmail(data.secondary_email || "");
      setSecondaryPhone(data.secondary_phone || "");
      setPrimaryContact(data.primary_contact || "email");
      setAvatarUrl((data as Profile).avatar_url || null);
      // Check if avatar_url is an emoji reference
      if ((data as Profile).avatar_url?.startsWith("emoji:")) {
        setSelectedEmoji((data as Profile).avatar_url?.replace("emoji:", "") || null);
      }
    }
    setLoading(false);
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview and open cropper
    const reader = new FileReader();
    reader.onloadend = () => {
      setCropImageSrc(reader.result as string);
      setShowCropper(true);
      setSelectedEmoji(null);
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedBlob: Blob) => {
    const croppedUrl = URL.createObjectURL(croppedBlob);
    setAvatarPreview(croppedUrl);
    setShowCropper(false);
    setCropImageSrc(null);
    
    // Store the blob for upload
    const file = new File([croppedBlob], "avatar.jpg", { type: "image/jpeg" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    if (fileInputRef.current) {
      fileInputRef.current.files = dataTransfer.files;
    }
  };

  const saveAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);

    try {
      let newAvatarUrl: string | null = null;

      if (selectedEmoji) {
        // Save emoji as avatar
        newAvatarUrl = `emoji:${selectedEmoji}`;
      } else if (avatarPreview && fileInputRef.current?.files?.[0]) {
        const file = fileInputRef.current.files[0];
        const fileExt = file.name.split(".").pop();
        const fileName = `${user.id}/avatar.${fileExt}`;

        // Delete old avatar if exists
        if (avatarUrl && !avatarUrl.startsWith("emoji:")) {
          const oldPath = avatarUrl.split("/").slice(-2).join("/");
          await supabase.storage.from("documents").remove([oldPath]);
        }

        // Upload new avatar
        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, file, { upsert: true });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: urlData } = supabase.storage
          .from("documents")
          .getPublicUrl(fileName);

        newAvatarUrl = urlData.publicUrl;
      }

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("id", user.id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      setAvatarPreview(null);
      setShowAvatarDialog(false);
      
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been saved.",
      });
      logActivity("Updated profile avatar", "Settings");
    } catch (error) {
      console.error("Error saving avatar:", error);
      toast({
        title: "Error",
        description: "Failed to save avatar",
        variant: "destructive",
      });
    }
    setUploadingAvatar(false);
  };

  const removeAvatar = async () => {
    if (!user) return;
    setUploadingAvatar(true);

    try {
      // Delete from storage if it's a file URL
      if (avatarUrl && !avatarUrl.startsWith("emoji:")) {
        const path = avatarUrl.split("/").slice(-2).join("/");
        await supabase.storage.from("documents").remove([path]);
      }

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id);

      if (error) throw error;

      setAvatarUrl(null);
      setAvatarPreview(null);
      setSelectedEmoji(null);
      setShowAvatarDialog(false);

      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      });
    } catch (error) {
      console.error("Error removing avatar:", error);
      toast({
        title: "Error",
        description: "Failed to remove avatar",
        variant: "destructive",
      });
    }
    setUploadingAvatar(false);
  };

  const handleReplayOnboarding = () => {
    resetOnboarding();
    toast({
      title: "Onboarding Reset",
      description: "The onboarding flow will appear on your next dashboard visit.",
    });
    logActivity("Reset onboarding flow", "Settings");
  };

  const handleDownloadAllData = async () => {
    if (!user) return;
    setIsDownloadingData(true);
    
    try {
      // Fetch all user data
      const [
        { data: achievements },
        { data: expenses },
        { data: incomeEntries },
        { data: incomeSources },
        { data: loans },
        { data: insurances },
        { data: studyLogs },
        { data: studyGoals },
        { data: savingsGoals },
        { data: documents },
        { data: educationRecords },
        { data: memories },
        { data: socialProfiles },
      ] = await Promise.all([
        supabase.from("achievements").select("*").eq("user_id", user.id),
        supabase.from("expenses").select("*").eq("user_id", user.id),
        supabase.from("income_entries").select("*").eq("user_id", user.id),
        supabase.from("income_sources").select("*").eq("user_id", user.id),
        supabase.from("loans").select("*").eq("user_id", user.id),
        supabase.from("insurances").select("*").eq("user_id", user.id),
        supabase.from("study_logs").select("*").eq("user_id", user.id),
        supabase.from("study_goals").select("*").eq("user_id", user.id),
        supabase.from("savings_goals").select("*").eq("user_id", user.id),
        supabase.from("documents").select("*").eq("user_id", user.id),
        supabase.from("education_records").select("*").eq("user_id", user.id),
        supabase.from("memories").select("*").eq("user_id", user.id),
        supabase.from("social_profiles").select("*").eq("user_id", user.id),
      ]);

      const exportData = {
        exportedAt: new Date().toISOString(),
        profile: profile,
        achievements,
        expenses,
        incomeEntries,
        incomeSources,
        loans,
        insurances,
        studyLogs,
        studyGoals,
        savingsGoals,
        documents,
        educationRecords,
        memories,
        socialProfiles,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `chronyx-data-export-${format(new Date(), "yyyy-MM-dd")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Data Exported",
        description: "Your data has been downloaded successfully.",
      });
    } catch (error) {
      console.error("Error exporting data:", error);
      toast({
        title: "Export Failed",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    }
    setIsDownloadingData(false);
  };

  const sendDeleteOtp = async () => {
    if (!profile?.email && !user?.email) return;
    setSendingDeleteOtp(true);
    
    try {
      const email = profile?.email || user?.email;
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      const hash = await hashOtp(code);
      setDeleteOtpHash(hash);
      
      const { error } = await supabase.functions.invoke("send-email-otp", {
        body: { email, otp: code, purpose: "account_deletion" },
      });
      
      if (error) throw error;
      
      setDeleteOtpSent(true);
      toast({
        title: "Verification Code Sent",
        description: `A 6-digit code has been sent to ${email}`,
      });
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Error",
        description: "Failed to send verification code. Please try again.",
        variant: "destructive",
      });
    }
    setSendingDeleteOtp(false);
  };

  const verifyDeleteOtp = async () => {
    if (!deleteOtp || deleteOtp.length !== 6) return;
    setVerifyingDeleteOtp(true);
    
    try {
      const hash = await hashOtp(deleteOtp);
      if (hash === deleteOtpHash) {
        setDeleteOtpVerified(true);
        setDeleteStep("confirm");
        toast({
          title: "Verified",
          description: "Email verification successful. You can now proceed with account deletion.",
        });
      } else {
        toast({
          title: "Invalid Code",
          description: "The verification code is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Verification failed. Please try again.",
        variant: "destructive",
      });
    }
    setVerifyingDeleteOtp(false);
  };

  const handleDeleteAccount = async () => {
    if (!user || !deleteReason || !deleteOtpVerified || deleteConfirmText !== (profile?.email || user.email)) {
      return;
    }

    setIsDeleting(true);
    try {
      // Log the deletion reason for analytics (before deleting)
      await logActivity(`Account deletion requested. Reason: ${deleteReason}`, "Settings");

      // Delete all user data from various tables
      await supabase.from("achievements").delete().eq("user_id", user.id);
      await supabase.from("activity_logs").delete().eq("user_id", user.id);
      await supabase.from("budget_limits").delete().eq("user_id", user.id);
      await supabase.from("custom_banks").delete().eq("user_id", user.id);
      await supabase.from("documents").delete().eq("user_id", user.id);
      await supabase.from("education_documents").delete().eq("user_id", user.id);
      await supabase.from("education_records").delete().eq("user_id", user.id);
      await supabase.from("expenses").delete().eq("user_id", user.id);
      await supabase.from("family_members").delete().eq("user_id", user.id);
      await supabase.from("income_entries").delete().eq("user_id", user.id);
      await supabase.from("income_sources").delete().eq("user_id", user.id);
      await supabase.from("memories").delete().eq("user_id", user.id);
      await supabase.from("memory_collections").delete().eq("user_id", user.id);
      await supabase.from("memory_folders").delete().eq("user_id", user.id);
      await supabase.from("savings_goals").delete().eq("user_id", user.id);
      await supabase.from("social_profiles").delete().eq("user_id", user.id);
      await supabase.from("study_goals").delete().eq("user_id", user.id);
      await supabase.from("study_logs").delete().eq("user_id", user.id);
      await supabase.from("subject_colors").delete().eq("user_id", user.id);
      await supabase.from("salary_records").delete().eq("user_id", user.id);

      // Delete loans and related data
      const { data: loans } = await supabase.from("loans").select("id").eq("user_id", user.id);
      if (loans && loans.length > 0) {
        const loanIds = loans.map(l => l.id);
        await supabase.from("emi_schedule").delete().in("loan_id", loanIds);
        await supabase.from("emi_events").delete().in("loan_id", loanIds);
        await supabase.from("loan_documents").delete().in("loan_id", loanIds);
        await supabase.from("loans").delete().eq("user_id", user.id);
      }

      // Delete insurances and related data
      const { data: insurances } = await supabase.from("insurances").select("id").eq("user_id", user.id);
      if (insurances && insurances.length > 0) {
        const insuranceIds = insurances.map(i => i.id);
        await supabase.from("insurance_documents").delete().in("insurance_id", insuranceIds);
        await supabase.from("insurance_reminders").delete().in("insurance_id", insuranceIds);
        const { data: claims } = await supabase.from("insurance_claims").select("id").in("insurance_id", insuranceIds);
        if (claims && claims.length > 0) {
          await supabase.from("insurance_claim_documents").delete().in("claim_id", claims.map(c => c.id));
        }
        await supabase.from("insurance_claims").delete().in("insurance_id", insuranceIds);
        await supabase.from("insurances").delete().eq("user_id", user.id);
      }

      // Delete profile
      await supabase.from("profiles").delete().eq("id", user.id);

      // Delete storage files
      const buckets = ["documents", "memories", "vyom"];
      for (const bucket of buckets) {
        const { data: files } = await supabase.storage.from(bucket).list(user.id);
        if (files && files.length > 0) {
          const paths = files.map(f => `${user.id}/${f.name}`);
          await supabase.storage.from(bucket).remove(paths);
        }
      }

      // Sign out and delete auth user (this will fail if not using service role, but we sign out anyway)
      await supabase.auth.signOut();

      toast({
        title: "Account Deleted",
        description: "Your account and all data have been permanently deleted.",
      });

      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("Error deleting account:", error);
      toast({
        title: "Error",
        description: "Failed to delete account. Please try again.",
        variant: "destructive",
      });
    }
    setIsDeleting(false);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        display_name: displayName || null,
        birth_date: birthDate ? format(birthDate, "yyyy-MM-dd") : null,
        target_age: targetAge,
        phone_number: phoneNumber || null,
        secondary_email: secondaryEmail || null,
        secondary_phone: secondaryPhone || null,
        primary_contact: primaryContact,
      })
      .eq("id", user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated.",
      });
      logActivity("Updated profile settings", "Settings");
      fetchProfile(); // Refresh profile data
    }
    setSaving(false);
  };

  // Hash OTP for verification
  const hashOtp = async (otp: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(otp);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const sendOtp = async () => {
    setIsSendingOtp(true);
    try {
      const endpoint = verifyDialog.type === "email" 
        ? "send-email-otp" 
        : "send-sms-otp";
      
      const payload = verifyDialog.type === "email" 
        ? { email: verifyDialog.value }
        : { phone: verifyDialog.value };

      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: payload,
      });

      if (error) throw error;

      if (data?.success && data?.otpHash) {
        setOtpHash(data.otpHash);
        setOtpSent(true);
        toast({
          title: "OTP Sent",
          description: `Verification code sent to your ${verifyDialog.type}.`,
        });
      } else {
        throw new Error(data?.error || "Failed to send OTP");
      }
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send OTP",
        variant: "destructive",
      });
    }
    setIsSendingOtp(false);
  };

  const handleVerifyOTP = async () => {
    setIsVerifying(true);
    try {
      // Hash the entered OTP and compare with stored hash
      const enteredHash = await hashOtp(otp);
      
      if (enteredHash === otpHash) {
        const updateField = verifyDialog.type === "email" ? "email_verified" : "phone_verified";
        const { error } = await supabase
          .from("profiles")
          .update({ [updateField]: true })
          .eq("id", user?.id);
        
        if (!error) {
          setProfile((prev) => prev ? { ...prev, [updateField]: true } : null);
          toast({
            title: "Verified",
            description: `${verifyDialog.type === "email" ? "Email" : "Phone"} verified successfully!`,
          });
          setVerifyDialog({ open: false, type: "email", value: "" });
          setOtp("");
          setOtpHash("");
          setOtpSent(false);
          logActivity(`Verified ${verifyDialog.type}`, "Settings");
        }
      } else {
        toast({
          title: "Invalid OTP",
          description: "The code you entered is incorrect. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Please try again.",
        variant: "destructive",
      });
    }
    setIsVerifying(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-light text-foreground tracking-wide">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure your personal preferences</p>
      </header>

      {/* Profile Completion */}
      <section className="bg-card border border-border rounded-lg p-6">
        <ProfileCompletionIndicator profile={profile} />
      </section>

      {/* Profile Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <User className="w-4 h-4" />
          Profile
        </h2>

        <div className="space-y-6">
          {/* Avatar Section */}
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Avatar className="w-24 h-24 border-2 border-border">
                {avatarUrl?.startsWith("emoji:") ? (
                  <AvatarFallback className="text-4xl bg-muted">
                    {avatarUrl.replace("emoji:", "")}
                  </AvatarFallback>
                ) : avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Profile" />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="w-10 h-10" />
                  </AvatarFallback>
                )}
              </Avatar>
              <button
                onClick={() => setShowAvatarDialog(true)}
                className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-full"
              >
                <Camera className="w-6 h-6 text-white" />
              </button>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Profile Picture</h3>
              <p className="text-sm text-muted-foreground">
                Upload a photo or choose an avatar
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAvatarDialog(true)}
              >
                <Camera className="w-4 h-4 mr-2" />
                Change Avatar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">
              Email (Primary - Cannot be changed)
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="h-11 bg-muted/50 flex-1"
              />
              {profile?.email_verified ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerifyDialog({ open: true, type: "email", value: profile?.email || "" })}
                >
                  <AlertCircle className="w-4 h-4 text-amber-500 mr-1" />
                  Verify
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName" className="text-xs uppercase tracking-wider text-muted-foreground">
              Display Name
            </Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className="h-11 bg-background"
            />
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Contact Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Phone Number */}
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs uppercase tracking-wider text-muted-foreground">
              Phone Number
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 9876543210"
                className="h-11 bg-background flex-1"
              />
              {phoneNumber && (
                profile?.phone_verified ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setVerifyDialog({ open: true, type: "phone", value: phoneNumber })}
                  >
                    <AlertCircle className="w-4 h-4 text-amber-500 mr-1" />
                    Verify
                  </Button>
                )
              )}
            </div>
          </div>

          {/* Secondary Email */}
          <div className="space-y-2">
            <Label htmlFor="secondaryEmail" className="text-xs uppercase tracking-wider text-muted-foreground">
              Secondary Email
            </Label>
            <Input
              id="secondaryEmail"
              type="email"
              value={secondaryEmail}
              onChange={(e) => setSecondaryEmail(e.target.value)}
              placeholder="backup@example.com"
              className="h-11 bg-background"
            />
          </div>

          {/* Secondary Phone */}
          <div className="space-y-2">
            <Label htmlFor="secondaryPhone" className="text-xs uppercase tracking-wider text-muted-foreground">
              Secondary Phone
            </Label>
            <Input
              id="secondaryPhone"
              value={secondaryPhone}
              onChange={(e) => setSecondaryPhone(e.target.value)}
              placeholder="+91 9876543210"
              className="h-11 bg-background"
            />
          </div>

          {/* Primary Contact Selection */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-2">
              <Shield className="w-3 h-3" />
              Primary Contact Method
            </Label>
            <RadioGroup
              value={primaryContact}
              onValueChange={setPrimaryContact}
              className="flex gap-6 pt-2"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="email" id="primary-email" />
                <Label htmlFor="primary-email" className="cursor-pointer flex items-center gap-1">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="phone" id="primary-phone" />
                <Label htmlFor="primary-phone" className="cursor-pointer flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  Phone
                </Label>
              </div>
            </RadioGroup>
          </div>
        </div>
      </section>

      {/* Lifespan Configuration */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-6">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Lifespan Settings
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wider text-muted-foreground">
              Birth Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full h-11 justify-start text-left font-normal",
                    !birthDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {birthDate ? format(birthDate, "PPP") : "Select your birth date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <EnhancedCalendar
                  mode="single"
                  selected={birthDate}
                  onSelect={setBirthDate}
                  disabled={(date) => date > new Date()}
                  fromYear={1920}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
            
            {/* Exact Age Display */}
            {birthDate && (
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-xs text-muted-foreground mb-2">Your Exact Age</p>
                <div className="flex items-center gap-4">
                  {(() => {
                    const now = new Date();
                    const years = differenceInYears(now, birthDate);
                    const monthsAfterYears = differenceInMonths(now, birthDate) % 12;
                    const lastBirthday = new Date(
                      now.getFullYear(),
                      birthDate.getMonth(),
                      birthDate.getDate()
                    );
                    if (lastBirthday > now) {
                      lastBirthday.setFullYear(lastBirthday.getFullYear() - 1);
                    }
                    const nextMonthDate = new Date(lastBirthday);
                    nextMonthDate.setMonth(lastBirthday.getMonth() + monthsAfterYears);
                    const days = differenceInDays(now, nextMonthDate);
                    
                    return (
                      <>
                        <div className="text-center">
                          <p className="text-2xl font-light text-foreground">{years}</p>
                          <p className="text-xs text-muted-foreground">Years</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-light text-foreground">{monthsAfterYears}</p>
                          <p className="text-xs text-muted-foreground">Months</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-light text-foreground">{Math.abs(days)}</p>
                          <p className="text-xs text-muted-foreground">Days</p>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetAge" className="text-xs uppercase tracking-wider text-muted-foreground">
              Target Age (for lifespan calculations)
            </Label>
            <Input
              id="targetAge"
              type="number"
              value={targetAge}
              onChange={(e) => setTargetAge(parseInt(e.target.value) || 60)}
              min={1}
              max={120}
              className="h-11 bg-background"
            />
          </div>
        </div>
      </section>

      {/* Data Export Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Data Export
        </h2>
        <p className="text-sm text-muted-foreground">
          Download all your data including todos, study logs, achievements, and activity history.
        </p>
        <DataExport />
      </section>

      {/* Backup Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Database className="w-4 h-4" />
          Backup & Restore
        </h2>
        <p className="text-sm text-muted-foreground">
          Create full backups of your VYOM data or restore from previous backups.
        </p>
        <Button variant="outline" asChild>
          <a href="/app/backup">
            <HardDrive className="w-4 h-4 mr-2" />
            Open Backup Manager
          </a>
        </Button>
      </section>

      {/* Onboarding Section */}
      <section className="bg-card border border-border rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          Onboarding
        </h2>
        <p className="text-sm text-muted-foreground">
          Want to see the app introduction again? Replay the onboarding flow to learn about VYOM's features.
        </p>
        <Button variant="outline" onClick={handleReplayOnboarding}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Replay Onboarding
        </Button>
      </section>

      {/* Danger Zone */}
      <section className="bg-destructive/5 border border-destructive/30 rounded-lg p-6 space-y-4">
        <h2 className="text-sm font-medium text-destructive uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          Danger Zone
        </h2>
        <div className="space-y-3">
          {/* Download Data Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-border rounded-lg bg-background">
            <div className="space-y-1">
              <p className="font-medium text-foreground flex items-center gap-2">
                <Download className="w-4 h-4 text-muted-foreground" />
                Download My Data
              </p>
              <p className="text-sm text-muted-foreground">
                Export all your data as a JSON file before deleting your account.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleDownloadAllData}
              disabled={isDownloadingData}
              className="w-full sm:w-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              {isDownloadingData ? "Downloading..." : "Download Data"}
            </Button>
          </div>

          {/* Delete Account Option */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border border-destructive/20 rounded-lg bg-background">
            <div className="space-y-1">
              <p className="font-medium text-foreground">Delete Account</p>
              <p className="text-sm text-muted-foreground">
                Permanently delete your account and all associated data. This action cannot be undone.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => {
                setShowDeleteDialog(true);
                setDeleteStep("reason");
                setDeleteOtp("");
                setDeleteOtpHash("");
                setDeleteOtpSent(false);
                setDeleteOtpVerified(false);
                setDeleteReason("");
                setDeleteConfirmText("");
              }}
              className="w-full sm:w-auto"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Account
            </Button>
          </div>
        </div>
      </section>

      {/* Save Button */}
      <Button
        onClick={saveSettings}
        disabled={saving}
        className="w-full sm:w-auto"
      >
        <Save className="w-4 h-4 mr-2" />
        {saving ? "Saving..." : "Save Settings"}
      </Button>

      {/* OTP Verification Dialog */}
      <Dialog 
        open={verifyDialog.open} 
        onOpenChange={(open) => {
          setVerifyDialog((v) => ({ ...v, open }));
          if (!open) {
            setOtp("");
            setOtpHash("");
            setOtpSent(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verify {verifyDialog.type === "email" ? "Email" : "Phone"}</DialogTitle>
            <DialogDescription>
              {otpSent 
                ? `Enter the verification code sent to ${verifyDialog.value}`
                : `We'll send a verification code to ${verifyDialog.value}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {!otpSent ? (
              <Button 
                onClick={sendOtp} 
                disabled={isSendingOtp}
                className="w-full"
              >
                {isSendingOtp ? "Sending..." : `Send OTP via ${verifyDialog.type === "email" ? "Email" : "SMS"}`}
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
                  Didn't receive it?{" "}
                  <button 
                    type="button"
                    onClick={sendOtp} 
                    disabled={isSendingOtp}
                    className="text-primary hover:underline"
                  >
                    Resend code
                  </button>
                </p>
              </>
            )}
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => { 
                setVerifyDialog({ open: false, type: "email", value: "" }); 
                setOtp(""); 
                setOtpHash("");
                setOtpSent(false);
              }}
            >
              Cancel
            </Button>
            {otpSent && (
              <Button onClick={handleVerifyOTP} disabled={otp.length !== 6 || isVerifying}>
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Avatar Customization Dialog */}
      <Dialog open={showAvatarDialog} onOpenChange={setShowAvatarDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Customize Avatar</DialogTitle>
            <DialogDescription>
              Upload a photo or choose an emoji avatar
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            {/* Preview */}
            <div className="flex justify-center">
              <Avatar className="w-32 h-32 border-4 border-border">
                {selectedEmoji ? (
                  <AvatarFallback className="text-6xl bg-muted">
                    {selectedEmoji}
                  </AvatarFallback>
                ) : avatarPreview ? (
                  <AvatarImage src={avatarPreview} alt="Preview" />
                ) : avatarUrl?.startsWith("emoji:") ? (
                  <AvatarFallback className="text-6xl bg-muted">
                    {avatarUrl.replace("emoji:", "")}
                  </AvatarFallback>
                ) : avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt="Current" />
                ) : (
                  <AvatarFallback className="bg-muted text-muted-foreground">
                    <User className="w-16 h-16" />
                  </AvatarFallback>
                )}
              </Avatar>
            </div>

            {/* Upload Button */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Upload Photo
              </Label>
              <div className="flex gap-2">
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Max 5MB. Supports JPG, PNG, GIF
              </p>
            </div>

            {/* Emoji Avatars */}
            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">
                Or Choose an Avatar
              </Label>
              <div className="grid grid-cols-6 gap-2">
                {AVATAR_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => {
                      setSelectedEmoji(option.emoji);
                      setAvatarPreview(null);
                    }}
                    className={cn(
                      "w-12 h-12 flex items-center justify-center text-2xl rounded-lg border-2 transition-all hover:scale-110",
                      selectedEmoji === option.emoji
                        ? "border-primary bg-primary/10"
                        : "border-border bg-muted/30 hover:border-muted-foreground"
                    )}
                    title={option.label}
                  >
                    {option.emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {(avatarUrl || avatarPreview || selectedEmoji) && (
              <Button
                variant="destructive"
                onClick={removeAvatar}
                disabled={uploadingAvatar}
                className="w-full sm:w-auto"
              >
                Remove Avatar
              </Button>
            )}
            <div className="flex gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAvatarDialog(false);
                  setAvatarPreview(null);
                  setSelectedEmoji(avatarUrl?.startsWith("emoji:") ? avatarUrl.replace("emoji:", "") : null);
                }}
                className="flex-1 sm:flex-none"
              >
                Cancel
              </Button>
              <Button
                onClick={saveAvatar}
                disabled={uploadingAvatar || (!avatarPreview && !selectedEmoji)}
                className="flex-1 sm:flex-none"
              >
                {uploadingAvatar ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Save Avatar
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Image Cropper Dialog */}
      <Dialog open={showCropper} onOpenChange={setShowCropper}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Crop className="w-5 h-5" />
              Crop Your Photo
            </DialogTitle>
            <DialogDescription>
              Drag to reposition and resize your profile photo
            </DialogDescription>
          </DialogHeader>
          {cropImageSrc && (
            <ImageCropper
              imageSrc={cropImageSrc}
              onCropComplete={handleCropComplete}
              onCancel={() => {
                setShowCropper(false);
                setCropImageSrc(null);
              }}
              aspectRatio={1}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={(open) => {
        setShowDeleteDialog(open);
        if (!open) {
          setDeleteReason("");
          setDeleteConfirmText("");
          setDeleteStep("reason");
          setDeleteOtp("");
          setDeleteOtpHash("");
          setDeleteOtpSent(false);
          setDeleteOtpVerified(false);
        }
      }}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              {deleteStep === "reason" && (
                <p>
                  This action is <span className="font-semibold text-destructive">permanent and irreversible</span>. 
                  Please select a reason before proceeding.
                </p>
              )}
              {deleteStep === "verify" && (
                <p>
                  For security, we need to verify your email address before deleting your account.
                </p>
              )}
              {deleteStep === "confirm" && (
                <p>
                  Email verified. Type your email to confirm permanent deletion.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-2">
            {/* Step 1: Reason Selection */}
            {deleteStep === "reason" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Why are you deleting your account?
                </Label>
                <Select value={deleteReason} onValueChange={setDeleteReason}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a reason..." />
                  </SelectTrigger>
                  <SelectContent>
                    {DELETE_REASONS.map((reason) => (
                      <SelectItem key={reason.value} value={reason.value}>
                        {reason.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Step 2: Email Verification */}
            {deleteStep === "verify" && (
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Verification code will be sent to:
                  </p>
                  <p className="font-medium">{profile?.email || user?.email}</p>
                </div>
                
                {!deleteOtpSent ? (
                  <Button 
                    onClick={sendDeleteOtp} 
                    disabled={sendingDeleteOtp}
                    className="w-full"
                  >
                    <Mail className="w-4 h-4 mr-2" />
                    {sendingDeleteOtp ? "Sending..." : "Send Verification Code"}
                  </Button>
                ) : (
                  <div className="space-y-3">
                    <Input
                      placeholder="Enter 6-digit code"
                      value={deleteOtp}
                      onChange={(e) => setDeleteOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                      className="text-center text-lg tracking-widest"
                    />
                    <Button 
                      onClick={verifyDeleteOtp} 
                      disabled={deleteOtp.length !== 6 || verifyingDeleteOtp}
                      className="w-full"
                    >
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      {verifyingDeleteOtp ? "Verifying..." : "Verify Code"}
                    </Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Didn't receive it?{" "}
                      <button 
                        type="button"
                        onClick={sendDeleteOtp} 
                        disabled={sendingDeleteOtp}
                        className="text-primary hover:underline"
                      >
                        Resend code
                      </button>
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Final Confirmation */}
            {deleteStep === "confirm" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-600">Email verified successfully</span>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Type <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-destructive">{profile?.email || user?.email}</span> to confirm
                  </Label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Enter your email to confirm"
                    className="font-mono"
                  />
                </div>

                {deleteConfirmText && deleteConfirmText !== (profile?.email || user?.email) && (
                  <p className="text-xs text-destructive flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    Email doesn't match
                  </p>
                )}
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            
            {deleteStep === "reason" && (
              <Button
                onClick={() => setDeleteStep("verify")}
                disabled={!deleteReason}
              >
                Continue
              </Button>
            )}
            
            {deleteStep === "confirm" && (
              <Button
                variant="destructive"
                onClick={handleDeleteAccount}
                disabled={
                  isDeleting || 
                  !deleteReason || 
                  !deleteOtpVerified ||
                  deleteConfirmText !== (profile?.email || user?.email)
                }
              >
                {isDeleting ? (
                  <>Deleting...</>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Forever
                  </>
                )}
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};


export default Settings;
