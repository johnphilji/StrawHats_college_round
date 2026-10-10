import type { ConnectedWebsite, EditResponse, EditStatus, HistoryEntry, SelectedComponent } from './types';

export const MOCK_WEBSITES: ConnectedWebsite[] = [
  {
    id: 'acme-store',
    name: 'Acme Pet Store',
    tagline: 'Modern pet supplies & accessories e-commerce storefront',
    repoUrl: 'https://github.com/johnphilji/demo-sites.git',
    repoOwner: 'johnphilji',
    repoName: 'demo-sites',
    subpath: '/Ecommerce',
    branch: 'main',
    previewUrl: 'http://localhost:3000',
    productionUrl: 'https://acme-store.patchwork.dev',
    status: 'connected',
    lastModified: 'Just now',
    componentCount: 14,
    category: 'Ecommerce',
    icon: '🐾',
    framework: 'Vanilla HTML5 / CSS3',
  },
  {
    id: 'nova-saas',
    name: 'Nova AI Platform',
    tagline: 'High-converting B2B SaaS landing page & pricing matrix',
    repoUrl: 'https://github.com/johnphilji/nova-saas-landing.git',
    repoOwner: 'johnphilji',
    repoName: 'nova-saas-landing',
    branch: 'main',
    previewUrl: 'http://localhost:3001',
    productionUrl: 'https://nova-ai.patchwork.dev',
    status: 'connected',
    lastModified: '2 hours ago',
    componentCount: 22,
    category: 'SaaS',
    icon: '⚡',
    framework: 'React / Vite / Tailwind',
  },
  {
    id: 'pulse-docs',
    name: 'Pulse Developer Docs',
    tagline: 'Interactive API documentation & developer tutorials portal',
    repoUrl: 'https://github.com/strawhats/pulse-docs.git',
    repoOwner: 'strawhats',
    repoName: 'pulse-docs',
    branch: 'main',
    previewUrl: 'http://localhost:3002',
    productionUrl: 'https://docs.pulse.patchwork.dev',
    status: 'connected',
    lastModified: 'Yesterday',
    componentCount: 18,
    category: 'Docs',
    icon: '📖',
    framework: 'Docusaurus / MDX',
  },
];

// Interactive mock elements for Acme Store
export const MOCK_COMPONENTS: SelectedComponent[] = [
  {
    componentId: 'hero-cta',
    label: 'Buy Now Button',
    tagName: 'BUTTON',
    text: 'Buy Now — $34.99',
    sourceFile: 'index.html:L54 & styles.css:L132',
    lineRange: 'index.html (54-56)',
    styles: {
      color: '#ffffff',
      backgroundColor: '#2563eb',
      fontSize: '16px',
      fontWeight: '600',
      padding: '14px 28px',
      margin: '0',
      borderRadius: '8px',
      display: 'inline-flex',
    },
    rect: { x: 80, y: 320, width: 210, height: 48 },
  },
  {
    componentId: 'hero-title',
    label: 'Storefront Hero Heading',
    tagName: 'H1',
    text: 'Premium Care for Happy Companions',
    sourceFile: 'index.html:L42 & styles.css:L98',
    lineRange: 'index.html (42-43)',
    styles: {
      color: '#0f172a',
      backgroundColor: 'transparent',
      fontSize: '44px',
      fontWeight: '800',
      padding: '0',
      margin: '0 0 16px 0',
      borderRadius: '0px',
      display: 'block',
    },
    rect: { x: 80, y: 190, width: 520, height: 110 },
  },
  {
    componentId: 'checkout-button',
    label: 'Checkout Button',
    tagName: 'BUTTON',
    text: 'Proceed to Checkout',
    sourceFile: 'index.html:L112 & styles.css:L285',
    lineRange: 'index.html (112-114)',
    styles: {
      color: '#ffffff',
      backgroundColor: '#16a34a',
      fontSize: '15px',
      fontWeight: '700',
      padding: '12px 24px',
      margin: '8px 0',
      borderRadius: '6px',
      display: 'inline-flex',
    },
    rect: { x: 800, y: 440, width: 220, height: 44 },
  },
  {
    componentId: 'product-price',
    label: 'Featured Price Tag',
    tagName: 'SPAN',
    text: '$34.99',
    sourceFile: 'index.html:L78 & styles.css:L160',
    lineRange: 'index.html (78-79)',
    styles: {
      color: '#16a34a',
      backgroundColor: '#dcfce7',
      fontSize: '22px',
      fontWeight: '700',
      padding: '4px 10px',
      margin: '0',
      borderRadius: '9999px',
      display: 'inline-block',
    },
    rect: { x: 80, y: 280, width: 90, height: 32 },
  },
  {
    componentId: 'nav-announcement',
    label: 'Top Announcement Banner',
    tagName: 'DIV',
    text: '🐾 Flash Sale: 20% off all organic treats with code PATCHWORK',
    sourceFile: 'index.html:L15 & styles.css:L35',
    lineRange: 'index.html (15-18)',
    styles: {
      color: '#ffffff',
      backgroundColor: '#4338ca',
      fontSize: '13px',
      fontWeight: '500',
      padding: '8px 16px',
      margin: '0',
      borderRadius: '0px',
      display: 'flex',
    },
    rect: { x: 0, y: 0, width: 1000, height: 36 },
  },
];

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

