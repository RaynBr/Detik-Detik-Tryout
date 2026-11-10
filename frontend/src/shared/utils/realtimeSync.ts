/**
 * Real-time event broadcaster for cross-tab and cross-window state synchronization.
 * Triggers instant re-validation on student dashboards and teacher monitoring pages.
 */
export const broadcastExamUpdate = () => {
  try {
    // 1. Storage event for cross-tab detection
    localStorage.setItem('cbt_exam_schedule_updated', Date.now().toString());

    // 2. BroadcastChannel for same-origin tabs and windows
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('cbt_exam_sync_channel');
      bc.postMessage({ type: 'exam_updated', timestamp: Date.now() });
      bc.close();
    }
  } catch (e) {
    // Graceful fallback if storage or BroadcastChannel is restricted
  }
};

