import path from 'path';

/**
 * PATCHWORK patch validation (Phase 6).
 *
 * Validates a proposed unified diff BEFORE it is treated as applicable:
 *  - non-empty, parses as a unified diff with `---`/`+++` file headers
 *  - touches exactly the single authorized registry file (no new files,
 *    no deletions, no absolute paths, no `..` escapes, no unregistered files)
 *  - supported file extension only
 *  - hunk headers well-formed, removal/context lines match the current source
 *  - sane size caps (rejects mass rewrites)
 *
 * The validator never executes code and never touches the repository: the
 * caller applies accepted hunks to an isolated in-memory/temp copy.
 */

export interface ParsedHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  body: string[];
}

export interface ParsedDiff {
  oldPath: string;
  newPath: string;
  hunks: ParsedHunk[];
}

export interface PatchValidationResult {
  valid: boolean;
  changedFiles: string[];
  errors: string[];
  warnings: string[];
  addedLines: number;
  removedLines: number;
}

const MAX_HUNKS = 10;
const MAX_ADDED_LINES = 40;
const MAX_REMOVED_LINES = 40;

const ALLOWED_EXTENSIONS = new Set([
  '.tsx', '.ts', '.jsx', '.js', '.css', '.scss', '.sass', '.less',
  '.json', '.html', '.svg',
]);

const HUNK_HEADER = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;

function stripDiffPrefix(p: string): string {
  return p.replace(/^([ab]\/)/, '');
}

function isUnsafePath(p: string): string | null {
  const trimmed = p.trim().replace(/\\/g, '/');
  if (!trimmed) return 'empty file path in diff header';
  if (trimmed === '/dev/null') return 'file creation/deletion marker (/dev/null)';
  if (path.isAbsolute(trimmed) || trimmed.startsWith('/') || /^[a-zA-Z]:/.test(trimmed)) {
    return `absolute path not allowed: '${p}'`;
  }
  if (trimmed.split('/').includes('..')) return `path traversal sequence in '${p}'`;
  return null;
}

export function parseUnifiedDiff(diff: string): { parsed?: ParsedDiff; errors: string[] } {
  const errors: string[] = [];
  if (!diff || !diff.trim()) return { errors: ['diff is empty'] };

  const lines = diff.split('\n');
  let oldPath: string | undefined;
  let newPath: string | undefined;
  const hunks: ParsedHunk[] = [];
  let current: ParsedHunk | null = null;

  for (const line of lines) {
    if (line.startsWith('--- ')) {
      oldPath = line.slice(4).trim();
      continue;
    }
    if (line.startsWith('+++ ')) {
      newPath = line.slice(4).trim();
      continue;
    }
    const m = line.match(HUNK_HEADER);
    if (m) {
      current = {
        oldStart: Number(m[1]),
        oldCount: m[2] === undefined ? 1 : Number(m[2]),
        newStart: Number(m[3]),
        newCount: m[4] === undefined ? 1 : Number(m[4]),
        body: [],
      };
      hunks.push(current);
      continue;
    }
    if (current && (line.startsWith(' ') || line.startsWith('-') || line.startsWith('+'))) {
      current.body.push(line);
      continue;
    }
    if (line === '' && current) {
      // A bare empty line is an empty context line only when the hunk still
      // expects old lines; otherwise it is trailing/separator whitespace
      // (e.g. a file's final newline) and must not poison validation.
      const consumedOld = current.body.filter(
        (l) => l.startsWith(' ') || l.startsWith('-'),
      ).length;
      if (consumedOld < current.oldCount) current.body.push(' ');
      continue;
    }
    if (line.trim() === '' || line.startsWith('\\')) continue;
    // Lines outside hunks (e.g. "diff --git" preamble) are ignored.
  }

  if (!oldPath || !newPath) errors.push('diff must contain unified file headers (--- a/<file> / +++ b/<file>)');
  if (hunks.length === 0) errors.push('diff contains no @@ hunks');
  return errors.length > 0 ? { errors } : { parsed: { oldPath: oldPath!, newPath: newPath!, hunks }, errors };
}

/**
 * Repairs under-specified hunk headers that some LLMs emit (notably a bare
 * `@@` with no line ranges) by computing real line numbers from the current
 * `sourceCode`. This keeps strict validation intact: the normalized diff is
 * still fully re-validated against the authorized file before anything is
 * applied, and no change is trusted just because it parsed.
 */
export function normalizeUnifiedDiff(diff: string, sourceCode: string): string {
  if (!diff || !diff.trim()) return diff;
  const sourceLines = sourceCode.split('\n');
  const lines = diff.split('\n');
  const out: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const headerLike = line.startsWith('@@') && !HUNK_HEADER.test(line);
    if (!headerLike) {
      out.push(line);
      i += 1;
      continue;
    }

    const body: string[] = [];
    let j = i + 1;
    while (
      j < lines.length &&
      !lines[j].startsWith('@@') &&
      !lines[j].startsWith('--- ') &&
      !lines[j].startsWith('+++ ')
    ) {
      body.push(lines[j]);
      j += 1;
    }
    while (body.length > 0 && body[body.length - 1] === '') body.pop();

    const oldCount = body.filter((l) => l.startsWith(' ') || l.startsWith('-')).length;
    const newCount = body.filter((l) => l.startsWith(' ') || l.startsWith('+')).length;
    if (oldCount === 0 && newCount === 0) {
      i = j;
      continue;
    }

    const anchorIndex = body.findIndex((l) => l.startsWith(' ') || l.startsWith('-'));
    let oldStart = 1;
    if (anchorIndex >= 0) {
      const anchorText = body[anchorIndex].slice(1);
      const precedingOldLines = body
        .slice(0, anchorIndex)
        .filter((l) => l.startsWith(' ') || l.startsWith('-')).length;
      const found = sourceLines.findIndex((sourceLine) => sourceLine === anchorText);
      if (found >= 0) oldStart = Math.max(1, found + 1 - precedingOldLines);
    }

    out.push(`@@ -${oldStart},${oldCount} +${oldStart},${newCount} @@`);
    out.push(...body);
    i = j;
  }

  return out.join('\n');
}

