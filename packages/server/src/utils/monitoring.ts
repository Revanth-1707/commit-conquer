
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

type LogLevel = 'info' | 'warn' | 'error';

type MonitoringEvent = {
  level: LogLevel;
  event: string;
  timestamp: string;
  requestId?: string;
  method?: string;
  path?: string;
  statusCode?: number;
  durationMs?: number;
  userAgent?: string;
  ip?: string;
  message?: string;
  stack?: string;
  [key: string]: unknown;
};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      startedAt?: bigint;
    }
  }
}

const isProduction = process.env.NODE_ENV === 'production';
const shouldLogInfo = isProduction || process.env.MONITORING_VERBOSE === 'true';

function write(event: MonitoringEvent) {
  const line = JSON.stringify(event);

  if (event.level === 'error') {
    console.error(line);
    return;
  }

  if (event.level === 'warn') {
    console.warn(line);
    return;
  }

  if (shouldLogInfo) {
    console.info(line);
  }
}

export const Monitoring = {
  info(event: Omit<MonitoringEvent, 'level' | 'timestamp'>) {
    write({ level: 'info', timestamp: new Date().toISOString(), ...event });
  },

  warn(event: Omit<MonitoringEvent, 'level' | 'timestamp'>) {
    write({ level: 'warn', timestamp: new Date().toISOString(), ...event });
  },

  error(event: Omit<MonitoringEvent, 'level' | 'timestamp'>) {
    write({ level: 'error', timestamp: new Date().toISOString(), ...event });
  },
};

export function requestMonitoring(req: Request, res: Response, next: NextFunction) {
  req.requestId = req.header('x-request-id') ?? crypto.randomUUID();
  req.startedAt = process.hrtime.bigint();

  res.setHeader('x-request-id', req.requestId);

  res.on('finish', () => {
    const durationMs = req.startedAt
      ? Number(process.hrtime.bigint() - req.startedAt) / 1_000_000
      : undefined;

    const payload = {
      event: 'http_request',
      requestId: req.requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: durationMs === undefined ? undefined : Math.round(durationMs),
      userAgent: req.get('user-agent'),
      ip: req.ip,
    };

    if (res.statusCode >= 500) {
      Monitoring.error(payload);
    } else if (res.statusCode >= 400) {
      Monitoring.warn(payload);
    } else {
      Monitoring.info(payload);
    }
  });

  next();
}
