import { createLogger, format, transports } from 'winston'
import DailyRotateFile from 'winston-daily-rotate-file'
import { join, resolve } from 'path'
import { mkdirSync } from 'fs'

let logDir: string

function getLogDir(): string {
  if (!logDir) {
    try {
      const { app } = require('electron') as typeof import('electron')
      logDir = join(app.getPath('userData'), 'logs')
    } catch {
      logDir = resolve('./logs')
    }
    mkdirSync(logDir, { recursive: true })
  }
  return logDir
}

const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  format.errors({ stack: true }),
  format.printf(({ timestamp, level, message, context, ...meta }) => {
    const ctx = context ? `[${context}]` : ''
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} ${level.toUpperCase().padEnd(5)} ${ctx} ${message}${metaStr}`
  })
)

function createAppLogger() {
  const dir = getLogDir()

  return createLogger({
    level: 'info',
    format: customFormat,
    transports: [
      new transports.Console({
        format: format.combine(
          format.colorize(),
          customFormat
        )
      }),
      new DailyRotateFile({
        dirname: dir,
        filename: 'app-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        maxFiles: '7d',
        maxSize: '20m',
        zippedArchive: true
      }),
      new DailyRotateFile({
        dirname: dir,
        filename: 'error-%DATE%.log',
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        maxFiles: '30d',
        maxSize: '10m',
        zippedArchive: true
      })
    ]
  })
}

let _logger: ReturnType<typeof createAppLogger> | null = null

function getLogger() {
  if (!_logger) {
    _logger = createAppLogger()
  }
  return _logger
}

export function setLogLevel(level: string): void {
  getLogger().level = level
}

export const logger = {
  error: (message: string, context?: string, meta?: Record<string, unknown>) =>
    getLogger().error(message, { context, ...meta }),
  warn: (message: string, context?: string, meta?: Record<string, unknown>) =>
    getLogger().warn(message, { context, ...meta }),
  info: (message: string, context?: string, meta?: Record<string, unknown>) =>
    getLogger().info(message, { context, ...meta }),
  debug: (message: string, context?: string, meta?: Record<string, unknown>) =>
    getLogger().debug(message, { context, ...meta })
}

export function createContextLogger(context: string) {
  return {
    error: (message: string, meta?: Record<string, unknown>) =>
      logger.error(message, context, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      logger.warn(message, context, meta),
    info: (message: string, meta?: Record<string, unknown>) =>
      logger.info(message, context, meta),
    debug: (message: string, meta?: Record<string, unknown>) =>
      logger.debug(message, context, meta)
  }
}
