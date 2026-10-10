import type {
  ConnectedWebsite,
  SelectedComponent,
  CodeChange,
  PatchConflict,
  PlaywrightTestRun,
  Release,
  AuditLog,
  HistoryItem,
} from './types';

export const MOCK_WEBSITES: ConnectedWebsite[] = [
  {
    id: 'acme-store',
    name: 'Acme Supply Store',
    tagline: 'Modern pet supplies & accessories storefront',
    repoUrl: 'https://github.com/johnphilji/demo-sites.git',
    repoOwner: 'johnphilji',
    repoName: 'demo-sites',
    subpath: '/Ecommerce',
    branch: 'main',
    previewUrl: 'http://localhost:3000',
    productionUrl: 'https://acme-store.patchwork.dev',
    status: 'connected',
    mode: 'managed',
    runtimeLoaderInstalled: true,
    lastModified: 'Just now',
    componentCount: 14,
    category: 'Ecommerce',
    code: 'AC',
    framework: 'HTML5 / CSS3',
    activeRelease: 'v1.2.0',
    activePatchesCount: 3,
  },
  {
    id: 'nova-saas',
    name: 'Nova Platform',
    tagline: 'B2B developer SaaS landing and pricing matrix',
    repoUrl: 'https://github.com/johnphilji/nova-saas-landing.git',
    repoOwner: 'johnphilji',
    repoName: 'nova-saas-landing',
    branch: 'main',
    previewUrl: 'http://localhost:3001',
    productionUrl: 'https://nova-ai.patchwork.dev',
    status: 'connected',
    mode: 'managed',
    runtimeLoaderInstalled: true,
    lastModified: '2 hours ago',
    componentCount: 22,
    category: 'SaaS',
    code: 'NV',
    framework: 'React / Vite',
    activeRelease: 'v2.0.4',
    activePatchesCount: 2,
  },
  {
    id: 'pulse-docs',
    name: 'Pulse Developer Docs',
    tagline: 'Interactive API documentation and developer tutorials',
    repoUrl: 'https://github.com/strawhats/pulse-docs.git',
    repoOwner: 'strawhats',
    repoName: 'pulse-docs',
    branch: 'main',
    previewUrl: 'http://localhost:3002',
    productionUrl: 'https://docs.pulse.patchwork.dev',
    status: 'connected',
    mode: 'preview_only',
    runtimeLoaderInstalled: false,
    lastModified: 'Yesterday',
    componentCount: 18,
    category: 'Docs',
    code: 'PL',
    framework: 'Docusaurus',
    activeRelease: 'v1.0.0',
    activePatchesCount: 1,
  },
];

