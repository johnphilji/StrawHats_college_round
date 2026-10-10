import type { ResolvedComponentContext } from '../../types/component.types';
import { AppError } from '../../shared/errors/AppError';

/**
 * PATCHWORK patch-provider abstraction (Phase 5).
 *
 * This module separates patch *orchestration* (resolve → source → generate →
 * validate → isolated preview) from the actual model provider, so the local
 * end-to-end pipeline works today with a deterministic mock and a real LLM
 * adapter can be plugged in later without changing callers.
 *
 * Future-adapter contract (matches the teammate's Groq work on
 * `origin/llm-git-integration`, `backend/src/integrations/llm/groq.ts`):
 *   input  ~= GroqPatchRequest  { componentId, instruction, componentContext? }
 *   output ~= GroqPatchResult   { status, diff, changedFiles, summary, ... }
 * A future `GroqPatchProvider` should implement `PatchProvider` below and be
 * selected from `getPatchProvider()` when `LLM_PROVIDER` names it and its
 * credentials are present. No new API key or dependency is introduced here.
 */

export type PatchProviderName = 'mock';

export interface PatchProviderInput {
  componentId: string;
  instruction: string;
  context: ResolvedComponentContext;
}

export interface PatchProviderOutput {
  /** Which provider produced this patch. */
  provider: PatchProviderName | string;
  /** True when the output is simulated and NOT real LLM output. */
  simulated: boolean;
  /** Unified diff text (`--- a/<file>` / `+++ b/<file>` with `@@` hunks). */
  diff: string;
  /** Repository-relative files the diff touches. */
  changedFiles: string[];
  /** Short human-readable summary of the proposal. */
  summary: string;
  /** Non-fatal notes (e.g. "mock mode, no model called"). */
  warnings: string[];
}

export interface PatchProvider {
  readonly name: string;
  generate(input: PatchProviderInput): Promise<PatchProviderOutput>;
}

const MAX_INSTRUCTION_NOTE = 200;

/** Make user text safe to embed inside a JSX block comment. */
export function sanitizeInstructionNote(instruction: string): string {
  return instruction
    .replace(/\s+/g, ' ')
    .replace(/\*\//g, '* /')
    .trim()
    .slice(0, MAX_INSTRUCTION_NOTE);
}

/**
 * Build a minimal unified diff that inserts `insertLines` after 1-based
 * `afterLine` in `filePath`. Line numbers are computed from `source` so the
 * diff applies cleanly by construction.
 */
export function buildInsertionDiff(
  filePath: string,
  source: string,
  afterLine: number,
  insertLines: string[],
): string {
  const totalLines = source.split('\n').length;
  const header = [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -${afterLine},0 +${afterLine + 1},${insertLines.length} @@`,
  ];
  return [...header, ...insertLines.map((l) => `+${l}`), ''].join('\n');
}

/**
 * Deterministic mock provider for local development.
 *
 * Strategy: anchor on the line containing `data-patchwork-id="<componentId>"`
 * (guaranteed present by registry validation) and insert a JSX comment noting
 * the requested instruction. The comment never changes rendering, the diff is
 * always scoped to the single authorized file, and output is byte-identical
 * for identical inputs — making it testable. Output is always labelled
 * `simulated: true`; never present it as real LLM output.
 */
export class MockPatchProvider implements PatchProvider {
  readonly name = 'mock';

  async generate(input: PatchProviderInput): Promise<PatchProviderOutput> {
    const { componentId, instruction, context } = input;
    const anchor = `data-patchwork-id="${componentId}"`;
    const lines = context.sourceCode.split('\n');
    const anchorIndex = lines.findIndex((l) => l.includes(anchor));

    if (anchorIndex === -1) {
      return {
        provider: 'mock',
        simulated: true,
        diff: '',
        changedFiles: [],
        summary: '',
        warnings: [
          `Mock provider could not find anchor ${anchor} in ${context.filePath}. ` +
            'The registry mapping may be stale — regenerate the target manifest.',
        ],
      };
    }

    const note = sanitizeInstructionNote(instruction) || '(no instruction text)';
    const indent = lines[anchorIndex].match(/^\s*/)?.[0] ?? '';
    const commentLine = `${indent}{/* PATCHWORK simulated edit for "${componentId}": ${note} */}`;
    const diff = buildInsertionDiff(
      context.filePath,
      context.sourceCode,
      anchorIndex + 1,
      [commentLine],
    );

    return {
      provider: 'mock',
      simulated: true,
      diff,
      changedFiles: [context.filePath],
      summary:
        `Simulated edit for "${componentId}" in ${context.filePath} ` +
        `(inserted review note; no functional change).`,
      warnings: [
        'Mock provider active: no LLM was called. Set LLM_PROVIDER to a real ' +
          'provider adapter once one is configured.',
      ],
    };
  }
}

/**
 * Select the patch provider. Today this always resolves to the explicit mock
 * so local development never implies real generation. A future remote adapter
 * plugs in here: when `LLM_PROVIDER` names a configured remote provider,
 * return it; when it names something unknown or its credentials are missing,
 * throw a configuration error instead of silently falling back.
 */
export function getPatchProvider(): PatchProvider {
  const name = (process.env.LLM_PROVIDER ?? 'mock').trim().toLowerCase() || 'mock';
  if (name === 'mock') return new MockPatchProvider();
  throw new AppError(`Unknown patch provider '${name}'. Only 'mock' is configured; a real LLM adapter is not integrated yet.`, {
    statusCode: 500,
    code: 'CONFIGURATION_ERROR',
  });
}
