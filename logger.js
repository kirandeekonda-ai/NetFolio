const fs = require('fs');
const path = require('path');

class SimpleLogger {
  constructor() {
    this.logDir = path.join(process.cwd(), 'logs');
    this.logFile = path.join(this.logDir, 'dev.log');
    
    // Ensure logs directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Store original console methods
    this.originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info
    };
    
    this.init();
  }
  
  init() {
    // Override console methods
    console.log = (...args) => {
      this.writeToFile('LOG', args);
      this.originalConsole.log(...args);
    };
    
    console.error = (...args) => {
      this.writeToFile('ERROR', args);
      this.originalConsole.error(...args);
    };
    
    console.warn = (...args) => {
      this.writeToFile('WARN', args);
      this.originalConsole.warn(...args);
    };
    
    console.info = (...args) => {
      this.writeToFile('INFO', args);
      this.originalConsole.info(...args);
    };
    
    console.log('🔍 Logger initialized - Console output will be written to', this.logFile);
  }
  
  writeToFile(level, args) {
    const timestamp = new Date().toISOString();
    const message = args.map(arg => 
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ');
    
    const logEntry = `[${timestamp}] [${level}] ${message}\n`;
    
    // Append to log file
    fs.appendFileSync(this.logFile, logEntry);
  }
}

// Initialize logger
new SimpleLogger();
