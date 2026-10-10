// Person 3 - Armaan (LLM and Git integration: backend route for generating patch proposals from Groq)
import { Router } from 'express';
import { z } from 'zod';
import { optionalAuthenticate } from '../middleware/authenticate';
import { asyncHandler } from '../shared/utils/async-handler';
import { forbidden } from '../shared/errors/AppError';
import { editOrchestrationService } from '../services/edit-orchestration.service';
import { buildPatchBranchName } from '../integrations/git/branch';

const router = Router();

const generatePatchSchema = z.object({
  componentId: z.string().min(1, 'componentId is required'),
  instruction: z.string().min(1, 'instruction is required'),
  componentContext: z.string().optional(),
});

router.post(
  '/generate-patch',
  optionalAuthenticate,
  asyncHandler(async (req, res) => {
    const parsed = generatePatchSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Invalid patch request',
        details: parsed.error.flatten(),
      });
      return;
    }

    if ((process.env.NODE_ENV === 'production' || process.env.LLM_PROVIDER === 'groq') && !req.user) {
      throw forbidden('Patch generation requires authentication when a secret-backed provider is enabled.');
    }

    // Keep this compatibility route on the same trusted, validated pipeline as
    // the editor. Client-supplied componentContext is intentionally ignored.
    const proposal = await editOrchestrationService.generateEditProposal(
      parsed.data.componentId,
      parsed.data.instruction,
    );
    const success = proposal.validation.valid;
    res.status(success ? 200 : 422).json({
      success,
      data: {
        status: success ? 'success' : 'failed',
        message: proposal.summary || 'Patch proposal was rejected by validation.',
        branch: buildPatchBranchName(proposal.componentId),
        branchCreated: false,
        diff: proposal.diff,
        changedFiles: proposal.changedFiles,
        summary: proposal.summary,
        provider: proposal.provider,
        simulated: proposal.simulated,
        errors: proposal.validation.errors,
        warnings: [...proposal.validation.warnings, ...proposal.providerWarnings],
      },
    });
  })
);

export default router;
