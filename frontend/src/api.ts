import type { EditResponse, EditStatus, HistoryEntry } from './types';

// Mock delay helper
const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

// Simulated diff output
function generateDiff(componentId: string, instruction: string): string {
  if (instruction.toLowerCase().includes('green')) {
    return `--- a/styles.css
+++ b/styles.css
@@ -275,7 +275,7 @@ .cart-total {
 
 .btn-checkout {
-  background-color: #2563eb;
+  background-color: #16a34a;
   color: #ffffff;
   border-radius: 8px;
   padding: 12px 20px;`;
  }
  if (instruction.toLowerCase().includes('red')) {
    return `--- a/styles.css
+++ b/styles.css
@@ -275,7 +275,7 @@ .cart-total {
 
 .btn-checkout {
-  background-color: #2563eb;
+  background-color: #dc2626;
   color: #ffffff;
   border-radius: 8px;`;
  }
  if (instruction.toLowerCase().includes('font') || instruction.toLowerCase().includes('size')) {
    return `--- a/styles.css
+++ b/styles.css
@@ -275,7 +275,7 @@ .btn-checkout {
   background-color: #2563eb;
   color: #ffffff;
-  font-size: 16px;
+  font-size: 20px;
   border-radius: 8px;`;
  }
  if (instruction.toLowerCase().includes('rename') || instruction.toLowerCase().includes('text') || instruction.toLowerCase().includes('payment')) {
    return `--- a/index.html
+++ b/index.html
@@ -79,7 +79,7 @@
-          <button type="button" class="btn-checkout" data-patchwork-id="checkout-button">Checkout</button>
+          <button type="button" class="btn-checkout" data-patchwork-id="checkout-button">Continue to Payment</button>`;
  }
  return `--- a/styles.css
+++ b/styles.css
@@ -200,6 +200,6 @@ .${componentId.replace(/-/g, '_')} {
-  /* original styles */
+  /* updated: ${instruction.slice(0, 40)} */`;
}

// Simulate API calls with realistic delays
export async function submitEditRequest(
  componentId: string,
  instruction: string,
  onStatusChange: (status: EditStatus, data?: Partial<EditResponse>) => void
): Promise<EditResponse> {
  const editId = `edit-${Date.now().toString(36)}`;
  const branch = `patch/${componentId}-${Date.now().toString(36)}`;
  const commitSha = Math.random().toString(16).slice(2, 10);

  onStatusChange('generating');
  await delay(1200);

  onStatusChange('testing', {
    diff: generateDiff(componentId, instruction),
    branch,
    commitSha,
  });
  await delay(900);

  onStatusChange('approved');

  return {
    editId,
    branch,
    status: 'approved',
    diff: generateDiff(componentId, instruction),
    commitSha,
    previewUrl: `http://localhost:4000?pw_preview=${editId}`,
    validationPassed: true,
  };
}

export async function mergeAndDeploy(
  _editId: string,
  onStatusChange: (status: EditStatus) => void
): Promise<void> {
  onStatusChange('merged');
  await delay(600);
  onStatusChange('deploying');
  await delay(1800);
  onStatusChange('deployed');
}

export async function rollback(
  _editId: string,
  onStatusChange: (status: EditStatus) => void
): Promise<void> {
  await delay(1000);
  onStatusChange('rolled_back');
}

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    editId: 'edit-a1b2c3',
    componentId: 'hero-cta',
    label: 'Hero CTA Button',
    instruction: 'Make the background a deep purple and increase font size to 18px',
    branch: 'patch/hero-cta-a1b2c3',
    status: 'deployed',
    commitSha: 'a1b2c3d4',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    author: 'you',
  },
  {
    editId: 'edit-d4e5f6',
    componentId: 'promo-banner',
    label: 'Promo Banner',
    instruction: 'Change text to "Free shipping on all orders today only"',
    branch: 'patch/promo-banner-d4e5f6',
    status: 'deployed',
    commitSha: 'd4e5f6a7',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    author: 'you',
  },
  {
    editId: 'edit-g7h8i9',
    componentId: 'checkout-button',
    label: 'Checkout button',
    instruction: 'Make it orange with rounded corners 24px',
    branch: 'patch/checkout-button-g7h8i9',
    status: 'rolled_back',
    commitSha: 'g7h8i9j0',
    timestamp: new Date(Date.now() - 1000 * 60 * 200).toISOString(),
    author: 'you',
  },
];
