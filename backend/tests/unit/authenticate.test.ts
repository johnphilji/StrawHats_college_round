import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/authenticate';

// Mock supabase
vi.mock('../../src/lib/supabase', () => ({
  isSupabaseConfigured: vi.fn(),
  getSupabaseClient: vi.fn(),
}));

import { isSupabaseConfigured, getSupabaseClient } from '../../src/lib/supabase';

function mockRes() {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn(),
  } as unknown as Response;
  return res;
}

describe('authenticate middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should 401 when no Authorization header', async () => {
    const req = { headers: {}, requestId: 'test-1' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('should 401 when malformed Bearer', async () => {
    const req = { headers: { authorization: 'Bad token' }, requestId: 'test-2' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should 503 when Supabase not configured', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(false);
    const req = { headers: { authorization: 'Bearer valid.token.here' }, requestId: 'test-3' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(503);
  });

  it('should 401 when Supabase says token invalid', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } }),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);

    const req = { headers: { authorization: 'Bearer invalid' }, requestId: 'test-4' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('should call next and set req.user when token valid', async () => {
    vi.mocked(isSupabaseConfigured).mockReturnValue(true);
    vi.mocked(getSupabaseClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com', aud: 'authenticated' } },
          error: null,
        }),
      },
    } as unknown as ReturnType<typeof getSupabaseClient>);

    const req = { headers: { authorization: 'Bearer goodtoken' }, requestId: 'test-5' } as unknown as Request;
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user?.id).toBe('user-123');
  });
});
