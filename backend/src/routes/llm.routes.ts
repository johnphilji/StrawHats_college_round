// Person 3 - Armaan (LLM and Git integration: backend route for generating patch proposals from Groq)
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../shared/utils/async-handler';
import { generatePatchFromGroq } from '../integrations/llm/groq';

const router = Router();

const generatePatchSchema = z.object({
  componentId: z.string().min(1, 'componentId is required'),
  instruction: z.string().min(1, 'instruction is required'),
  componentContext: z.string().optional(),
});

router.post(
  '/generate-patch',
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

    const result = await generatePatchFromGroq(parsed.data);

    res.status(result.status === 'success' ? 200 : 400).json({
      success: result.status === 'success',
      data: result,
    });
  })
);

export default router;