/**
 * Validate `diff` against the single authorized registry file and the
 * current `sourceCode` of that file.
 */
export function validatePatchDiff(
  diff: string,
  authorizedFilePath: string,
  sourceCode: string,
): PatchValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { parsed, errors: parseErrors } = parseUnifiedDiff(diff);
  if (!parsed) {
    return { valid: false, changedFiles: [], errors: parseErrors, warnings, addedLines: 0, removedLines: 0 };
  }

  const oldFile = stripDiffPrefix(parsed.oldPath);
  const newFile = stripDiffPrefix(parsed.newPath);

  for (const [label, p] of [['---', parsed.oldPath], ['+++', parsed.newPath]] as const) {
    const unsafe = isUnsafePath(p);
    if (unsafe) errors.push(`${label} header: ${unsafe}`);
  }
  if (oldFile !== authorizedFilePath) {
    errors.push(`diff targets '${oldFile}' but only '${authorizedFilePath}' is authorized for this component`);
  }
  if (newFile !== authorizedFilePath) {
    errors.push(`diff writes '${newFile}' but only '${authorizedFilePath}' is authorized for this component`);
  }

  const ext = path.extname(authorizedFilePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    errors.push(`unsupported file extension '${ext || '(none)'}' for '${authorizedFilePath}'`);
  }

  if (parsed.hunks.length > MAX_HUNKS) {
    errors.push(`too many hunks (${parsed.hunks.length} > ${MAX_HUNKS}); patch is too broad`);
  }

  const sourceLines = sourceCode.split('\n');
  let added = 0;
  let removed = 0;

  parsed.hunks.forEach((hunk, i) => {
    let oldLine = hunk.oldStart;
    for (const bodyLine of hunk.body) {
      const marker = bodyLine[0];
      const text = bodyLine.slice(1);
      if (marker === ' ') {
        if (sourceLines[oldLine - 1] !== text) {
          errors.push(`hunk ${i + 1}: context mismatch at ${authorizedFilePath}:${oldLine}`);
        }
        oldLine += 1;
      } else if (marker === '-') {
        if (sourceLines[oldLine - 1] !== text) {
          errors.push(`hunk ${i + 1}: removal mismatch at ${authorizedFilePath}:${oldLine}`);
        }
        oldLine += 1;
        removed += 1;
      } else if (marker === '+') {
        added += 1;
      }
    }
    const consumed = oldLine - hunk.oldStart;
    if (consumed !== hunk.oldCount) {
      errors.push(`hunk ${i + 1}: header claims ${hunk.oldCount} old lines but body consumes ${consumed}`);
    }
  });

  if (added > MAX_ADDED_LINES) errors.push(`too many added lines (${added} > ${MAX_ADDED_LINES})`);
  if (removed > MAX_REMOVED_LINES) errors.push(`too many removed lines (${removed} > ${MAX_REMOVED_LINES})`);
  if (added === 0 && removed === 0) warnings.push('diff makes no line changes');

  return {
    valid: errors.length === 0,
    changedFiles: errors.length === 0 ? [authorizedFilePath] : [],
    errors,
    warnings,
    addedLines: added,
    removedLines: removed,
  };
}

/**
 * Apply a *validated* parsed diff to `sourceCode` in memory. Used to prove
 * applicability against an isolated copy — never against the repository.
 * Throws if hunks do not apply cleanly.
 */
export function applyParsedDiff(sourceCode: string, parsed: ParsedDiff): string {
  const sourceLines = sourceCode.split('\n');
  const out: string[] = [];
  // Apply hunks in order; hunks reference original (old) line numbers.
  const sorted = [...parsed.hunks].sort((a, b) => a.oldStart - b.oldStart);
  let cursor = 1; // 1-based position in original file

  for (const hunk of sorted) {
    if (hunk.oldStart < cursor) throw new Error('overlapping hunks in diff');
    while (cursor < hunk.oldStart) {
      out.push(sourceLines[cursor - 1] ?? '');
      cursor += 1;
    }
    for (const bodyLine of hunk.body) {
      const marker = bodyLine[0];
      const text = bodyLine.slice(1);
      if (marker === ' ') {
        if ((sourceLines[cursor - 1] ?? '') !== text) throw new Error(`context mismatch at line ${cursor}`);
        out.push(sourceLines[cursor - 1]);
        cursor += 1;
      } else if (marker === '-') {
        if ((sourceLines[cursor - 1] ?? '') !== text) throw new Error(`removal mismatch at line ${cursor}`);
        cursor += 1;
      } else if (marker === '+') {
        out.push(text);
      }
    }
  }
  while (cursor <= sourceLines.length) {
    out.push(sourceLines[cursor - 1]);
    cursor += 1;
  }
  return out.join('\n');
}
