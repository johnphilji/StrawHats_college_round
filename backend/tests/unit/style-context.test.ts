import { describe, it, expect } from 'vitest';
import {
  buildStyleContext,
  extractClassSelectors,
  extractStyleImports,
  extractThemeTokens,
  resolveRelativeImport,
  type StyleContextReader,
} from '../../src/services/style-context.service';

function memoryReader(files: Record<string, string>): StyleContextReader {
  return {
    readFile: async (p: string) => {
      if (files[p] === undefined) throw new Error(`not found: ${p}`);
      return files[p];
    },
  };
}

const GLOBAL_CSS = `
:root {
  --maroon: #4a0e1e;
  --gold: #d4af37;
  --cream: #f8f1e4;
  --font-display: "Playfair Display", Georgia, serif;
}
.container { max-width: 1180px; margin: 0 auto; }
.btn { padding: 12px 24px; border-radius: 999px; }
.btn--gold { background: var(--gold); }
.btn--outline { border: 1px solid var(--maroon); }
`;

const HERO_SOURCE = `
import "./Hero.css";

export default function Hero() {
  return <h1 data-patchwork-id="hero-heading" className="hero__title">Persia Darbar</h1>;
}
`;

const HERO_CSS = `
.hero__title { font-family: var(--font-display); color: var(--maroon); }
.hero__lead { color: var(--muted); }
`;

describe('style-context.service', () => {
  it('extracts style imports from a component source', () => {
    expect(extractStyleImports(HERO_SOURCE)).toEqual(['./Hero.css']);
    expect(extractStyleImports('import styles from "./A.css"; import "./B.scss";')).toEqual([
      './A.css',
      './B.scss',
    ]);
    expect(extractStyleImports('export default () => null;')).toEqual([]);
  });

  it('resolves relative style imports against the component directory', () => {
    expect(resolveRelativeImport('src/components/Hero.jsx', './Hero.css')).toBe(
      'src/components/Hero.css',
    );
    expect(resolveRelativeImport('src/components/Hero.jsx', './nested/theme.css')).toBe(
      'src/components/nested/theme.css',
    );
    expect(resolveRelativeImport('src/components/Hero.jsx', 'flat-style.css')).toBeNull();
    expect(resolveRelativeImport('src/components/Hero.jsx', '../styles/theme.css')).toBeNull();
    expect(resolveRelativeImport('src/components/Hero.jsx', '../../evil.css')).toBeNull();
  });

  it('extracts design tokens and reusable classes, deduplicated', () => {
    const tokens = extractThemeTokens(GLOBAL_CSS);
    expect(tokens).toContain('--gold: #d4af37');
    expect(tokens).toContain('--font-display: "Playfair Display", Georgia, serif');
    expect(new Set(tokens).size).toBe(tokens.length);

    const classes = extractClassSelectors(GLOBAL_CSS);
    expect(classes).toContain('.container');
    expect(classes).toContain('.btn');
    expect(classes).toContain('.btn--gold');
    expect(classes).toContain('.btn--outline');
  });

  it('builds a style guide from the global theme plus the co-located component CSS', async () => {
    const guide = await buildStyleContext({
      componentFilePath: 'src/components/Hero.jsx',
      sourceCode: HERO_SOURCE,
      reader: memoryReader({
        'src/index.css': GLOBAL_CSS,
        'src/components/Hero.css': HERO_CSS,
      }),
    });

    expect(guide).toContain('Design tokens');
    expect(guide).toContain('--maroon: #4a0e1e');
    expect(guide).toContain('--gold: #d4af37');
    expect(guide).toContain('Reusable utility/component classes');
    expect(guide).toContain('.btn--gold');
    expect(guide).toContain('Component stylesheet (src/components/Hero.css)');
    expect(guide).toContain('.hero__title');
  });

  it('skips missing style files and still returns the global tokens', async () => {
    const guide = await buildStyleContext({
      componentFilePath: 'src/components/Hero.jsx',
      sourceCode: HERO_SOURCE,
      reader: memoryReader({ 'src/index.css': GLOBAL_CSS }), // Hero.css missing
    });

    expect(guide).toContain('--gold: #d4af37');
    expect(guide).not.toContain('Component stylesheet');
  });

  it('returns an empty string when no style information is available', async () => {
    const guide = await buildStyleContext({
      componentFilePath: 'src/components/Hero.jsx',
      sourceCode: 'export const Hero = () => null;',
      reader: memoryReader({}),
    });
    expect(guide).toBe('');
  });

  it('bounded output respects the configured size limit', async () => {
    const guide = await buildStyleContext({
      componentFilePath: 'src/components/Hero.jsx',
      sourceCode: HERO_SOURCE,
      reader: memoryReader({
        'src/index.css': GLOBAL_CSS,
        'src/components/Hero.css': HERO_CSS,
      }),
      maxChars: 120,
    });
    expect(guide.length).toBeLessThan(200);
    expect(guide).toMatch(/style guide truncated/);
  });
});