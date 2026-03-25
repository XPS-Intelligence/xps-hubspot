import winston from 'winston';
import path from 'path';

const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

// ─── Console Format ───────────────────────────────────────────────────────────

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  const stackStr = stack ? `\n${stack}` : '';
  return `[${ts}] ${level}: ${message}${metaStr}${stackStr}`;
});

// ─── Transports ───────────────────────────────────────────────────────────────

const transports: winston.transport[] = [];

if (!isTest) {
  transports.push(
    new winston.transports.Console({
      format: combine(
        colorize({ all: !isProd }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }),
        isProd ? json() : consoleFormat,
      ),
    }),
  );
}

if (isProd) {
  transports.push(
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 10 * 1024 * 1024, // 10 MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(timestamp(), errors({ stack: true }), json()),
      maxsize: 10 * 1024 * 1024,
      maxFiles: 10,
    }),
  );
}

// ─── Logger Instance ──────────────────────────────────────────────────────────

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL ?? (isProd ? 'info' : 'debug'),
  transports,
  exitOnError: false,
});

// ─── Child Logger Factory ─────────────────────────────────────────────────────

export function createLogger(context: string): winston.Logger {
  return logger.child({ context });
}

export default logger;
