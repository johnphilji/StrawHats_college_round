import { randomUUID } from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.headers['x-request-id'];
  const requestId =
    typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Attach to logger context if needed later
  next();
}
