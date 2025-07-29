/**
 * Logging Service Types
 * 
 * Type definitions for the NetFolio logging service
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
  service?: string;
  metadata?: Record<string, any>;
  error?: Error;
}

export interface LoggingServiceInterface {
  debug(message: string, metadata?: Record<string, any>): void;
  info(message: string, metadata?: Record<string, any>): void;
  warn(message: string, metadata?: Record<string, any>): void;
  error(message: string, error?: Error, metadata?: Record<string, any>): void;
  setContext(service: string): LoggingServiceInterface;
}
