import winston from 'winston';

const level = (process.env.LOG_LEVEL || 'info').toLowerCase();

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return stack
      ? `[${timestamp}] ${level}: ${message}\n${stack}${metaStr}`
      : `[${timestamp}] ${level}: ${message}${metaStr}`;
  })
);

export const logger = winston.createLogger({
  level,
  transports: [new winston.transports.Console({ format: consoleFormat })],
});

export default logger;
