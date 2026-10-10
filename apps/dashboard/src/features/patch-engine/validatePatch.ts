import { PatchOperation } from './patchTypes';

const ALLOWED_STYLES = ['backgroundColor', 'color', 'padding', 'margin', 'fontSize', 'borderRadius', 'display', 'visibility'];
const ALLOWED_ATTRIBUTES = ['href', 'alt', 'title', 'disabled', 'placeholder'];

export function validateOperation(op: PatchOperation): { valid: boolean; error?: string } {
  // Prevent arbitrary JS execution
  if (op.newValue.includes('javascript:') || op.newValue.includes('eval(')) {
    return { valid: false, error: 'Unsafe javascript execution detected.' };
  }

  if (op.operationType === 'setStyle') {
    if (!op.property || !ALLOWED_STYLES.includes(op.property)) {
      return { valid: false, error: `Style property ${op.property} is not allowlisted.` };
    }
  }

  if (op.operationType === 'setAttribute') {
    if (!op.property || !ALLOWED_ATTRIBUTES.includes(op.property)) {
      return { valid: false, error: `Attribute ${op.property} is not allowlisted.` };
    }
  }

  return { valid: true };
}