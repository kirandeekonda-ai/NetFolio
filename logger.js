const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFile = path.join(logsDir, 'dev.log');

// Override console.log to also write to file
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

console.log = function(...args) {
  const timestamp = new Date().toISOString();
  const message = args.join(' ');
  const logEntry = `[${timestamp}] LOG: ${message}\n`;
  
  // Write to file
  fs.appendFileSync(logFile, logEntry);
  
  // Also write to console
  originalConsoleLog.apply(console, args);
};

console.error = function(...args) {
  const timestamp = new Date().toISOString();
  const message = args.join(' ');
  const logEntry = `[${timestamp}] ERROR: ${message}\n`;
  
  // Write to file
  fs.appendFileSync(logFile, logEntry);
  
  // Also write to console
  originalConsoleError.apply(console, args);
};

console.log('Logger initialized');
