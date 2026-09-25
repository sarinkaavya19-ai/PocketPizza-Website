import type { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { sendError } from '../utils/response';

function rateLimitHandler(code: string, message: string) {
  return (req: Request, res: Response): void => {
    sendError(res, code, message, 429, undefined, String(req.id ?? ''));
  };
}

function rateLimitBody(message: string) {
  return (req: Request, res: Response): void => {
    res.status(429).json({
      success: false,
      error: { code: 'RATE_LIMITED', message },
      requestId: String(req.id ?? ''),
    });
  };
}

export const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many requests'),
});

export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = (req.body?.email as string)?.toLowerCase().trim() ?? 'unknown';
    return `${req.ip}:${email}`;
  },
  handler: rateLimitBody('Too many login attempts'),
});

export const orderCreateRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many order attempts'),
});

export const refreshRateLimit = rateLimit({
  windowMs: 30 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitBody('Too many refresh attempts'),
});