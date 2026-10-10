import type { Request, Response } from 'express';
import { editOrchestrationService } from '../../services/edit-orchestration.service';
import { forbidden } from '../../shared/errors/AppError';

/**
 * Local edit-proposal controller (Phase 4).
 *
 * Accepts ONLY a registered component ID plus the user's instruction.
 * Filesystem paths are never accepted from the client — the authorized file
 * always comes from the trusted registry inside the orchestration service.
 */
export const editsController = {
  /**
   * POST /api/edits/generate
   * Resolve → source → (mock) generate → validate → isolated preview.
   * Never writes to the target repository. In production, requires auth
   * (same gate as the component source preview endpoint).
   */
  async generate(req: Request, res: Response) {
    if (process.env.NODE_ENV === 'production' && !req.user) {
      throw forbidden('Edit generation requires authentication in production');
    }
    const { componentId, instruction } = req.body as {
      componentId: string;
      instruction: string;
    };
    const proposal = await editOrchestrationService.generateEditProposal(
      componentId,
      instruction,
    );
    res.status(200).json({ success: true, data: proposal });
  },
};
