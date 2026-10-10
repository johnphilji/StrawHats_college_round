import type { Request, Response, NextFunction } from 'express';
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';
import { logger } from '../config/logger';

export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Missing or malformed Authorization header. Expected: Bearer <token>',
        requestId: req.requestId,
      },
    });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Empty bearer token',
        requestId: req.requestId,
      },
    });
    return;
  }

  if (!isSupabaseConfigured()) {
    logger.error('Authentication attempted but Supabase is not configured');
    res.status(503).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Authentication is not configured on this server',
        requestId: req.requestId,
      },
    });
    return;
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    res.status(503).json({
      success: false,
      error: {
        code: 'CONFIGURATION_ERROR',
        message: 'Supabase client unavailable',
        requestId: req.requestId,
      },
    });
    return;
  }

  try {
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data?.user) {
      logger.warn({ err: error, requestId: req.requestId }, 'Invalid Supabase token');
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          requestId: req.requestId,
        },
      });
      return;
    }

    // Derive identity strictly from verified token – never trust body
    req.user = {
      ...data.user,
      id: data.user.id,
      email: data.user.email ?? undefined,
      role: (data.user as unknown as { role?: string }).role,
      aud: data.user.aud,
    } as unknown as typeof req.user;

    next();
  } catch (err) {
    logger.error({ err, requestId: req.requestId }, 'Error verifying Supabase token');
    res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Failed to verify token',
        requestId: req.requestId,
      },
    });
  }
}

// Optional authentication – populates req.user if token present and valid, otherwise continues as anonymous
export async function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    next();
    return;
  }
  const token = authHeader.slice(7).trim();
  if (!token || !isSupabaseConfigured()) {
    next();
    return;
  }
  const supabase = getSupabaseClient();
  if (!supabase) {
    next();
    return;
  }
  const { data } = await supabase.auth.getUser(token);
  if (data?.user) {
    req.user = {
      ...data.user,
      id: data.user.id,
      email: data.user.email ?? undefined,
      aud: data.user.aud,
    } as unknown as typeof req.user;
  }
  next();
}
