import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { WifiOff, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';

export const OfflineIndicator = () => {
  const { isOnline, syncData } = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 backdrop-blur-sm text-amber-950 px-4 py-2 flex items-center justify-center gap-3"
        >
          <WifiOff className="h-4 w-4" />
          <span className="text-sm font-medium">You're offline — changes will sync when reconnected</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={syncData}
            className="h-7 px-2 text-amber-950 hover:bg-amber-600/50"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Retry
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
