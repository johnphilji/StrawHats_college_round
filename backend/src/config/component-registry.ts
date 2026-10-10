import path from 'path';
import type {
  ComponentRegistry,
  ComponentRegistryEntry,
  RepositoryProvider,
} from '../types/component.types';
import { RegistryValidationError } from '../errors/component.errors';

/**
 * PATCHWORK component registry (backend trusted copy).
 *
 * Source of truth: `apps/react-website/component-registry.js`, which mirrors
 * the target website's `src/patchwork/component-registry.js` and its generated
 * `patchwork-registry.json` manifest (React 18 + Vite 5, plain JSX, all on "/").
 * IDs and file paths below are copied from that manifest — never hand-edit
 * them here. To update: regenerate the manifest in the target repo
 * (`npm run patchwork:manifest`), then copy the validated mappings here.
 * The browser only ever sends the component ID; file paths always come from
 * this table via ComponentResolverService.
 */
export const componentRegistry: ComponentRegistry = {
  'navbar-brand': {
    id: 'navbar-brand',
    filePath: 'src/components/Navbar.jsx',
    componentName: 'Navbar',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Restaurant brand link in the header (mark + name + strapline).',
    framework: 'react',
    route: '/',
  },
  'navbar-cta': {
    id: 'navbar-cta',
    filePath: 'src/components/Navbar.jsx',
    componentName: 'Navbar',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: "Header 'Book a Table' call-to-action link.",
    framework: 'react',
    route: '/',
  },
  'hero-heading': {
    id: 'hero-heading',
    filePath: 'src/components/Hero.jsx',
    componentName: 'Hero',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Main hero H1: restaurant name.',
    framework: 'react',
    route: '/',
  },
  'hero-tagline': {
    id: 'hero-tagline',
    filePath: 'src/components/Hero.jsx',
    componentName: 'Hero',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Hero tagline beneath the title.',
    framework: 'react',
    route: '/',
  },
  'hero-description': {
    id: 'hero-description',
    filePath: 'src/components/Hero.jsx',
    componentName: 'Hero',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Hero supporting paragraph (lead text).',
    framework: 'react',
    route: '/',
  },
  'hero-reservation-cta': {
    id: 'hero-reservation-cta',
    filePath: 'src/components/Hero.jsx',
    componentName: 'Hero',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: "Hero primary 'Book a Table' button (anchor to #contact).",
    framework: 'react',
    route: '/',
    notes: 'Anchor navigation target (#contact) must be preserved when editing text.',
  },
  'about-heading': {
    id: 'about-heading',
    filePath: 'src/components/About.jsx',
    componentName: 'About',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Restaurant introduction section heading.',
    framework: 'react',
    route: '/',
  },
  'about-description': {
    id: 'about-description',
    filePath: 'src/components/About.jsx',
    componentName: 'About',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'First paragraph of the restaurant story.',
    framework: 'react',
    route: '/',
  },
  'menu-section-heading': {
    id: 'menu-section-heading',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Signature dishes / menu section heading.',
    framework: 'react',
    route: '/',
  },
  'menu-butter-chicken-darbari-name': {
    id: 'menu-butter-chicken-darbari-name',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Dish name for Butter Chicken Darbari.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-butter-chicken-darbari-price': {
    id: 'menu-butter-chicken-darbari-price',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Dish price for Butter Chicken Darbari.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-dragon-chilli-prawns-name': {
    id: 'menu-dragon-chilli-prawns-name',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Dish name for Dragon Chilli Prawns.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-dragon-chilli-prawns-price': {
    id: 'menu-dragon-chilli-prawns-price',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Dish price for Dragon Chilli Prawns.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-murgh-dum-biryani-name': {
    id: 'menu-murgh-dum-biryani-name',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Dish name for Murgh Dum Biryani.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-murgh-dum-biryani-price': {
    id: 'menu-murgh-dum-biryani-price',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Dish price for Murgh Dum Biryani.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-hakka-noodles-supreme-name': {
    id: 'menu-hakka-noodles-supreme-name',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Dish name for Hakka Noodles Supreme.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'menu-hakka-noodles-supreme-price': {
    id: 'menu-hakka-noodles-supreme-price',
    filePath: 'src/components/SignatureDishes.jsx',
    componentName: 'SignatureDishes',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Dish price for Hakka Noodles Supreme.',
    framework: 'react',
    route: '/',
    dataSource: 'DISHES array in src/components/SignatureDishes.jsx (edit the data object, not just the JSX).',
  },
  'chef-special-heading': {
    id: 'chef-special-heading',
    filePath: 'src/components/ChefSpecial.jsx',
    componentName: 'ChefSpecial',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: "Chef's recommendation dish name heading.",
    framework: 'react',
    route: '/',
  },
  'chef-special-description': {
    id: 'chef-special-description',
    filePath: 'src/components/ChefSpecial.jsx',
    componentName: 'ChefSpecial',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: "Chef's special description paragraph.",
    framework: 'react',
    route: '/',
  },
  'chef-special-price': {
    id: 'chef-special-price',
    filePath: 'src/components/ChefSpecial.jsx',
    componentName: 'ChefSpecial',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: "Chef's special price value.",
    framework: 'react',
    route: '/',
  },
  'reservation-heading': {
    id: 'reservation-heading',
    filePath: 'src/components/Reservation.jsx',
    componentName: 'Reservation',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Reservation section heading.',
    framework: 'react',
    route: '/',
  },
  'reservation-submit': {
    id: 'reservation-submit',
    filePath: 'src/components/Reservation.jsx',
    componentName: 'Reservation',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Reservation form submit button label.',
    framework: 'react',
    route: '/',
    notes: 'Text-only edits. Must remain type=submit inside the reservation form; do not rewire the submit handler.',
  },
  'contact-phone': {
    id: 'contact-phone',
    filePath: 'src/components/Reservation.jsx',
    componentName: 'Reservation',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Contact phone number in the reservation info list.',
    framework: 'react',
    route: '/',
    dataSource: 'INFO array in src/components/Reservation.jsx (edit the data object, not just the JSX).',
    notes: 'Display text only; the tel: link lives in Footer.jsx and must be updated separately if the number changes.',
  },
  'opening-hours-text': {
    id: 'opening-hours-text',
    filePath: 'src/components/Reservation.jsx',
    componentName: 'Reservation',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'styling'],
    description: 'Opening-hours line in the reservation info list.',
    framework: 'react',
    route: '/',
    dataSource: 'INFO array in src/components/Reservation.jsx (edit the data object, not just the JSX).',
    notes: 'Detailed per-day hours live in Footer.jsx and must be updated separately if hours change.',
  },
  'footer-about': {
    id: 'footer-about',
    filePath: 'src/components/Footer.jsx',
    componentName: 'Footer',
    editable: true,
    editableScope: 'content',
    allowedOperations: ['text', 'typography', 'styling'],
    description: 'Footer description paragraph.',
    framework: 'react',
    route: '/',
  },
};

