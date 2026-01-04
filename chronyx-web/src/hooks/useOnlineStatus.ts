import { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { processOfflineQueue, getQueueStatus } from '@/lib/offlineSync';

export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const syncData = useCallback(async () => {
    setIsSyncing(true);
    
    try {
      // First, process any queued offline mutations
      const queueStatus = getQueueStatus();
      
      if (queueStatus.count > 0) {
        toast.info('Syncing offline changes...', {
          description: `${queueStatus.count} pending changes`,
        });
        
        const result = await processOfflineQueue();
        
        if (result.success > 0) {
          toast.success('Offline changes synced', {
            description: `${result.success} changes saved successfully`,
          });
        }
        
        if (result.failed > 0) {
          toast.error('Some changes failed to sync', {
            description: `${result.failed} changes could not be saved`,
          });
        }
      }
      
      // Then invalidate all queries to refetch fresh data
      await queryClient.invalidateQueries();
      
      toast.success('Synced with server', {
        description: 'Your data is up to date',
        duration: 3000,
      });
    } catch (error) {
      console.error('[OnlineStatus] Sync error:', error);
      toast.error('Sync failed', {
        description: 'Please try again',
      });
    } finally {
      setIsSyncing(false);
    }
  }, [queryClient]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOffline) {
        toast.info('Back online', {
          description: 'Syncing your data...',
          duration: 2000,
        });
        syncData();
      }
      setWasOffline(false);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setWasOffline(true);
      toast.warning('You are offline', {
        description: 'Changes will sync when you reconnect',
        duration: 4000,
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [wasOffline, syncData]);

  return { isOnline, isSyncing, syncData };
};
