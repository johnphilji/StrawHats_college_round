import { createHmac, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { getEnv } from '../config/env';
import { AppError, unauthorized } from '../shared/errors/AppError';

const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

type RequestWithRawBody = Parameters<RequestHandler>[0] & { rawBody?: Buffer };

export function workerSignature(secret: string, timestamp: string, method: string, path: string, rawBody: string | Buffer): string {
  const body = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody);
  return `sha256=${createHmac('sha256', secret)
    .update(`${timestamp}.${method.toUpperCase()}.${path}.`)
    .update(body)
    .digest('hex')}`;
}

export const authenticateWorker: RequestHandler = (req, _res, next) => {
  const secret = getEnv().INTERNAL_WORKER_SECRET;
  if (!secret || Buffer.byteLength(secret) < 32) {
    next(new AppError('Trusted worker callbacks are not configured.', { statusCode: 503, code: 'CONFIGURATION_ERROR' }));
    return;
  }

  const timestamp = req.header('x-patchwork-timestamp') ?? '';
  const signature = req.header('x-patchwork-signature') ?? '';
  const rawBody = (req as RequestWithRawBody).rawBody;
  const timestampSeconds = Number(timestamp);
  const contentEncoding = req.header('content-encoding');
  // body-parser inflates compressed bodies before invoking its verify hook.
  // Refuse compression so the bytes authenticated here are the transmitted JSON bytes.
  if ((contentEncoding && contentEncoding.toLowerCase() !== 'identity') || !/^\d{10}$/.test(timestamp) || !Number.isSafeInteger(timestampSeconds) || Math.abs(Date.now() / 1000 - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS || !rawBody || !/^sha256=[a-f0-9]{64}$/.test(signature)) {
    next(unauthorized('Invalid trusted worker signature.'));
    return;
  }

  const path = req.originalUrl.split('?', 1)[0];
  const expected = Buffer.from(workerSignature(secret, timestamp, req.method, path, rawBody));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    next(unauthorized('Invalid trusted worker signature.'));
    return;
  }
  next();
};
