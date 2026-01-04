import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  X, 
  Smartphone, 
  Monitor, 
  Share2,
  MoreVertical,
  Plus,
  Check,
  Wifi,
  WifiOff,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Platform = "ios" | "android" | "mac" | "windows" | "unknown";

const detectPlatform = (): Platform => {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || "";
  
  // iOS detection
  if (/iphone|ipad|ipod/.test(userAgent) || 
      (platform === "macintel" && navigator.maxTouchPoints > 1)) {
    return "ios";
  }
  
  // Android detection
  if (/android/.test(userAgent)) {
    return "android";
  }
  
  // Mac detection
  if (/macintosh|macintel|macppc|mac68k/.test(platform) || 
      /mac os x/.test(userAgent)) {
    return "mac";
  }
  
  // Windows detection
  if (/win32|win64|windows|wince/.test(platform) || 
      /windows/.test(userAgent)) {
    return "windows";
  }
  
  return "unknown";
};

const isStandalone = (): boolean => {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
};

export const usePWAInstall = () => {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [platform, setPlatform] = useState<Platform>("unknown");

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(isStandalone());

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setInstallPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = async () => {
    if (!installPrompt) return false;
    
    await installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === "accepted") {
      setIsInstalled(true);
      setIsInstallable(false);
    }
    
    setInstallPrompt(null);
    return outcome === "accepted";
  };

  return {
    isInstallable,
    isInstalled,
    platform,
    promptInstall,
    canPrompt: !!installPrompt
  };
};

interface PWAInstallPromptProps {
  showButton?: boolean;
  variant?: "hero" | "floating" | "inline";
}

const PWAInstallPrompt = ({ showButton = true, variant = "inline" }: PWAInstallPromptProps) => {
  const { isInstallable, isInstalled, platform, promptInstall, canPrompt } = usePWAInstall();
  const [showDialog, setShowDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<string>(platform);

  useEffect(() => {
    setActiveTab(platform === "unknown" ? "windows" : platform);
  }, [platform]);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (canPrompt) {
      await promptInstall();
    } else {
      setShowDialog(true);
    }
  };

  const platformInstructions = {
    ios: {
      title: "Install on iPhone/iPad",
      icon: <Smartphone className="w-5 h-5" />,
      steps: [
        { icon: <Share2 className="w-4 h-4" />, text: "Tap the Share button at the bottom of Safari" },
        { icon: <Plus className="w-4 h-4" />, text: 'Scroll down and tap "Add to Home Screen"' },
        { icon: <Check className="w-4 h-4" />, text: 'Tap "Add" in the top right corner' }
      ],
      note: "Note: Must use Safari browser for this to work"
    },
    android: {
      title: "Install on Android",
      icon: <Smartphone className="w-5 h-5" />,
      steps: [
        { icon: <MoreVertical className="w-4 h-4" />, text: "Tap the menu button (⋮) in Chrome" },
        { icon: <Download className="w-4 h-4" />, text: 'Tap "Install app" or "Add to Home screen"' },
        { icon: <Check className="w-4 h-4" />, text: 'Tap "Install" to confirm' }
      ],
      note: "Or look for the install banner at the bottom of your screen"
    },
    mac: {
      title: "Install on Mac",
      icon: <Monitor className="w-5 h-5" />,
      steps: [
        { icon: <Monitor className="w-4 h-4" />, text: "Use Chrome or Edge browser" },
        { icon: <Download className="w-4 h-4" />, text: "Click the install icon (⊕) in the address bar" },
        { icon: <Check className="w-4 h-4" />, text: 'Click "Install" to add to your Applications' }
      ],
      note: "In Safari: File → Add to Dock (macOS Sonoma+)"
    },
    windows: {
      title: "Install on Windows",
      icon: <Monitor className="w-5 h-5" />,
      steps: [
        { icon: <Monitor className="w-4 h-4" />, text: "Use Chrome or Edge browser" },
        { icon: <Download className="w-4 h-4" />, text: "Click the install icon (⊕) in the address bar" },
        { icon: <Check className="w-4 h-4" />, text: 'Click "Install" to add to your desktop' }
      ],
      note: "The app will appear in your Start menu and taskbar"
    }
  };

  const ButtonContent = () => (
    <>
      <Download className="w-4 h-4" />
      <span>Install CHRONYX App</span>
      <div className="flex items-center gap-1 text-[10px] opacity-70">
        <WifiOff className="w-3 h-3" />
        <span>Works Offline</span>
      </div>
    </>
  );

  if (!showButton) {
    return null;
  }

  return (
    <>
      {variant === "hero" && (
        <motion.button
          onClick={handleInstallClick}
          className="group flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm tracking-wider font-light border border-chronyx-success/40 text-chronyx-success bg-chronyx-success/10 rounded-md hover:bg-chronyx-success/20 hover:border-chronyx-success/60 transition-all duration-300"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Add for Offline Use</span>
          <RefreshCw className="w-3 h-3 opacity-60" />
        </motion.button>
      )}

      {variant === "floating" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-20 right-4 z-40"
        >
          <Button
            onClick={handleInstallClick}
            className="rounded-full shadow-lg bg-primary hover:bg-primary/90 gap-2"
          >
            <Download className="w-4 h-4" />
            Install App
          </Button>
        </motion.div>
      )}

      {variant === "inline" && (
        <Button
          onClick={handleInstallClick}
          variant="outline"
          className="gap-2"
        >
          <ButtonContent />
        </Button>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary" />
              Install CHRONYX
            </DialogTitle>
            <DialogDescription>
              Install CHRONYX as an app for offline access and automatic sync when online.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2 text-xs">
                <WifiOff className="w-4 h-4 text-primary" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <RefreshCw className="w-4 h-4 text-chronyx-success" />
                <span>Auto-sync online</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Smartphone className="w-4 h-4 text-chronyx-warning" />
                <span>Native app feel</span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Download className="w-4 h-4 text-muted-foreground" />
                <span>Quick access</span>
              </div>
            </div>

            {/* Platform-specific instructions */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 w-full">
                <TabsTrigger value="ios" className="text-xs">iOS</TabsTrigger>
                <TabsTrigger value="android" className="text-xs">Android</TabsTrigger>
                <TabsTrigger value="mac" className="text-xs">Mac</TabsTrigger>
                <TabsTrigger value="windows" className="text-xs">Windows</TabsTrigger>
              </TabsList>

              {Object.entries(platformInstructions).map(([key, info]) => (
                <TabsContent key={key} value={key} className="mt-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {info.icon}
                      {info.title}
                    </div>

                    <div className="space-y-3">
                      {info.steps.map((step, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg"
                        >
                          <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            {index + 1}
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            {step.icon}
                            <span>{step.text}</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>

                    <p className="text-xs text-muted-foreground italic">
                      {info.note}
                    </p>
                  </div>
                </TabsContent>
              ))}
            </Tabs>

            {/* Native install button if available */}
            {canPrompt && (
              <Button onClick={promptInstall} className="w-full gap-2">
                <Download className="w-4 h-4" />
                Install Now
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PWAInstallPrompt;
