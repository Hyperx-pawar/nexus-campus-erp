// d:\tenant\lib\writeQueue.js
// Client-side offline write queue for eventual database consistency.

let statusCallbacks = [];
const QUEUE_KEY = 'nexus-erp-offline-writes';

// Get the current queue from localStorage
export function getPendingWrites() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read writeQueue from localStorage', e);
    return [];
  }
}

// Save the queue to localStorage and notify callbacks
function saveQueue(queue) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    notifyCallbacks(queue.length);
  } catch (e) {
    console.error('Failed to save writeQueue to localStorage', e);
  }
}

// Register callbacks to be notified on queue size changes
export function registerStatusCallback(cb) {
  statusCallbacks.push(cb);
  // Immediate initial invocation
  cb(getPendingWrites().length);
  return () => {
    statusCallbacks = statusCallbacks.filter(c => c !== cb);
  };
}

function notifyCallbacks(count) {
  statusCallbacks.forEach(cb => {
    try {
      cb(count);
    } catch (e) {
      console.error('Error in writeQueue status callback', e);
    }
  });
}

// Enqueue a write operation
export function enqueueWrite(table, action, payload, eqColumn = null, eqValue = null) {
  const queue = getPendingWrites();
  const newItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    table,
    action, // 'insert' | 'update' | 'delete'
    payload,
    eqColumn,
    eqValue
  };
  queue.push(newItem);
  saveQueue(queue);
  console.log(`[writeQueue] Enqueued offline write for table "${table}" (${action})`);
}

// Clear the queue
export function clearQueue() {
  saveQueue([]);
}

// Process the queue sequentially.
// If any sync fails due to network/connectivity error, we stop processing to maintain ordering.
export async function processQueue(supabase) {
  if (!supabase) return { success: false, error: 'No Supabase client provided' };
  
  const queue = getPendingWrites();
  if (queue.length === 0) return { success: true, count: 0 };
  
  console.log(`[writeQueue] Starting to process ${queue.length} pending writes...`);
  
  let successCount = 0;
  const remainingQueue = [...queue];
  
  for (const item of queue) {
    // Check connection status before running
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[writeQueue] Browser is offline, pausing sync.');
      break;
    }
    
    try {
      let query = supabase.from(item.table);
      let resultError = null;
      
      if (item.action === 'insert') {
        const { error } = await query.insert(item.payload);
        resultError = error;
      } else if (item.action === 'update') {
        if (!item.eqColumn || item.eqValue === null) {
          throw new Error('Update action requires eqColumn and eqValue');
        }
        const { error } = await query.update(item.payload).eq(item.eqColumn, item.eqValue);
        resultError = error;
      } else if (item.action === 'delete') {
        if (!item.eqColumn || item.eqValue === null) {
          throw new Error('Delete action requires eqColumn and eqValue');
        }
        const { error } = await query.delete().eq(item.eqColumn, item.eqValue);
        resultError = error;
      }
      
      if (resultError) {
        // If it's a network/fetch error, pause sync and keep item in queue
        if (resultError.message?.includes('Failed to fetch') || resultError.status === 0 || !navigator.onLine) {
          console.warn('[writeQueue] Network connection issue. Pausing sync.', resultError);
          break;
        }
        // If it's a validation or schema error, we log it but remove from queue to avoid blockages
        console.error(`[writeQueue] Operation failed permanently (removing from queue):`, resultError);
      }
      
      // Successfully processed (or permanently failed due to schema/validation)
      remainingQueue.shift();
      successCount++;
    } catch (err) {
      // Catch network type errors (e.g. Failed to fetch)
      if (err instanceof TypeError || err.message?.includes('Failed to fetch')) {
        console.warn('[writeQueue] Network error. Pausing queue processing.', err);
        break;
      }
      // Other unexpected errors: remove item to prevent infinite loops
      console.error('[writeQueue] Unexpected error processing queue item (removing):', err);
      remainingQueue.shift();
      successCount++;
    }
  }
  
  saveQueue(remainingQueue);
  return { success: remainingQueue.length === 0, count: successCount, remaining: remainingQueue.length };
}

// Auto-trigger sync when coming online
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[writeQueue] Browser went online. Triggering auto-sync...');
    // We will trigger processQueue using a global event or via the context provider hook
    const event = new CustomEvent('nexus-erp-sync-trigger');
    window.dispatchEvent(event);
  });
}
