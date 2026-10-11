// Person 3 - Armaan (LLM and Git integration: Groq-powered patch generation, parsing, and validation)
import { buildPatchBranchName } from '../git/branch';

export { buildPatchBranchName } from '../git/branch';

export type GroqPatchRequest = {
  componentId: string;
  instruction: string;
  componentContext?: string;
  /** Bounded site style guide (tokens, reusable classes, component CSS). */
  styleContext?: string;
};

export type GroqPatchResult = {
  status: 'success' | 'failed' | 'conflict';
  message: string;
  branch: string;
  diff: string;
  changedFiles: string[];
  summary?: string;
  errors: string[];
  warnings: string[];
};

export function sanitizeBranchSegment(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'patch';
}

export function buildGroqPrompt(input: GroqPatchRequest): string {
  const componentId = input.componentId || 'unknown-component';
  const instruction = input.instruction || 'Keep the requested change minimal and targeted.';
  const context = input.componentContext || 'The component is mapped to a known source file in this controlled repo.';
  const styleContext = input.styleContext?.trim();

  const sections = [
    'You are PATCHWORK, a constrained website patch generator.',
    'Your job is to return a minimal code diff for a single known component.',
    `Component ID: ${componentId}`,
    `Component context: ${context}`,
    `Site style guide (ground truth for how the current page looks):${styleContext ? `\n${styleContext}` : ' none available — infer the visual style from the component context source code.'}`,
    `User instruction (this is the change the user actually wants): ${instruction}`,
    'Rules:',
    '- Only edit the mapped file for this component.',
    '- Avoid unrelated files, config changes, or broad refactors.',
    '- Keep the patch small and easy to validate.',
    '- Do not rewrite the entire file unless absolutely necessary.',
    '- STYLE CONSISTENCY (critical): the result must look like part of the current page and must not look odd or out of place.',
    '  - Reuse the design tokens (CSS custom properties) from the site style guide instead of inventing new colors, fonts, or sizes.',
    '  - Reuse existing utility/component classes instead of adding throwaway styling.',
    '  - Match the current page design language: typography, spacing, radius, shadows, and tone should stay consistent with the existing component.',
    '  - The User instruction always takes priority: if it conflicts with the style guide, apply the user intent in the closest style-consistent way (e.g. "make it green" -> use the site green token or a matching class, not an unrelated neon web color).',
    '  - You may only modify the mapped component file. Prefer existing classes; when a visual change needs a value, express it with a CSS variable reference or a minimal inline style so the change stays within this single file.',
    '  - Never introduce unrelated colors, fonts, images, external assets, or new dependencies.',
    '- Return only JSON with fields: diff, changedFiles, summary.',
    '- The diff MUST be a valid unified diff. Every hunk must begin with a header of the form "@@ -<oldStart>,<oldCount> +<newStart>,<newCount> @@" (include real numbers), followed by context lines prefixed with a single space, removals prefixed with "-", and additions prefixed with "+".',
    '- Include at least one unchanged context line above and below the changed lines so the hunk can be located in the source. Never emit a bare "@@" header.',
    '- Use the exact mapped file path in BOTH the "--- a/<path>" and "+++ b/<path>" headers.',
    'JSON format example:',
    '{"diff":"--- a/src/components/CheckoutButton.tsx\\n+++ b/src/components/CheckoutButton.tsx\\n@@ -1,3 +1,3 @@\\n export function CheckoutButton() {\\n-  return <button>Checkout</button>;\\n+  return <button>Continue to Payment</button>;\\n }","changedFiles":["src/components/CheckoutButton.tsx"],"summary":"Updated checkout CTA copy."}',
    'Only return JSON, no markdown fences, no prose outside the JSON object.',
  ];

  return sections.join('\n');
}

