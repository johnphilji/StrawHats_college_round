// Person 3 - Armaan (LLM and Git integration: Groq-powered patch generation, parsing, and validation)
export type GroqPatchRequest = {
  componentId: string;
  instruction: string;
  componentContext?: string;
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

export function buildPatchBranchName(componentId: string): string {
  const base = sanitizeBranchSegment(componentId);
  const suffix = Math.random().toString(36).slice(2, 8);
  return `patch/${base}-${suffix}`;
}

export function buildGroqPrompt(input: GroqPatchRequest): string {
  const componentId = input.componentId || 'unknown-component';
  const instruction = input.instruction || 'Keep the requested change minimal and targeted.';
  const context = input.componentContext || 'The component is mapped to a known source file in this controlled repo.';

  return [
    'You are PATCHWORK, a constrained website patch generator.',
    'Your job is to return a minimal code diff for a single known component.',
    `Component ID: ${componentId}`,
    `Component context: ${context}`,
    `User instruction: ${instruction}`,
    'Rules:',
    '- Only edit the mapped file for this component.',
    '- Avoid unrelated files, config changes, or broad refactors.',
    '- Keep the patch small and easy to validate.',
    '- Do not rewrite the entire file unless absolutely necessary.',
    '- Return only JSON with fields: diff, changedFiles, summary.',
    'JSON format example:',
    '{"diff":"--- a/src/components/CheckoutButton.tsx\\n+++ b/src/components/CheckoutButton.tsx\\n@@\\n- Checkout\\n+ Continue to Payment","changedFiles":["src/components/CheckoutButton.tsx"],"summary":"Updated checkout CTA copy."}',
    'Only return JSON, no markdown fences, no prose outside the JSON object.',
  ].join('\n');
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

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        status: 'failed',
        message: 'Groq rejected the patch generation request.',
        branch,
        diff: '',
        changedFiles: [],
        errors: [errorText || 'Unknown Groq error'],
        warnings: [],
      };
    }

    const payload = (await response.json()) as {
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
