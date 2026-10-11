// Person 3 - Armaan (LLM and Git integration: tests for Groq patch generation and response parsing)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { buildGroqPrompt, generatePatchFromGroq, parseGroqResponse } from '../../src/integrations/llm/groq';

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.GROQ_API_KEY;
  delete process.env.GROQ_MODEL;
});

describe('Groq LLM integration', () => {
  it('builds a constrained prompt for a selected component', () => {
    const prompt = buildGroqPrompt({
      componentId: 'checkout-button',
      instruction: 'Change the button to green and rename it to Continue to Payment',
      componentContext: 'CheckoutButton.tsx',
    });

    expect(prompt).toContain('checkout-button');
    expect(prompt).toContain('Continue to Payment');
    expect(prompt).toContain('Only return JSON');
  });

  it('parses a valid Groq response into a patch preview', () => {
    const response = JSON.stringify({
      choices: [
        {
          message: {
            content: JSON.stringify({
              diff: '--- a/src/components/CheckoutButton.tsx\n+++ b/src/components/CheckoutButton.tsx\n@@\n- Checkout\n+ Continue to Payment',
              changedFiles: ['src/components/CheckoutButton.tsx'],
              summary: 'Updated checkout CTA.',
            }),
          },
        },
      ],
    });

    const parsed = parseGroqResponse(response);

    expect(parsed.diff).toContain('Continue to Payment');
    expect(parsed.changedFiles).toEqual(['src/components/CheckoutButton.tsx']);
  });

  it('generates a patch preview from Groq and returns a Git-safe branch name', async () => {
    process.env.GROQ_API_KEY = 'fake-key';
    process.env.GROQ_MODEL = 'openai/gpt-oss-20b';

    const groqPayload = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              diff: '--- a/src/components/CheckoutButton.tsx\n+++ b/src/components/CheckoutButton.tsx\n@@\n- Checkout\n+ Continue to Payment',
              changedFiles: ['src/components/CheckoutButton.tsx'],
              summary: 'Updated checkout CTA.',
            }),
          },
        },
      ],
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        text: async () => JSON.stringify(groqPayload),
      })
    );

    const result = await generatePatchFromGroq({
      componentId: 'checkout-button',
      instruction: 'Change the button to green and rename it to Continue to Payment',
      componentContext: 'CheckoutButton.tsx',
    });

    expect(result.status).toBe('success');
    expect(result.branch).toMatch(/^patchwork\/checkout-button-/);
    expect(result.diff).toContain('Continue to Payment');
    expect(result.changedFiles).toEqual(['src/components/CheckoutButton.tsx']);
  });
});
