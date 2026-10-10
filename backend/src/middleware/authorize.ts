import type { Request, Response, NextFunction } from 'express';

/**
 * Minimal resource-level authorization placeholder.
 * For now, checks that an authenticated user exists.
 * Future: verify user owns the project / has role.
 */
export function authorize(..._allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          requestId: req.requestId,
        },
      });
      return;
    }

    // If roles specified, check them (Supabase role claim)
    if (_allowedRoles.length > 0) {
      const userRole = (req.user as { role?: string }).role;
      if (userRole && !_allowedRoles.includes(userRole)) {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Insufficient permissions',
            requestId: req.requestId,
          },
        });
        return;
      }
      // If no role claim, allow but log – Supabase default users have no role
    }

    next();
  };
}

/**
 * Project ownership check – to be used when project is loaded.
 * Currently a stub that will be expanded once repository establishes ownership logic.
 */
export function authorizeProjectOwner(
  getOwnerId: (req: Request) => string | undefined
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required', requestId: req.requestId },
      });
      return;
    }
    const ownerId = getOwnerId(req);
    if (ownerId && ownerId !== req.user.id) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not own this resource', requestId: req.requestId },
      });
      return;
    }
    next();
  };
}
