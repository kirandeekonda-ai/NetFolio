/**
 * Service Layer Test
 * 
 * Simple test to verify service layer functionality
 */

import { DatabaseService, LoggingService } from '../services';

// Test logging service
const logger = LoggingService.setContext('ServiceTest');
logger.info('Service layer test started');

// Test database service configuration
console.log('DatabaseService initialized:', !!DatabaseService);

export { DatabaseService, LoggingService };
