import { useState, useEffect } from "react";
import { Cloud, CloudOff, RefreshCw, Check } from "lucide-react";
import { getQueueStatus } from "@/lib/offlineSync";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const SyncStatusIndicator = () => {
  const { isOnline, isSyncing, syncData } = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateCount = () => {
      const status = getQueueStatus();
      setPendingCount(status.count);
    };

    updateCount();
    
    // Poll for updates every 2 seconds
    const interval = setInterval(updateCount, 2000);
    
    // Also listen for storage events
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "offline-mutation-queue") {
        updateCount();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const getStatusInfo = () => {
    if (!isOnline) {
      return {
        icon: CloudOff,
        label: "Offline",
        description: pendingCount > 0 
          ? `${pendingCount} pending change${pendingCount > 1 ? "s" : ""} will sync when online`
          : "You're offline. Changes will sync when connected.",
        className: "text-amber-500",
      };
    }

    if (isSyncing) {
      return {
        icon: RefreshCw,
        label: "Syncing...",
        description: "Syncing your changes with the server",
        className: "text-primary animate-spin",
      };
    }

    if (pendingCount > 0) {
      return {
        icon: RefreshCw,
        label: `${pendingCount} pending`,
        description: `${pendingCount} change${pendingCount > 1 ? "s" : ""} waiting to sync`,
        className: "text-amber-500",
      };
    }

    return {
      icon: Check,
      label: "Synced",
      description: "All changes are synced",
      className: "text-green-500",
    };
  };

  const status = getStatusInfo();
  const Icon = status.icon;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => isOnline && pendingCount > 0 && syncData()}
            disabled={!isOnline || pendingCount === 0}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium transition-colors",
              "hover:bg-accent/50 disabled:cursor-default",
              status.className
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {pendingCount > 0 && (
              <span className="min-w-[1.25rem] h-5 flex items-center justify-center bg-current/10 rounded-full text-[10px]">
                {pendingCount}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[200px]">
          <p className="font-medium">{status.label}</p>
          <p className="text-xs text-muted-foreground">{status.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
