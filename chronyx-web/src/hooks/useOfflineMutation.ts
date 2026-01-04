import { useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addToOfflineQueue } from '@/lib/offlineSync';
import { toast } from 'sonner';

type MutationOperation = 'insert' | 'update' | 'delete' | 'upsert';

interface UseOfflineMutationOptions<T> {
  table: string;
  operation: MutationOperation;
  matchColumn?: string;
  invalidateQueries?: string[];
  onSuccess?: (data: T | null) => void;
  onError?: (error: Error) => void;
}

export const useOfflineMutation = <T extends Record<string, unknown>>({
  table,
  operation,
  matchColumn = 'id',
  invalidateQueries = [],
  onSuccess,
  onError,
}: UseOfflineMutationOptions<T>) => {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);

  const performMutation = async (data: T, matchValue?: unknown): Promise<T | null> => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase credentials');
    }

    const baseUrl = `${supabaseUrl}/rest/v1/${table}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=representation',
    };

    let response: Response;

    switch (operation) {
      case 'insert':
        response = await fetch(baseUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
        });
        break;
      case 'update':
        if (!matchValue) throw new Error('matchValue required for update');
        response = await fetch(`${baseUrl}?${matchColumn}=eq.${matchValue}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        });
        break;
      case 'delete':
        if (!matchValue) throw new Error('matchValue required for delete');
        response = await fetch(`${baseUrl}?${matchColumn}=eq.${matchValue}`, {
          method: 'DELETE',
          headers: { ...headers, 'Prefer': 'return=minimal' },
        });
        return null;
      case 'upsert':
        response = await fetch(baseUrl, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=representation' },
          body: JSON.stringify(data),
        });
        break;
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error);
    }

    const result = await response.json();
    return Array.isArray(result) ? result[0] : result;
  };

  const mutation = useMutation({
    mutationFn: async ({ data, matchValue }: { data: T; matchValue?: unknown }) => {
      return performMutation(data, matchValue);
    },
    onSuccess: (result) => {
      invalidateQueries.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: [key] });
      });
      onSuccess?.(result);
    },
    onError: (error: Error) => {
      onError?.(error);
    },
  });

  const mutate = useCallback(
    async (data: T, matchValue?: unknown) => {
      setIsPending(true);

      if (!navigator.onLine) {
        addToOfflineQueue({
          table,
          operation,
          data,
          matchColumn,
          matchValue,
        });
        
        toast.info('Saved offline', {
          description: 'Changes will sync when you reconnect',
        });
        
        invalidateQueries.forEach((key) => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
        
        setIsPending(false);
        return;
      }

      try {
        await mutation.mutateAsync({ data, matchValue });
      } catch (error) {
        if (error instanceof Error && error.message.includes('network')) {
          addToOfflineQueue({
            table,
            operation,
            data,
            matchColumn,
            matchValue,
          });
          
          toast.info('Saved offline', {
            description: 'Changes will sync when you reconnect',
          });
        } else {
          throw error;
        }
      } finally {
        setIsPending(false);
      }
    },
    [mutation, table, operation, matchColumn, invalidateQueries, queryClient]
  );

  return {
    mutate,
    isPending: isPending || mutation.isPending,
    isError: mutation.isError,
    error: mutation.error,
  };
};
