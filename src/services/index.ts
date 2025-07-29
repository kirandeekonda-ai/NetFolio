/**
 * Service Layer Index
 * 
 * This file exports all service layer abstractions for the NetFolio application.
 * The service layer provides a clean abstraction over external dependencies
 * and implements consistent error handling and logging patterns.
 */

// Core Services
export { DatabaseService, DatabaseServiceImpl } from './database/DatabaseService';
export { LLMService, LLMServiceImpl } from './llm/LLMService';
export { LoggingService, LoggingServiceImpl } from './logging/LoggingService';
export { RealtimeService, RealtimeServiceImpl } from './realtime/RealtimeService';

// Database Types
export type { 
  DatabaseServiceInterface,
  TransactionData,
  BankAccountData,
  UserPreferencesData,
  BankStatementData
} from './database/types';

// LLM Types
export type {
  LLMServiceInterface,
  LLMProvider,
  LLMConfig,
  TransactionExtractionResult,
  BalanceExtractionResult
} from './llm/types';

// Logging Types
export type {
  LogLevel,
  LogEntry,
  LoggingServiceInterface
} from './logging/types';

// Real-time Types
export type {
  RealtimeServiceInterface,
  RealtimePayload,
  ConnectionStatus,
  SubscriptionConfig,
  RealtimeEventType
} from './realtime/types';