export function parseGroqResponse(raw: string): { diff: string; changedFiles: string[]; summary: string } {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as {
      diff?: string;
      changedFiles?: string[];
      summary?: string;
      choices?: Array<{ message?: { content?: string } }>;
    };

    if (parsed.choices && Array.isArray(parsed.choices)) {
      const content = parsed.choices[0]?.message?.content ?? '';
      if (content) {
        return parseGroqResponse(content);
      }
    }

    if (parsed.diff || parsed.changedFiles || parsed.summary) {
      return {
        diff: parsed.diff || '',
        changedFiles: Array.isArray(parsed.changedFiles) ? parsed.changedFiles : [],
        summary: parsed.summary || 'Updated the selected component.',
      };
    }
  } catch {
    // fall through to text-based extraction below
  }

  const diffMatch = cleaned.match(/(?:diff|patch)[\s\S]*?```?([\s\S]*?)```?$/i);
  const diff = diffMatch?.[1]?.trim() || cleaned.trim();
  const changedFilesMatch = cleaned.match(/['\"]changedFiles['\"]\s*:\s*\[([\s\S]*?)\]/i);
  const changedFiles = changedFilesMatch ? changedFilesMatch[1].match(/['\"]([^'\"]+)['\"]/g)?.map((item) => item.replace(/['\"]/g, '')) ?? [] : [];

  return {
    diff,
    changedFiles,
    summary: 'Applied a targeted model-generated patch.',
  };
}

export async function generatePatchFromGroq(input: GroqPatchRequest): Promise<GroqPatchResult> {
  const apiKey = process.env.GROQ_API_KEY;
  const branch = buildPatchBranchName(input.componentId);

  if (!apiKey) {
    return {
      status: 'failed',
      message: 'Groq API key is not configured.',
      branch,
      diff: '',
      changedFiles: [],
      errors: ['GROQ_API_KEY not configured'],
      warnings: ['Patch generation is disabled until the Groq API key is supplied.'],
    };
  }

  const prompt = buildGroqPrompt(input);

  const model = process.env.GROQ_MODEL || 'openai/gpt-oss-20b';
  const requestBody: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 1024,
  };
  // Reasoning models (e.g. openai/gpt-oss-20b) otherwise spend the entire
  // max_tokens budget on hidden reasoning and return an empty message content.
  if (/gpt-oss/i.test(model)) requestBody.reasoning_effort = 'low';

  try {
    const request: RequestInit = {
      method: 'POST',
      signal: AbortSignal.timeout(30_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    };
    let response: Response | undefined;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch('https://api.groq.com/openai/v1/chat/completions', request);
      } catch (error) {
        if (attempt === 1) throw error;
        continue;
      }
      if (response.ok || ![502, 503, 504].includes(response.status) || attempt === 1) break;
    }
    if (!response) throw new Error('Groq request did not return a response.');

    if (!response.ok) {
      return {
        status: 'failed',
        message: 'Groq rejected the patch generation request.',
        branch,
        diff: '',
        changedFiles: [],
        errors: [`Groq returned HTTP ${response.status}.`],
        warnings: [],
      };
    }

    const responseText = await response.text();
    if (responseText.length > 1_000_000) {
      return {
        status: 'failed', message: 'Groq returned an oversized response.', branch,
        diff: '', changedFiles: [], errors: ['Groq response exceeded the 1 MB limit.'], warnings: [],
      };
    }
    const payload = JSON.parse(responseText) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content ?? '';
    if (!content) {
      return {
        status: 'failed',
        message: 'Groq returned an empty response.',
        branch,
        diff: '',
        changedFiles: [],
        errors: ['Empty Groq model output'],
        warnings: [],
      };
    }

    const parsed = parseGroqResponse(content);

    if (!parsed.diff || parsed.changedFiles.length === 0) {
      return {
        status: 'failed',
        message: 'Groq returned an unusable patch payload.',
        branch,
        diff: '',
        changedFiles: [],
        errors: ['Model output did not contain a usable diff or changedFiles list'],
        warnings: [],
      };
    }

    return {
      status: 'success',
      message: 'Patch generated successfully via Groq.',
      branch,
      diff: parsed.diff,
      changedFiles: parsed.changedFiles,
      summary: parsed.summary,
      errors: [],
      warnings: [],
    };
  } catch (error) {
    return {
      status: 'failed',
      message: 'Groq patch generation failed unexpectedly.',
      branch,
      diff: '',
      changedFiles: [],
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: [],
    };
  }
}
