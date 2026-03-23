import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

type Listener = () => void;

interface TableSubscription {
  channel: RealtimeChannel;
  listeners: Set<Listener>;
}

/**
 * Centralized Realtime Service
 * 
 * Opens ONE channel per table and distributes events to multiple listeners.
 * This reduces WebSocket connections from ~15 to ~6 per session.
 */
class RealtimeService {
  private subscriptions = new Map<string, TableSubscription>();
  private debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

  /**
   * Subscribe to changes on a table. Returns an unsubscribe function.
   * Events are debounced by 500ms per table to avoid burst invalidations.
   */
  subscribe(tableName: string, listener: Listener): () => void {
    if (!this.subscriptions.has(tableName)) {
      this.createSubscription(tableName);
    }

    const sub = this.subscriptions.get(tableName)!;
    sub.listeners.add(listener);

    return () => {
      sub.listeners.delete(listener);
      // If no more listeners, tear down the channel
      if (sub.listeners.size === 0) {
        this.removeSubscription(tableName);
      }
    };
  }

  private createSubscription(tableName: string) {
    const channelName = `central-${tableName}`;
    console.log(`[RealtimeService] Creating channel for ${tableName}`);

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: tableName },
        () => {
          this.notifyListeners(tableName);
        }
      )
      .subscribe();

    this.subscriptions.set(tableName, {
      channel,
      listeners: new Set(),
    });
  }

  private notifyListeners(tableName: string) {
    // Debounce: wait 500ms before notifying to batch rapid changes
    const existing = this.debounceTimers.get(tableName);
    if (existing) clearTimeout(existing);

    this.debounceTimers.set(tableName, setTimeout(() => {
      this.debounceTimers.delete(tableName);
      const sub = this.subscriptions.get(tableName);
      if (sub) {
        sub.listeners.forEach(listener => {
          try { listener(); } catch (e) { console.error(`[RealtimeService] Listener error for ${tableName}:`, e); }
        });
      }
    }, 500));
  }

  private removeSubscription(tableName: string) {
    const sub = this.subscriptions.get(tableName);
    if (sub) {
      console.log(`[RealtimeService] Removing channel for ${tableName}`);
      supabase.removeChannel(sub.channel);
      this.subscriptions.delete(tableName);
    }
    const timer = this.debounceTimers.get(tableName);
    if (timer) {
      clearTimeout(timer);
      this.debounceTimers.delete(tableName);
    }
  }

  /** Tear down all subscriptions (e.g. on logout) */
  removeAll() {
    this.subscriptions.forEach((_, tableName) => this.removeSubscription(tableName));
  }
}

export const realtimeService = new RealtimeService();