function generateDiff(component: SelectedComponent, instruction: string): { diff: string; files: string[]; explanation: string } {
  const instLower = instruction.toLowerCase();

  if (component.componentId === 'hero-cta' || instLower.includes('get started') || instLower.includes('green')) {
    return {
      files: ['styles.css', 'index.html'],
      explanation: 'Changed button background to emerald green (#10b981) and updated CTA copy to "Get Started".',
      diff: `--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -132,4 +132,4 @@
 .btn-primary {
-  background-color: #2563eb;
+  background-color: #10b981;
   color: #ffffff;
-  border-radius: 8px;
+  border-radius: 9999px;
   box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
 }

--- a/Ecommerce/index.html
+++ b/Ecommerce/index.html
@@ -54,3 +54,3 @@
-  <button class="btn-primary" id="hero-cta">Buy Now — $34.99</button>
+  <button class="btn-primary" id="hero-cta">Get Started ➔</button>`,
    };
  }

  if (instLower.includes('payment') || instLower.includes('checkout')) {
    return {
      files: ['index.html', 'styles.css'],
      explanation: 'Renamed button text to "Continue to Payment" and added secure lock badge icon.',
      diff: `--- a/Ecommerce/index.html
+++ b/Ecommerce/index.html
@@ -112,3 +112,3 @@
-  <button class="btn-checkout" id="checkout-button">Proceed to Checkout</button>
+  <button class="btn-checkout" id="checkout-button">🔒 Continue to Payment</button>

--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -285,3 +285,3 @@
 .btn-checkout {
-  background-color: #16a34a;
+  background-color: #059669;
   font-weight: 700;
+  letter-spacing: 0.02em;`,
    };
  }

  if (instLower.includes('discount') || instLower.includes('badge') || instLower.includes('sale') || instLower.includes('banner')) {
    return {
      files: ['index.html', 'styles.css'],
      explanation: 'Updated banner colors to vibrant amber gradient and changed promotion text.',
      diff: `--- a/Ecommerce/index.html
+++ b/Ecommerce/index.html
@@ -15,3 +15,3 @@
-  <div class="announcement">🐾 Flash Sale: 20% off all organic treats</div>
+  <div class="announcement">🔥 HACKATHON SPECIAL: 50% OFF All Orders Today Only!</div>

--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -35,3 +35,4 @@
 .announcement {
-  background-color: #4338ca;
+  background: linear-gradient(90deg, #f59e0b, #ef4444);
+  font-weight: 700;
 }`,
    };
  }

  return {
    files: ['styles.css'],
    explanation: `Applied visual modifications requested: "${instruction.slice(0, 50)}..." to ${component.label}.`,
    diff: `--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -100,5 +100,6 @@
 /* Target: ${component.label} (${component.componentId}) */
 .${component.componentId} {
-  /* standard styles */
+  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
+  /* prompt: "${instruction.slice(0, 35)}" */
 }`,
  };
}

export async function submitEditRequest(
  component: SelectedComponent,
  instruction: string,
  onStatusChange: (status: EditStatus, data?: Partial<EditResponse>) => void
): Promise<EditResponse> {
  const hash = Math.random().toString(36).substring(2, 6);
  const branchName = `patchwork/edit-${component.componentId}-${hash}`;
  const commitSha = Math.random().toString(16).substring(2, 9);
  const editId = `edit_${Date.now()}`;

  // Step 1: Identifying & Generating
  onStatusChange('generating');
  await delay(1200);

  // Step 2: Testing & Syntax Validation
  onStatusChange('testing');
  await delay(900);

  const { diff, files, explanation } = generateDiff(component, instruction);

  const response: EditResponse = {
    editId,
    branch: branchName,
    status: 'approved',
    diff,
    commitSha,
    previewUrl: `http://localhost:3000?pw_branch=${branchName}`,
    validationPassed: true,
    modifiedFiles: files,
    explanation,
  };

  onStatusChange('approved', response);
  return response;
}

export async function mergeAndDeploy(
  _editId: string,
  onStatusChange: (status: EditStatus) => void
): Promise<void> {
  onStatusChange('merged');
  await delay(700);
  onStatusChange('deploying');
  await delay(1600);
  onStatusChange('deployed');
}

export async function rollback(
  _editId: string,
  onStatusChange: (status: EditStatus) => void
): Promise<void> {
  onStatusChange('deploying');
  await delay(900);
  onStatusChange('rolled_back');
}

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    editId: 'edit_001',
    componentId: 'hero-cta',
    label: 'Buy Now Button',
    instruction: 'Change button color to emerald green and rename text to "Get Started"',
    branch: 'patchwork/edit-hero-cta-7e3a',
    status: 'deployed',
    commitSha: 'b54911e',
    timestamp: '14 minutes ago',
    author: 'AI Agent (Claude 3.5 Sonnet)',
  },
  {
    editId: 'edit_002',
    componentId: 'nav-announcement',
    label: 'Top Announcement Banner',
    instruction: 'Update promo text to mention 20% off with code PATCHWORK',
    branch: 'patchwork/edit-promo-821f',
    status: 'deployed',
    commitSha: 'a19bc32',
    timestamp: '1 hour ago',
    author: 'AI Agent (Claude 3.5 Sonnet)',
  },
  {
    editId: 'edit_003',
    componentId: 'product-price',
    label: 'Featured Price Tag',
    instruction: 'Highlight price badge with soft green pill background and bold font',
    branch: 'patchwork/edit-price-44b2',
    status: 'deployed',
    commitSha: '9c882ef',
    timestamp: '3 hours ago',
    author: 'AI Agent (Claude 3.5 Sonnet)',
  },
];
