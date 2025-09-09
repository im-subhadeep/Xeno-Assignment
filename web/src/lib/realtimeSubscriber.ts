import redisConnection from './redis-pubsub';

export class RealtimeSubscriber {
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();

  constructor() {
    this.setupSubscriptions();
  }

  private setupSubscriptions() {
    // Subscribe to campaign updates
    redisConnection.subscribe('campaign-updates', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to campaign-updates:', err);
      } else {
        console.log(`Subscribed to campaign-updates. Total subscriptions: ${count}`);
      }
    });

    // Subscribe to delivery status updates
    redisConnection.subscribe('delivery-status', (err, count) => {
      if (err) {
        console.error('Failed to subscribe to delivery-status:', err);
      } else {
        console.log(`Subscribed to delivery-status. Total subscriptions: ${count}`);
      }
    });

    // Handle incoming messages
    redisConnection.on('message', (channel, message) => {
      try {
        const data = JSON.parse(message);
        this.notifySubscribers(channel, data);
      } catch (error) {
        console.error('Error parsing Redis message:', error);
      }
    });
  }

  // Subscribe to specific channel updates
  subscribe(channel: string, callback: (data: any) => void) {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    this.subscribers.get(channel)!.add(callback);

    // Return unsubscribe function
    return () => {
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(callback);
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel);
        }
      }
    };
  }

  private notifySubscribers(channel: string, data: any) {
    const channelSubscribers = this.subscribers.get(channel);
    if (channelSubscribers) {
      channelSubscribers.forEach((callback) => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in subscriber callback:', error);
        }
      });
    }
  }

  // Method to get campaign status in real-time
  subscribeToCampaignUpdates(campaignId: string, callback: (data: any) => void) {
    return this.subscribe('campaign-updates', (data) => {
      if (data.campaignId === campaignId) {
        callback(data);
      }
    });
  }

  // Method to get delivery status in real-time
  subscribeToDeliveryUpdates(communicationLogId: string, callback: (data: any) => void) {
    return this.subscribe('delivery-status', (data) => {
      if (data.communicationLogId === communicationLogId) {
        callback(data);
      }
    });
  }

  async close() {
    await redisConnection.unsubscribe();
    this.subscribers.clear();
  }
}

// Singleton instance
export const realtimeSubscriber = new RealtimeSubscriber();
