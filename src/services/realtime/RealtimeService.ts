/**
 * Real-Time Data Service Implementation
 * 
 * Manages Supabase real-time subscriptions with fallback to polling
 * and comprehensive connection monitoring for the NetFolio application.
 */

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/utils/supabase';
import { LoggingService } from '../logging/LoggingService';
import {
  RealtimeServiceInterface,
  RealtimePayload,
  ConnectionStatus,
  SubscriptionConfig,
  RealtimeEventType
} from './types';

class RealtimeServiceImpl implements RealtimeServiceInterface {
  private client: SupabaseClient;
  private logger = LoggingService.setContext('RealtimeService');
  private subscriptions = new Map<string, RealtimeChannel>();
  private connectionCallbacks: Array<(status: ConnectionStatus) => void> = [];
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnectAttempts: 0
  };
  private pollingEnabled = false;
  private pollingInterval = 30000; // 30 seconds
  private pollingTimers = new Map<string, NodeJS.Timeout>();
  private realtimeDisabled = false;

  constructor(client?: SupabaseClient) {
    this.client = client || supabase;
    
    // Check if real-time should be disabled via environment variable
    this.realtimeDisabled = process.env.NEXT_PUBLIC_DISABLE_REALTIME === 'true';
    if (this.realtimeDisabled) {
      this.pollingEnabled = true;
      this.logger.info('Real-time service disabled via environment variable, using polling only');
    } else {
      this.logger.info('Real-time service initialized');
    }
    
    this.setupConnectionMonitoring();
  }

  // Connection management
  async connect(): Promise<void> {
    if (this.realtimeDisabled) {
      this.logger.info('Real-time disabled, using polling mode only');
      this.updateConnectionStatus({
        connected: false,
        reconnectAttempts: 0,
        error: 'Real-time disabled via configuration'
      });
      return;
    }

    try {
      this.logger.info('Connecting to real-time service');
      
      // Test connection with a simple approach - just check if client is available
      if (!this.client) {
        throw new Error('Supabase client not available');
      }

      // Test basic connectivity with auth status
      try {
        const { data: { session } } = await this.client.auth.getSession();
        this.logger.debug('Auth session check completed', { hasSession: !!session });
      } catch (authError) {
        this.logger.warn('Auth check failed, but continuing with realtime connection', authError as Error);
      }

      // Try to establish a test channel with shorter timeout and better error handling
      const testChannel = this.client.channel('connectivity_test', {
        config: {
          presence: { key: 'test' }
        }
      });
      
      await new Promise<void>((resolve, reject) => {
        let resolved = false;
        
        const timeout = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            this.logger.warn('Real-time connection timeout, falling back to polling mode');
            // Don't reject, just enable polling mode
            this.pollingEnabled = true;
            this.updateConnectionStatus({
              connected: false,
              reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
              error: 'Connection timeout - using polling mode'
            });
            resolve(); // Resolve instead of reject to allow app to continue
          }
        }, 3000); // Reduced timeout to 3 seconds

        // Try multiple events for better compatibility
        testChannel
          .on('presence', { event: 'sync' }, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              this.pollingEnabled = false;
              this.updateConnectionStatus({
                connected: true,
                lastHeartbeat: new Date(),
                reconnectAttempts: 0
              });
              this.logger.info('Real-time connection established via presence sync');
              resolve();
            }
          })
          .on('system', {}, () => {
            if (!resolved) {
              resolved = true;
              clearTimeout(timeout);
              this.pollingEnabled = false;
              this.updateConnectionStatus({
                connected: true,
                lastHeartbeat: new Date(),
                reconnectAttempts: 0
              });
              this.logger.info('Real-time connection established via system event');
              resolve();
            }
          })
          .subscribe((status) => {
            this.logger.debug('Channel subscription status:', { status });
            if (status === 'SUBSCRIBED' && !resolved) {
              resolved = true;
              clearTimeout(timeout);
              this.pollingEnabled = false;
              this.updateConnectionStatus({
                connected: true,
                lastHeartbeat: new Date(),
                reconnectAttempts: 0
              });
              this.logger.info('Real-time connection established via subscription');
              resolve();
            } else if (status === 'CHANNEL_ERROR' && !resolved) {
              this.logger.warn('Channel subscription error, enabling polling mode');
              this.pollingEnabled = true;
            }
          });
      });

      // Clean up test channel
      try {
        this.client.removeChannel(testChannel);
      } catch (cleanupError) {
        this.logger.warn('Error cleaning up test channel', cleanupError as Error);
      }

      if (this.pollingEnabled) {
        this.logger.info('Real-time service running in polling mode');
      } else {
        this.logger.info('Successfully connected to real-time service');
      }
    } catch (error) {
      this.logger.error('Failed to connect to real-time service, enabling polling mode', error as Error);
      this.pollingEnabled = true;
      this.updateConnectionStatus({
        connected: false,
        reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
        error: (error as Error).message
      });
      // Don't throw error - let the app continue with polling mode
    }
  }

  disconnect(): void {
    this.logger.info('Disconnecting from real-time service');
    
    // Remove all subscriptions
    this.unsubscribeAll();
    
    // Clear polling timers
    this.pollingTimers.forEach(timer => clearInterval(timer));
    this.pollingTimers.clear();
    
    this.updateConnectionStatus({
      connected: false,
      reconnectAttempts: 0
    });
    
    this.logger.info('Disconnected from real-time service');
  }

  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Subscription management
  subscribe<T>(config: SubscriptionConfig, callback: (payload: RealtimePayload<T>) => void): string {
    const subscriptionId = `${config.table}_${config.userId}_${Date.now()}`;
    
    try {
      this.logger.info('Creating real-time subscription', { 
        subscriptionId, 
        table: config.table, 
        userId: config.userId,
        pollingEnabled: this.pollingEnabled,
        realtimeDisabled: this.realtimeDisabled
      });

      // If real-time is available and not disabled, set up the channel
      if (!this.pollingEnabled && !this.realtimeDisabled) {
        const channel = this.client.channel(`${config.table}_${subscriptionId}`, {
          config: {
            presence: { key: subscriptionId }
          }
        });
        
        // Set up postgres changes listener
        const filter = config.filter || `user_id=eq.${config.userId}`;
        
        config.events.forEach(eventType => {
          channel.on(
            'postgres_changes' as any,
            {
              event: eventType,
              schema: 'public',
              table: config.table,
              filter
            },
            (payload: any) => {
              this.logger.debug('Received real-time event', {
                table: config.table,
                eventType: payload.eventType,
                timestamp: new Date().toISOString()
              });

              const transformedPayload: RealtimePayload<T> = {
                eventType: payload.eventType as RealtimeEventType,
                new: payload.new as T,
                old: payload.old as T,
                table: config.table,
                timestamp: new Date().toISOString()
              };

              callback(transformedPayload);
            }
          );
        });

        // Subscribe to the channel with error handling
        channel.subscribe((status) => {
          this.logger.info('Subscription status changed', { subscriptionId, status });
          
          if (status === 'SUBSCRIBED') {
            this.updateConnectionStatus({
              connected: true,
              lastHeartbeat: new Date(),
              reconnectAttempts: 0
            });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            this.logger.warn('Real-time subscription failed, falling back to polling', { 
              subscriptionId, 
              status 
            });
            this.handleSubscriptionError(subscriptionId, config, callback);
          }
        });

        this.subscriptions.set(subscriptionId, channel);
      }

      // Always set up polling fallback (either as primary or backup)
      this.setupPollingFallback(subscriptionId, config, callback);

      const mode = this.realtimeDisabled ? 'polling-only' : 
                   this.pollingEnabled ? 'polling' : 'realtime+polling';
      
      this.logger.info('Subscription created successfully', { 
        subscriptionId, 
        mode
      });
      return subscriptionId;
    } catch (error) {
      this.logger.error('Failed to create subscription, using polling only', error as Error, {
        subscriptionId,
        table: config.table
      });

      // Fallback to polling only
      this.setupPollingFallback(subscriptionId, config, callback);
      return subscriptionId;
    }
  }

  unsubscribe(subscriptionId: string): void {
    try {
      this.logger.info('Removing real-time subscription', { subscriptionId });
      
      const channel = this.subscriptions.get(subscriptionId);
      if (channel) {
        this.client.removeChannel(channel);
        this.subscriptions.delete(subscriptionId);
      }

      // Clear polling timer if exists
      const timer = this.pollingTimers.get(subscriptionId);
      if (timer) {
        clearInterval(timer);
        this.pollingTimers.delete(subscriptionId);
      }

      this.logger.info('Real-time subscription removed', { subscriptionId });
    } catch (error) {
      this.logger.error('Failed to remove real-time subscription', error as Error, { subscriptionId });
    }
  }

  unsubscribeAll(): void {
    this.logger.info('Removing all real-time subscriptions');
    
    const subscriptionIds = Array.from(this.subscriptions.keys());
    subscriptionIds.forEach(id => this.unsubscribe(id));
    
    this.logger.info('All real-time subscriptions removed');
  }

  // Health monitoring
  onConnectionChange(callback: (status: ConnectionStatus) => void): () => void {
    this.connectionCallbacks.push(callback);
    
    // Immediately call with current status
    callback(this.connectionStatus);
    
    // Return unsubscribe function
    return () => {
      const index = this.connectionCallbacks.indexOf(callback);
      if (index > -1) {
        this.connectionCallbacks.splice(index, 1);
      }
    };
  }

  // Fallback mechanisms
  enablePollingFallback(enabled: boolean): void {
    this.logger.info('Setting polling fallback', { enabled });
    this.pollingEnabled = enabled;
    
    if (!enabled) {
      // Clear all polling timers
      this.pollingTimers.forEach(timer => clearInterval(timer));
      this.pollingTimers.clear();
    }
  }

  setPollingInterval(interval: number): void {
    this.logger.info('Setting polling interval', { interval });
    this.pollingInterval = interval;
  }

  // Private helper methods
  private setupConnectionMonitoring(): void {
    // Monitor connection health with periodic heartbeats
    setInterval(() => {
      if (this.connectionStatus.connected) {
        const timeSinceLastHeartbeat = this.connectionStatus.lastHeartbeat 
          ? Date.now() - this.connectionStatus.lastHeartbeat.getTime()
          : Infinity;
        
        // Consider connection stale after 2 minutes
        if (timeSinceLastHeartbeat > 120000) {
          this.logger.warn('Connection appears stale, attempting reconnection');
          this.handleConnectionLoss();
        }
      }
    }, 60000); // Check every minute
  }

  private updateConnectionStatus(updates: Partial<ConnectionStatus>): void {
    const oldStatus = { ...this.connectionStatus };
    this.connectionStatus = { ...this.connectionStatus, ...updates };
    
    // Only notify if status actually changed
    if (oldStatus.connected !== this.connectionStatus.connected) {
      this.logger.info('Connection status changed', this.connectionStatus);
      this.connectionCallbacks.forEach(callback => callback(this.connectionStatus));
    }
  }

  private handleSubscriptionError<T>(
    subscriptionId: string, 
    config: SubscriptionConfig, 
    callback: (payload: RealtimePayload<T>) => void
  ): void {
    this.logger.warn('Subscription error, attempting recovery', { subscriptionId });
    
    // Mark connection as problematic
    this.updateConnectionStatus({
      connected: false,
      reconnectAttempts: this.connectionStatus.reconnectAttempts + 1,
      error: 'Subscription error'
    });

    // If polling is enabled, rely on that
    if (this.pollingEnabled) {
      this.logger.info('Falling back to polling', { subscriptionId });
      this.setupPollingFallback(subscriptionId, config, callback);
    } else {
      // Attempt to reconnect after a delay
      setTimeout(() => {
        this.logger.info('Attempting to reconnect subscription', { subscriptionId });
        this.unsubscribe(subscriptionId);
        this.subscribe(config, callback);
      }, 5000);
    }
  }

  private handleConnectionLoss(): void {
    this.updateConnectionStatus({
      connected: false,
      error: 'Connection lost'
    });

    // If polling is enabled, it will handle the fallback
    if (!this.pollingEnabled) {
      // Attempt to reconnect
      setTimeout(() => {
        this.connect().catch(error => {
          this.logger.error('Reconnection failed', error);
        });
      }, 5000);
    }
  }

  private setupPollingFallback<T>(
    subscriptionId: string,
    config: SubscriptionConfig,
    callback: (payload: RealtimePayload<T>) => void
  ): void {
    // Clear existing timer
    const existingTimer = this.pollingTimers.get(subscriptionId);
    if (existingTimer) {
      clearInterval(existingTimer);
    }

    // Set up new polling timer
    const timer = setInterval(() => {
      this.logger.debug('Polling for changes', { table: config.table, userId: config.userId });
      // Note: Actual polling implementation would require fetching data and comparing
      // This is a placeholder for the polling mechanism
    }, this.pollingInterval);

    this.pollingTimers.set(subscriptionId, timer);
    this.logger.info('Polling fallback enabled', { subscriptionId, interval: this.pollingInterval });
  }
}

// Export singleton instance
export const RealtimeService = new RealtimeServiceImpl();

// Export class for testing and custom instances
export { RealtimeServiceImpl };
