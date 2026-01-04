import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';

export const PWAUpdater = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered:', r);
      // Check for updates every hour
      if (r) {
        setInterval(() => {
          r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      toast.info('App update available', {
        description: 'A new version is ready to install',
        duration: Infinity,
        action: (
          <Button
            size="sm"
            onClick={() => {
              updateServiceWorker(true);
              setNeedRefresh(false);
            }}
            className="ml-2"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Update
          </Button>
        ),
      });
    }
  }, [needRefresh, updateServiceWorker, setNeedRefresh]);

  return null;
};
