import winston from 'winston';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

// Safe JSON stringify that handles circular references
const safeStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular]';
      }
      seen.add(value);
    }
    // Don't log sensitive data
    if (key === 'password' || key === 'sask' || key === 'clientSecret' || key === 'cs') {
      return '[REDACTED]';
    }
    return value;
  });
};

const prettyFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${safeStringify(metadata)}`;
  }
  
  if (stack) {
    log += `\n${stack}`;
  }
  
  return log;
});

// Get config from environment
const logLevel = process.env.LOG_LEVEL || 'info';
const prettyLogs = process.env.PRETTY_LOGS === 'true';
const nodeEnv = process.env.NODE_ENV || 'development';

const logger = winston.createLogger({
  level: logLevel,
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    prettyLogs && nodeEnv === 'development'
      ? combine(colorize(), prettyFormat)
      : json(),
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
  ],
  exitOnError: false,
});

export default logger;