import winston from 'winston';

const { combine, timestamp, errors, json, printf, colorize } = winston.format;

const prettyFormat = printf(({ level, message, timestamp, stack, ...metadata }) => {
  let log = `${timestamp} [${level}]: ${message}`;
  
  if (Object.keys(metadata).length > 0) {
    log += ` ${JSON.stringify(metadata)}`;
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