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

  it('instructs the model to stay style-consistent while honoring the user request', () => {
    const prompt = buildGroqPrompt({
      componentId: 'hero-heading',
      instruction: 'Make the heading gold',
      componentContext: '{ "currentSource": "<h1>Persia Darbar</h1>" }',
      styleContext: 'Design tokens:\n  --gold: #d4af37\n  --maroon: #4a0e1e',
    });

    expect(prompt).toContain('STYLE CONSISTENCY');
    expect(prompt).toContain('Reuse the design tokens');
    expect(prompt).toContain('User instruction always takes priority');
    expect(prompt).toContain('--gold: #d4af37');
    expect(prompt).toContain('Make the heading gold');
    expect(prompt).toContain('Only return JSON');
  });

  it('falls back to source inference when no style guide is provided', () => {
    const prompt = buildGroqPrompt({
      componentId: 'hero-heading',
      instruction: 'x',
      componentContext: '{ "currentSource": "<h1>Persia Darbar</h1>" }',
    });
    expect(prompt).toContain('infer the visual style from the component context source code');
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
