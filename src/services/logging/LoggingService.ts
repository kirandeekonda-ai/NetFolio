/**
 * Logging Service Implementation
 * 
 * Provides structured logging throughout the NetFolio application.
 * Replaces ad-hoc console.log statements with proper logging patterns.
 */

import { LogLevel, LogEntry, LoggingServiceInterface } from './types';

class LoggingServiceImpl implements LoggingServiceInterface {
  private context?: string;

  constructor(context?: string) {
    this.context = context;
  }

  private log(level: LogLevel, message: string, error?: Error, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      service: this.context,
      metadata,
      error
    };

    // In development, log to console with formatting
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(entry);
    }

    // In production, you could integrate with external logging services
    // like DataDog, LogRocket, or Sentry here
    if (process.env.NODE_ENV === 'production') {
      this.logToProduction(entry);
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = entry.timestamp.toISOString();
    const service = entry.service ? `[${entry.service}]` : '';
    const prefix = `${timestamp} ${service} [${entry.level.toUpperCase()}]`;

    switch (entry.level) {
      case 'debug':
        console.debug(`${prefix} ${entry.message}`, entry.metadata || '', entry.error || '');
        break;
      case 'info':
        console.info(`${prefix} ${entry.message}`, entry.metadata || '');
        break;
      case 'warn':
        console.warn(`${prefix} ${entry.message}`, entry.metadata || '', entry.error || '');
        break;
      case 'error':
        console.error(`${prefix} ${entry.message}`, entry.error || '', entry.metadata || '');
        break;
    }
  }

  private logToProduction(entry: LogEntry): void {
    // TODO: Integrate with production logging service
    // For now, still log critical errors to console in production
    if (entry.level === 'error') {
      console.error(JSON.stringify(entry));
    }
  }

  debug(message: string, metadata?: Record<string, any>): void {
    this.log('debug', message, undefined, metadata);
  }

  info(message: string, metadata?: Record<string, any>): void {
    this.log('info', message, undefined, metadata);
  }

  warn(message: string, metadata?: Record<string, any>): void {
    this.log('warn', message, undefined, metadata);
  }

  error(message: string, error?: Error, metadata?: Record<string, any>): void {
    this.log('error', message, error, metadata);
  }

  setContext(service: string): LoggingServiceInterface {
    return new LoggingServiceImpl(service);
  }
}

// Export singleton instance
export const LoggingService = new LoggingServiceImpl();

// Export class for contexts
export { LoggingServiceImpl };
