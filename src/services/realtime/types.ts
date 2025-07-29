/**
 * Real-Time Data Service Types
 * 
 * Type definitions for the NetFolio real-time data service
 */

export type RealtimeEventType = 'INSERT' | 'UPDATE' | 'DELETE';

export interface RealtimePayload<T = any> {
  eventType: RealtimeEventType;
  new: T;
  old: T;
  table: string;
  timestamp: string;
}

export interface ConnectionStatus {
  connected: boolean;
  lastHeartbeat?: Date;
  reconnectAttempts: number;
  error?: string;
}

export interface SubscriptionConfig {
  table: string;
  userId: string;
  events: RealtimeEventType[];
  filter?: string;
}

export interface RealtimeServiceInterface {
  // Connection management
  connect(): Promise<void>;
  disconnect(): void;
  getConnectionStatus(): ConnectionStatus;
  
  // Subscription management
  subscribe<T>(config: SubscriptionConfig, callback: (payload: RealtimePayload<T>) => void): string;
  unsubscribe(subscriptionId: string): void;
  unsubscribeAll(): void;

  // Health monitoring
  onConnectionChange(callback: (status: ConnectionStatus) => void): () => void;
  
  // Fallback mechanisms
  enablePollingFallback(enabled: boolean): void;
  setPollingInterval(interval: number): void;
}