const VALID_EDITABLE_SCOPES = new Set(['content', 'styles', 'component']);
const VALID_FRAMEWORKS = new Set(['react', 'next']);

/**
 * Validates the component registry schema and structural integrity.
 * This runs independently of the filesystem and verifies that keys match IDs,
 * paths are relative and free of traversal sequences, and required fields are valid.
 *
 * Throws a RegistryValidationError if any entry fails validation.
 */
export function validateRegistrySchema(registry: ComponentRegistry): void {
  if (!registry || typeof registry !== 'object' || Array.isArray(registry)) {
    throw new RegistryValidationError('Registry must be a key-value record of ComponentRegistryEntry');
  }

  const issues: string[] = [];
  const seenIds = new Set<string>();

  for (const [key, entry] of Object.entries(registry)) {
    if (!entry || typeof entry !== 'object') {
      issues.push(`Key '${key}': entry is not an object.`);
      continue;
    }

    // 1. Key must match entry.id
    if (key !== entry.id) {
      issues.push(`Key mismatch: registry key '${key}' does not match entry ID '${entry.id}'.`);
    }

    // 2. ID validation
    if (!entry.id || typeof entry.id !== 'string' || !entry.id.trim()) {
      issues.push(`Key '${key}': id must be a non-empty string.`);
    } else {
      if (seenIds.has(entry.id)) {
        issues.push(`Duplicate ID: '${entry.id}' is defined multiple times.`);
      }
      seenIds.add(entry.id);
    }

    // 3. Component name validation
    if (!entry.componentName || typeof entry.componentName !== 'string' || !entry.componentName.trim()) {
      issues.push(`Entry '${key}': componentName must be a non-empty string.`);
    }

    // 4. Editable flag validation
    if (typeof entry.editable !== 'boolean') {
      issues.push(`Entry '${key}': editable must be a boolean.`);
    }

    // 5. File path validation (must be relative, non-empty, no traversal tokens)
    if (!entry.filePath || typeof entry.filePath !== 'string' || !entry.filePath.trim()) {
      issues.push(`Entry '${key}': filePath must be a non-empty relative path.`);
    } else {
      const normalizedPath = entry.filePath.trim().replace(/\\/g, '/');

      // Reject absolute paths, root-relative paths, drive letters
      if (
        path.isAbsolute(entry.filePath) ||
        normalizedPath.startsWith('/') ||
        /^[a-zA-Z]:/.test(entry.filePath)
      ) {
        issues.push(`Entry '${key}': filePath '${entry.filePath}' must be relative, not absolute.`);
      }

      // Reject traversal tokens
      const pathSegments = normalizedPath.split('/');
      if (pathSegments.includes('..')) {
        issues.push(`Entry '${key}': filePath '${entry.filePath}' contains illegal traversal sequence ('..').`);
      }
    }

    // 6. Optional editableScope validation
    if (entry.editableScope !== undefined && !VALID_EDITABLE_SCOPES.has(entry.editableScope)) {
      issues.push(
        `Entry '${key}': invalid editableScope '${entry.editableScope}'. Allowed: 'content', 'styles', 'component'.`
      );
    }

    // 7. Optional allowedOperations validation
    if (entry.allowedOperations !== undefined) {
      if (!Array.isArray(entry.allowedOperations)) {
        issues.push(`Entry '${key}': allowedOperations must be an array of strings.`);
      } else {
        const hasInvalidOp = entry.allowedOperations.some(
          (op) => typeof op !== 'string' || !op.trim()
        );
        if (hasInvalidOp) {
          issues.push(`Entry '${key}': allowedOperations must contain only non-empty strings.`);
        }
      }
    }

    // 8. Optional framework validation
    if (entry.framework !== undefined && !VALID_FRAMEWORKS.has(entry.framework)) {
      issues.push(`Entry '${key}': invalid framework '${entry.framework}'. Allowed: 'react', 'next'.`);
    }
  }

  if (issues.length > 0) {
    throw new RegistryValidationError(
      `Found ${issues.length} registry validation error(s):\n - ${issues.join('\n - ')}`,
      issues
    );
  }
}

/**
 * Validates that all files registered in the component registry exist
 * within the repository via the provided RepositoryProvider.
 */
export async function validateRegistryFilesExist(
  registry: ComponentRegistry,
  provider: RepositoryProvider
): Promise<{ valid: boolean; missingFiles: string[] }> {
  const missingFiles: string[] = [];

  for (const entry of Object.values(registry)) {
    try {
      const exists = await provider.fileExists(entry.filePath);
      if (!exists) {
        missingFiles.push(entry.filePath);
      }
    } catch {
      missingFiles.push(entry.filePath);
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles,
  };
}
