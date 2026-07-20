export type SystemEvent =
  | 'PAYMENT_APPROVED'
  | 'USER_UPDATED'
  | 'SETTINGS_UPDATED'
  | 'MOVIE_UPDATED'
  | 'CACHE_INVALIDATED';

type EventHandler<T = any> = (payload: T) => Promise<void> | void;

class PubSubManager {
  private subscribers = new Map<SystemEvent, Set<EventHandler>>();

  /**
   * Subscribes a handler callback to a specific system event.
   */
  subscribe<T = any>(event: SystemEvent, handler: EventHandler<T>): () => void {
    if (!this.subscribers.has(event)) {
      this.subscribers.set(event, new Set());
    }
    this.subscribers.get(event)!.add(handler);

    // Return unsubscribe callback
    return () => {
      const handlers = this.subscribers.get(event);
      if (handlers) {
        handlers.delete(handler);
      }
    };
  }

  /**
   * Publishes an event to all subscribers asynchronously without blocking.
   */
  publish<T = any>(event: SystemEvent, payload: T): void {
    const handlers = this.subscribers.get(event);
    if (!handlers || handlers.size === 0) return;

    for (const handler of handlers) {
      try {
        Promise.resolve(handler(payload)).catch(err => {
          console.error(`[PubSub] Error in subscriber handler for event '${event}':`, err);
        });
      } catch (err) {
        console.error(`[PubSub] Synchronous error triggering subscriber for event '${event}':`, err);
      }
    }
  }
}

export const PubSubService = new PubSubManager();