export const MOCK_COMPONENTS: SelectedComponent[] = [
  {
    componentId: 'hero-cta',
    label: 'Primary Call to Action Button',
    tagName: 'BUTTON',
    text: 'Buy Now — $34.99',
    sourceFile: 'index.html:L54 & styles.css:L132',
    lineRange: 'index.html (54-56)',
    fingerprint: {
      tag: 'BUTTON',
      selector: '#hero-cta',
      text: 'Buy Now — $34.99',
      attributes: { id: 'hero-cta', class: 'btn-primary hero-btn' },
      parentTag: 'DIV',
      parentSelector: '.hero-actions',
      domPath: 'html > body > header > div.hero-actions > button#hero-cta',
      confidenceScore: 99,
      confidenceBreakdown: {
        text: 25,
        tagAndAttributes: 20,
        domStructure: 25,
        parentAndSibling: 19,
        nearbyContent: 10,
      },
    },
    styles: {
      color: '#ffffff',
      backgroundColor: '#2563eb',
      fontSize: '15px',
      fontWeight: '600',
      padding: '12px 24px',
      margin: '0',
      borderRadius: '8px',
      display: 'inline-flex',
    },
    rect: { x: 80, y: 320, width: 210, height: 48 },
  },
  {
    componentId: 'hero-title',
    label: 'Hero Section Heading',
    tagName: 'H1',
    text: 'Premium Care for Happy Companions',
    sourceFile: 'index.html:L42 & styles.css:L98',
    lineRange: 'index.html (42-43)',
    fingerprint: {
      tag: 'H1',
      selector: '#hero-title',
      text: 'Premium Care for Happy Companions',
      attributes: { id: 'hero-title', class: 'title-display' },
      parentTag: 'DIV',
      parentSelector: '.hero-content',
      domPath: 'html > body > header > div.hero-content > h1#hero-title',
      confidenceScore: 98,
      confidenceBreakdown: {
        text: 25,
        tagAndAttributes: 20,
        domStructure: 24,
        parentAndSibling: 19,
        nearbyContent: 10,
      },
    },
    styles: {
      color: '#0f172a',
      backgroundColor: 'transparent',
      fontSize: '32px',
      fontWeight: '800',
      padding: '0',
      margin: '0 0 12px 0',
      borderRadius: '0px',
      display: 'block',
    },
    rect: { x: 80, y: 190, width: 520, height: 90 },
  },
  {
    componentId: 'checkout-button',
    label: 'Cart Checkout Button',
    tagName: 'BUTTON',
    text: 'Proceed to Checkout',
    sourceFile: 'index.html:L112 & styles.css:L285',
    lineRange: 'index.html (112-114)',
    fingerprint: {
      tag: 'BUTTON',
      selector: '#checkout-button',
      text: 'Proceed to Checkout',
      attributes: { id: 'checkout-button', class: 'btn-checkout' },
      parentTag: 'DIV',
      parentSelector: '.cart-summary-actions',
      domPath: 'html > body > main > section > div > button#checkout-button',
      confidenceScore: 97,
      confidenceBreakdown: {
        text: 25,
        tagAndAttributes: 20,
        domStructure: 23,
        parentAndSibling: 19,
        nearbyContent: 10,
      },
    },
    styles: {
      color: '#ffffff',
      backgroundColor: '#16a34a',
      fontSize: '14px',
      fontWeight: '700',
      padding: '12px 20px',
      margin: '8px 0',
      borderRadius: '6px',
      display: 'inline-flex',
    },
    rect: { x: 740, y: 380, width: 230, height: 46 },
  },
  {
    componentId: 'product-price',
    label: 'Product Price Badge',
    tagName: 'SPAN',
    text: '$34.99',
    sourceFile: 'index.html:L78 & styles.css:L160',
    lineRange: 'index.html (78-79)',
    fingerprint: {
      tag: 'SPAN',
      selector: '.product-card .price-tag',
      text: '$34.99',
      attributes: { class: 'price-tag' },
      parentTag: 'DIV',
      parentSelector: '.product-meta',
      domPath: 'html > body > main > div.product-card > span.price-tag',
      confidenceScore: 94,
      confidenceBreakdown: {
        text: 24,
        tagAndAttributes: 19,
        domStructure: 24,
        parentAndSibling: 18,
        nearbyContent: 9,
      },
    },
    styles: {
      color: '#16a34a',
      backgroundColor: '#dcfce7',
      fontSize: '18px',
      fontWeight: '700',
      padding: '4px 8px',
      margin: '0',
      borderRadius: '9999px',
      display: 'inline-block',
    },
    rect: { x: 80, y: 280, width: 80, height: 28 },
  },
  {
    componentId: 'nav-announcement',
    label: 'Header Notification Bar',
    tagName: 'DIV',
    text: 'Seasonal Promotion: 20% off all catalog orders with code PATCHWORK',
    sourceFile: 'index.html:L15 & styles.css:L35',
    lineRange: 'index.html (15-18)',
    fingerprint: {
      tag: 'DIV',
      selector: '.announcement-bar',
      text: 'Seasonal Promotion: 20% off all catalog orders with code PATCHWORK',
      attributes: { class: 'announcement-bar' },
      parentTag: 'HEADER',
      parentSelector: 'header.site-header',
      domPath: 'html > body > header > div.announcement-bar',
      confidenceScore: 96,
      confidenceBreakdown: {
        text: 25,
        tagAndAttributes: 20,
        domStructure: 24,
        parentAndSibling: 18,
        nearbyContent: 9,
      },
    },
    styles: {
      color: '#ffffff',
      backgroundColor: '#1e293b',
      fontSize: '12px',
      fontWeight: '500',
      padding: '8px 16px',
      margin: '0',
      borderRadius: '0px',
      display: 'flex',
    },
    rect: { x: 0, y: 0, width: 1000, height: 36 },
  },
];

