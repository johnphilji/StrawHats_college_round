import path from 'path';

/**
 * PATCHWORK style-context builder.
 *
 * When a user asks for a small change to a component, the generated patch must
 * look like it belongs on the current page. To make that possible without
 * weakening the single-file safety boundary, this service reads *read-only*
 * style information from the trusted repository and condenses it into a bounded
 * style guide for the LLM prompt:
 *
 *   - design tokens (CSS custom properties such as `--gold`, `--font-display`)
 *   - reusable global utility/component class names (`.btn`, `.container`, ...)
 *   - the target component's co-located stylesheet
 *
 * The component file is still the only file that may be edited; the style guide
 * simply tells the model which existing tokens/classes to reuse.
 */

export interface StyleContextReader {
  readFile(relativePath: string): Promise<string>;
}

export interface BuildStyleContextOptions {
  componentFilePath: string;
  sourceCode: string;
  reader: StyleContextReader;
  maxChars?: number;
}

/** Common global stylesheet locations for React/Vite/Next projects. */
const GLOBAL_STYLESHEET_CANDIDATES = [
  'src/index.css',
  'src/index.scss',
  'src/styles/index.css',
  'src/styles/index.scss',
  'src/App.css',
  'src/app.css',
  'src/global.css',
  'src/globals.css',
  'src/styles/global.css',
  'src/styles/globals.css',
  'src/main.css',
];

const STYLE_IMPORT_RE = /import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+\.(?:css|scss|sass|less))['"]/g;

const DEFAULT_MAX_CHARS = 6000;
const MAX_TOKENS = 120;
const MAX_CLASSES = 80;
const MAX_COMPONENT_CSS_CHARS = 3000;

function normalize(p: string): string {
  return p.replace(/\\/g, '/');
}

function isSafeRelative(p: string): boolean {
  const n = normalize(p);
  return (
    n.length > 0 &&
    !n.startsWith('/') &&
    !/^[a-zA-Z]:/.test(n) &&
    !n.split('/').includes('..')
  );
}

/** Extract relative CSS/SCSS/LESS imports from a component source file. */
export function extractStyleImports(source: string): string[] {
  if (!source) return [];
  const imports: string[] = [];
  const re = new RegExp(STYLE_IMPORT_RE);
  let match: RegExpExecArray | null;
  while ((match = re.exec(source)) !== null) {
    if (match[1]) imports.push(match[1]);
  }
  return imports;
}

/**
 * Resolve a relative style import against the component's directory, returning
 * a normalized repository-relative path or null for non-relative/unsafe paths.
 * Only co-located styles (`./...`) are accepted: walking up (`../`) is rejected
 * so the guide never references files outside the component's own directory.
 */
export function resolveRelativeImport(
  componentFilePath: string,
  specifier: string,
): string | null {
  if (!specifier.startsWith('.')) return null; // only co-located relative styles
  const segments = normalize(specifier).split('/');
  if (segments.includes('..')) return null; // never walk above the component dir
  const dir = path.posix.dirname(normalize(componentFilePath));
  const resolved = path.posix.normalize(path.posix.join(dir, specifier));
  return isSafeRelative(resolved) ? resolved : null;
}

/** Extract `--token: value;` declarations in document order (deduped, bounded). */
export function extractThemeTokens(css: string): string[] {
  if (!css) return [];
  const tokens = new Set<string>();
  const re = /(--[a-zA-Z0-9_-]+)\s*:\s*([^;{}]+);/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    const value = match[2].trim().replace(/\s+/g, ' ');
    if (value) tokens.add(`${match[1]}: ${value}`);
    if (tokens.size >= MAX_TOKENS) break;
  }
  return [...tokens];
}

/** Extract class selector names (including BEM `__`/`--` suffixes), deduped. */
export function extractClassSelectors(css: string): string[] {
  if (!css) return [];
  const classes = new Set<string>();
  const re = /(?:^|[\s,{>+~])(\.[a-zA-Z_-][a-zA-Z0-9_-]*)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(css)) !== null) {
    classes.add(match[1]);
    if (classes.size >= MAX_CLASSES) break;
  }
  return [...classes];
}

async function safeRead(reader: StyleContextReader, filePath: string): Promise<string> {
  try {
    return await reader.readFile(filePath);
  } catch {
    return '';
  }
}

async function readFirstExisting(
  reader: StyleContextReader,
  candidates: string[],
): Promise<{ path: string; css: string } | null> {
  for (const candidate of candidates) {
    const css = await safeRead(reader, candidate);
    if (css.trim()) return { path: candidate, css };
  }
  return null;
}

/**
 * Build a bounded, human-readable style guide for a component. Always resolves
 * safely: any unreadable file is skipped and an empty string is returned when no
 * usable style information is found.
 */
export async function buildStyleContext(options: BuildStyleContextOptions): Promise<string> {
  const { componentFilePath, sourceCode, reader } = options;
  const maxChars = options.maxChars ?? DEFAULT_MAX_CHARS;

  const global = await readFirstExisting(reader, GLOBAL_STYLESHEET_CANDIDATES);
  const globalPath = global ? normalize(global.path) : null;

  const specifiers = extractStyleImports(sourceCode);
  const coLocatedPaths: string[] = [];
  for (const specifier of specifiers) {
    const resolved = resolveRelativeImport(componentFilePath, specifier);
    if (!resolved) continue;
    if (globalPath && normalize(resolved) === globalPath) continue;
    if (coLocatedPaths.includes(resolved)) continue;
    coLocatedPaths.push(resolved);
  }

  const coLocated: Array<{ path: string; css: string }> = [];
  for (const filePath of coLocatedPaths) {
    const css = await safeRead(reader, filePath);
    if (css.trim()) coLocated.push({ path: filePath, css });
  }

  const combinedCss = [global?.css ?? '', ...coLocated.map((c) => c.css)].join('\n');
  const tokens = extractThemeTokens(combinedCss);
  const classes = extractClassSelectors(global?.css ?? '');

  if (!global && coLocated.length === 0 && tokens.length === 0 && classes.length === 0) {
    return '';
  }

  const lines: string[] = [];
  if (tokens.length > 0) {
    lines.push('Design tokens (CSS custom properties defined by the site — reuse these instead of hard-coded values):');
    for (const token of tokens) lines.push(`  ${token}`);
  }
  if (classes.length > 0) {
    lines.push('Reusable utility/component classes already on the site (prefer these):');
    lines.push(`  ${classes.join(', ')}`);
  }
  for (const part of coLocated) {
    lines.push(
      `Component stylesheet (${part.path}) — stay consistent with these existing rules:`,
    );
    lines.push(part.css.slice(0, MAX_COMPONENT_CSS_CHARS));
  }

  let text = lines.join('\n').trim();
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars).trimEnd()}\n… (style guide truncated)`;
  }
  return text;
}
