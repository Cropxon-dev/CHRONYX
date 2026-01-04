export type OfflineMutation = {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete' | 'upsert';
  data: Record<string, unknown>;
  matchColumn?: string;
  matchValue?: unknown;
  timestamp: number;
  retryCount: number;
};

const STORAGE_KEY = 'chronyx_offline_queue';
const MAX_RETRIES = 3;

// Get queue from localStorage
export const getOfflineQueue = (): OfflineMutation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Save queue to localStorage
const saveOfflineQueue = (queue: OfflineMutation[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
};

// Add mutation to queue
export const addToOfflineQueue = (mutation: Omit<OfflineMutation, 'id' | 'timestamp' | 'retryCount'>): void => {
  const queue = getOfflineQueue();
  const newMutation: OfflineMutation = {
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    retryCount: 0,
  };
  queue.push(newMutation);
  saveOfflineQueue(queue);
  console.log('[OfflineSync] Added to queue:', newMutation);
};

// Remove mutation from queue
export const removeFromOfflineQueue = (id: string): void => {
  const queue = getOfflineQueue();
  const filtered = queue.filter((m) => m.id !== id);
  saveOfflineQueue(filtered);
};

// Clear entire queue
export const clearOfflineQueue = (): void => {
  localStorage.removeItem(STORAGE_KEY);
};

// Process a single mutation using raw fetch for dynamic tables
const processMutation = async (mutation: OfflineMutation): Promise<boolean> => {
  try {
    const { table, operation, data, matchColumn, matchValue } = mutation;
    
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('[OfflineSync] Missing Supabase credentials');
      return false;
    }

    const baseUrl = `${supabaseUrl}/rest/v1/${table}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Prefer': 'return=minimal',
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
        if (!matchColumn || matchValue === undefined) {
          console.error('[OfflineSync] Update requires matchColumn and matchValue');
          return false;
        }
        response = await fetch(`${baseUrl}?${matchColumn}=eq.${matchValue}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify(data),
        });
        break;
      case 'delete':
        if (!matchColumn || matchValue === undefined) {
          console.error('[OfflineSync] Delete requires matchColumn and matchValue');
          return false;
        }
        response = await fetch(`${baseUrl}?${matchColumn}=eq.${matchValue}`, {
          method: 'DELETE',
          headers,
        });
        break;
      case 'upsert':
        response = await fetch(baseUrl, {
          method: 'POST',
          headers: { ...headers, 'Prefer': 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify(data),
        });
        break;
      default:
        console.error('[OfflineSync] Unknown operation:', operation);
        return false;
    }

    if (!response.ok) {
      const error = await response.text();
      console.error('[OfflineSync] Mutation failed:', error);
      return false;
    }
    
    console.log('[OfflineSync] Mutation succeeded:', mutation.id);
    return true;
  } catch (error) {
    console.error('[OfflineSync] Mutation error:', error);
    return false;
  }
};

// Process all queued mutations
export const processOfflineQueue = async (): Promise<{
  success: number;
  failed: number;
  remaining: number;
}> => {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return { success: 0, failed: 0, remaining: 0 };
  }
  
  console.log('[OfflineSync] Processing queue:', queue.length, 'items');
  
  let success = 0;
  let failed = 0;
  const remaining: OfflineMutation[] = [];
  
  // Sort by timestamp to process in order
  const sortedQueue = [...queue].sort((a, b) => a.timestamp - b.timestamp);
  
  for (const mutation of sortedQueue) {
    const result = await processMutation(mutation);
    
    if (result) {
      success++;
    } else {
      mutation.retryCount++;
      
      if (mutation.retryCount < MAX_RETRIES) {
        remaining.push(mutation);
      } else {
        failed++;
        console.warn('[OfflineSync] Max retries reached for:', mutation.id);
      }
    }
  }
  
  saveOfflineQueue(remaining);
  
  return { success, failed, remaining: remaining.length };
};

// Get queue status
export const getQueueStatus = (): { count: number; oldestTimestamp: number | null } => {
  const queue = getOfflineQueue();
  
  if (queue.length === 0) {
    return { count: 0, oldestTimestamp: null };
  }
  
  const oldest = Math.min(...queue.map((m) => m.timestamp));
  return { count: queue.length, oldestTimestamp: oldest };
};