export const INITIAL_CONFLICTS: PatchConflict[] = [
  {
    id: 'conflict-101',
    targetFingerprint: '#checkout-button',
    elementLabel: 'Checkout Button',
    property: 'backgroundColor',
    originalBaseline: '#16a34a',
    status: 'unresolved',
    patchA: {
      patchId: 'patch-001',
      author: 'Alex Rivera',
      value: '#2563eb (Royal Blue)',
      timestamp: '15 mins ago',
    },
    patchB: {
      patchId: 'patch-004',
      author: 'Marcus Vance',
      value: '#ef4444 (Crimson)',
      timestamp: '5 mins ago',
    },
  },
];

export const INITIAL_TEST_RUNS: PlaywrightTestRun[] = [
  {
    id: 'test-891',
    patchTitle: 'Fix Checkout Button Label & Brand Color',
    status: 'passed',
    durationMs: 740,
    timestamp: '10 mins ago',
    mismatchPercentage: 0.8,
    checks: [
      { id: 'c1', name: 'Element Reachability & Visibility', status: 'pass', message: 'Target element #checkout-button visible in viewport', durationMs: 140 },
      { id: 'c2', name: 'Synthetic Click & Event Assertion', status: 'pass', message: 'Intercepted click route without runtime errors', durationMs: 220 },
      { id: 'c3', name: 'Content Security & CSP Check', status: 'pass', message: 'No unauthorized scripts or CSP violations detected', durationMs: 90 },
      { id: 'c4', name: 'Visual Regression (Pixel Diff)', status: 'pass', message: 'Mismatch: 0.8% (Strict threshold < 2.0% passed)', durationMs: 290 },
    ],
  },
  {
    id: 'test-892',
    patchTitle: 'Urgent Red Checkout Button Override',
    status: 'failed',
    durationMs: 820,
    timestamp: '2 mins ago',
    mismatchPercentage: 4.2,
    checks: [
      { id: 'c1', name: 'Element Reachability & Visibility', status: 'pass', message: 'Target element visible', durationMs: 110 },
      { id: 'c2', name: 'Conflict Engine Validation', status: 'fail', message: 'Concurrent modification: overlaps active patch on backgroundColor', durationMs: 75 },
      { id: 'c3', name: 'Interaction & Synthetic Click', status: 'pass', message: 'Synthetic event test passed', durationMs: 210 },
      { id: 'c4', name: 'Pre-flight Release Gate', status: 'fail', message: 'Deployment blocked until conflict is resolved', durationMs: 425 },
    ],
  },
];

export const INITIAL_RELEASES: Release[] = [
  {
    id: 'rel-120',
    version: 'v1.2.0',
    projectId: 'acme-store',
    status: 'active',
    deployedAt: '12 mins ago',
    deployedBy: 'Alex Rivera',
    duration: '180ms',
    patchesCount: 3,
  },
  {
    id: 'rel-110',
    version: 'v1.1.0',
    projectId: 'acme-store',
    status: 'deprecated',
    deployedAt: '3 hours ago',
    deployedBy: 'Alex Rivera',
    duration: '210ms',
    patchesCount: 2,
  },
  {
    id: 'rel-100',
    version: 'v1.0.0',
    projectId: 'acme-store',
    status: 'deprecated',
    deployedAt: 'Yesterday',
    deployedBy: 'Sarah Chen',
    duration: '195ms',
    patchesCount: 1,
  },
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  {
    id: 'log-01',
    timestamp: '12 mins ago',
    user: { name: 'Alex Rivera', initials: 'AR' },
    action: 'DEPLOY_RELEASE',
    category: 'deploy',
    target: 'Release v1.2.0',
    details: 'Deployed 3 active patches to production. Applied in 180ms with zero rebuild.',
  },
  {
    id: 'log-02',
    timestamp: '14 mins ago',
    user: { name: 'Alex Rivera', initials: 'AR' },
    action: 'TEST_PASSED',
    category: 'test',
    target: 'Patch #checkout-button',
    details: 'Automated headless test suite passed with 0.8% visual difference gate.',
  },
  {
    id: 'log-03',
    timestamp: '18 mins ago',
    user: { name: 'Marcus Vance', initials: 'MV' },
    action: 'CONFLICT_FLAGGED',
    category: 'conflict',
    target: '#checkout-button (backgroundColor)',
    details: 'Conflict detector flagged concurrent backgroundColor edit.',
  },
];

export const INITIAL_HISTORY: HistoryItem[] = [
  {
    id: 'hist-1',
    componentLabel: 'Buy Now Button',
    instruction: 'Set button to primary green and change text to "Get Started"',
    branch: 'patchwork/edit-hero-cta-7e3a',
    commitSha: 'b54911e',
    timestamp: '25 mins ago',
    status: 'deployed',
    author: 'Developer',
  },
  {
    id: 'hist-2',
    componentLabel: 'Header Notification Bar',
    instruction: 'Update promo text with seasonal discount details',
    branch: 'patchwork/edit-promo-821f',
    commitSha: 'a19bc32',
    timestamp: '2 hours ago',
    status: 'deployed',
    author: 'Developer',
  },
];

export const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

export function generateCodeChange(
  component: SelectedComponent,
  instruction: string
): CodeChange {
  const hash = Math.random().toString(36).substring(2, 6);
  const branch = `patchwork/edit-${component.componentId}-${hash}`;
  const commitSha = Math.random().toString(16).substring(2, 9);
  const lower = instruction.toLowerCase();

  let diff = '';
  let modifiedFiles = ['styles.css'];
  let explanation = '';
  const previewApplied: CodeChange['previewApplied'] = {};

  if (lower.includes('green') || lower.includes('emerald') || lower.includes('get started')) {
    modifiedFiles = ['styles.css', 'index.html'];
    explanation = 'Updated button background to #10b981 and set label to "Get Started".';
    previewApplied.backgroundColor = '#10b981';
    previewApplied.text = 'Get Started';
    previewApplied.borderRadius = '9999px';

    diff = `--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -132,4 +132,4 @@
 .btn-primary {
-  background-color: #2563eb;
+  background-color: #10b981;
   color: #ffffff;
-  border-radius: 8px;
+  border-radius: 9999px;
 }

--- a/Ecommerce/index.html
+++ b/Ecommerce/index.html
@@ -54,3 +54,3 @@
-  <button class="btn-primary" id="hero-cta">Buy Now — $34.99</button>
+  <button class="btn-primary" id="hero-cta">Get Started</button>`;
  } else if (lower.includes('blue') || lower.includes('payment') || lower.includes('checkout')) {
    modifiedFiles = ['styles.css', 'index.html'];
    explanation = 'Updated button to royal blue (#2563eb) and set label to "Continue to Payment".';
    previewApplied.backgroundColor = '#2563eb';
    previewApplied.text = 'Continue to Payment';

    diff = `--- a/Ecommerce/index.html
+++ b/Ecommerce/index.html
@@ -112,3 +112,3 @@
-  <button class="btn-checkout" id="checkout-button">Proceed to Checkout</button>
+  <button class="btn-checkout" id="checkout-button">Continue to Payment</button>

--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -285,3 +285,3 @@
 .btn-checkout {
-  background-color: #16a34a;
+  background-color: #2563eb;
   font-weight: 700;
 }`;
  } else {
    explanation = `Applied requested visual style update to ${component.label}.`;
    previewApplied.backgroundColor = '#4f46e5';
    previewApplied.borderRadius = '8px';

    diff = `--- a/Ecommerce/styles.css
+++ b/Ecommerce/styles.css
@@ -132,3 +132,4 @@
 .${component.componentId} {
-  /* original styles */
+  background-color: #4f46e5;
+  transition: all 0.2s ease-in-out;
 }`;
  }

  return {
    editId: `edit_${Date.now()}`,
    componentId: component.componentId,
    componentLabel: component.label,
    instruction,
    branch,
    commitSha,
    status: 'review_diff',
    diff,
    modifiedFiles,
    explanation,
    previewApplied,
  };
}
