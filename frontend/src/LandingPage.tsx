import styles from './LandingPage.module.css';

interface LandingPageProps {
  onLaunchStudio: () => void;
  onSignIn: () => void;
  onSignUp?: () => void;
  isAuthenticated: boolean;
}

export default function LandingPage({
  onLaunchStudio,
  onSignIn,
  onSignUp,
  isAuthenticated,
}: LandingPageProps) {
  return (
    <div className={styles.container}>
      {/* Navigation */}
      <header className={styles.navbar}>
        <div className={styles.navInner}>
          <div className={styles.brand}>
            <div className={styles.logoSquare}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
            </div>
            <span className={styles.brandTitle}>PATCHWORK</span>
            <span className={styles.versionBadge}>v1.2</span>
          </div>

          <nav className={styles.navLinks}>
            <a href="#features" className={styles.navLink}>Features</a>
            <a href="#workflow" className={styles.navLink}>Workflow</a>
            <a href="#architecture" className={styles.navLink}>Architecture</a>
            <a href="#docs" className={styles.navLink}>Documentation</a>
          </nav>

          <div className={styles.navActions}>
            {!isAuthenticated ? (
              <>
                <button type="button" className={styles.signInBtn} onClick={onSignIn}>
                  Sign in
                </button>
                <button type="button" className={styles.getStartedBtn} onClick={onSignUp ?? onLaunchStudio}>
                  Get Started
                </button>
              </>
            ) : (
              <button type="button" className={styles.getStartedBtn} onClick={onLaunchStudio}>
                Open Studio →
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.heroBadgeDot} />
          <span>Visual Engineering Engine for React & Next.js</span>
        </div>

        <h1 className={styles.heroTitle}>
          The visual interface for your production code.
        </h1>

        <p className={styles.heroSubtitle}>
          PATCHWORK bridges visual website editing directly into Git commits and isolated PRs.
          Select components in the live preview, generate AST-safe diffs with LLMs, verify regressions with Playwright, and roll back instantly without full rebuilds.
        </p>

        <div className={styles.heroCtaRow}>
          <button type="button" className={styles.primaryCta} onClick={onLaunchStudio}>
            Open Studio & Live Editor
          </button>
          <a href="#workflow" className={styles.secondaryCta}>
            Explore the Architecture
          </a>
        </div>

        {/* Live Studio Preview Showcase */}
        <div className={styles.previewContainer}>
          <div className={styles.previewFrame}>
            <div className={styles.previewTopbar}>
              <div className={styles.windowDots}>
                <span className={styles.dotRed} />
                <span className={styles.dotYellow} />
                <span className={styles.dotGreen} />
              </div>
              <div className={styles.previewUrlBar}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
                <span>patchwork.studio / visual-editor • persia-darbar (main)</span>
              </div>
              <div className={styles.previewStatusPill}>
                <span className={styles.pillPulse} />
                <span>Runtime Bridge Active</span>
              </div>
            </div>

            {/* Interactive Preview Canvas Mock */}
            <div className={styles.previewBody}>
              <div className={styles.previewLeft}>
                <div className={styles.previewSidebarMock}>
                  <div className={styles.mockItemActive}>Visual Editor</div>
                  <div className={styles.mockItem}>Conflict Resolver <span className={styles.badgeMini}>1</span></div>
                  <div className={styles.mockItem}>Automated Tests <span className={styles.badgePass}>4/4</span></div>
                  <div className={styles.mockItem}>Releases & Rollback</div>
                  <div className={styles.mockItem}>Audit Trail</div>
                </div>
              </div>

              <div className={styles.previewCenter}>
                <div className={styles.previewIframeMock}>
                  <div className={styles.mockHeader}>
                    <span>Persia Darbar — Fine Dining Experience</span>
                    <span className={styles.mockCta}>Book Table</span>
                  </div>
                  <div className={styles.mockHero}>
                    <div className={styles.mockSelectedOutline}>
                      <h1>Royalty on a Platter</h1>
                      <div className={styles.mockTagBadge}>Hero.jsx:L14 • Selected</div>
                    </div>
                    <p>Authentic Mughlai & Persian delicacies served with perfection.</p>
                  </div>
                </div>
              </div>

              <div className={styles.previewRight}>
                <div className={styles.inspectorMock}>
                  <div className={styles.mockInspectorTitle}>SELECTED COMPONENT</div>
                  <div className={styles.mockInspectorSub}>Hero &lt;h1&gt; • src/components/Hero.jsx</div>
                  <div className={styles.mockPromptBox}>
                    <span>"Change heading color to deep gold and increase line height"</span>
                  </div>
                  <div className={styles.mockDiffBox}>
                    <div className={styles.diffDel}>- color: #1e293b;</div>
                    <div className={styles.diffAdd}>+ color: #d97706; /* Deep Gold */</div>
                  </div>
                  <div className={styles.mockBtnRow}>
                    <button type="button" className={styles.mockApproveBtn} onClick={onLaunchStudio}>
                      Approve Git Patch
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Grid */}
      <section id="features" className={styles.features}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Engineered for production resilience</h2>
          <p className={styles.sectionSubtitle}>
            No fragile drag-and-drop overlays. PATCHWORK operates with the same rigorous guarantees expected of your core CI/CD pipeline.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>AST & Source Mapping</h3>
            <p className={styles.featureDesc}>
              Element selections resolve strictly to registered repository components. Changes are generated as surgical unified diffs rather than messy arbitrary overrides.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Property-Level Conflict Resolution</h3>
            <p className={styles.featureDesc}>
              Prevent team collisions before they reach main. When concurrent edits affect the same component properties, PATCHWORK flags overlapping patches with 3-way visual resolution.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Automated Playwright Verification</h3>
            <p className={styles.featureDesc}>
              Execute headless browser assertions, synthetic click routes, CSP checks, and pixel-level visual regression tests on isolated temporary copies before committing.
            </p>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="1 4 1 10 7 10" />
                <polyline points="23 20 23 14 17 14" />
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Versioned Rollback & Audit Governance</h3>
            <p className={styles.featureDesc}>
              Every hotfix snapshot is tracked with SHA-256 cryptographic chaining. Restore known-good production states in under 200ms with zero server rebuild delays.
            </p>
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="workflow" className={styles.workflow}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>How PATCHWORK works</h2>
          <p className={styles.sectionSubtitle}>
            From visual element selection to audited pull request in seconds.
          </p>
        </div>

        <div className={styles.stepsRow}>
          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>01</div>
            <h4 className={styles.stepTitle}>Select in Preview</h4>
            <p className={styles.stepDesc}>
              Click any component in the embedded iframe. The Seam runtime identifies its exact React source file and allowed edit boundaries.
            </p>
          </div>

          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>02</div>
            <h4 className={styles.stepTitle}>Describe & Generate</h4>
            <p className={styles.stepDesc}>
              Prompt in natural language. The Groq / LLM orchestration service generates syntactically validated code diffs strictly scoped to that file.
            </p>
          </div>

          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>03</div>
            <h4 className={styles.stepTitle}>Verify & Resolve</h4>
            <p className={styles.stepDesc}>
              Verify visual diffs, execute Playwright assertions, and resolve property-level conflicts between concurrent team edits.
            </p>
          </div>

          <div className={styles.stepCol}>
            <div className={styles.stepNumber}>04</div>
            <h4 className={styles.stepTitle}>Release or Roll Back</h4>
            <p className={styles.stepDesc}>
              Open a clean GitHub pull request or publish client-side releases with instant zero-downtime rollback guarantees.
            </p>
          </div>
        </div>
      </section>

      {/* Architecture Deep Dive */}
      <section id="architecture" className={styles.features} style={{ borderTop: '1px solid var(--border-default)', background: 'var(--bg-subtle)' }}>
        <div className={styles.sectionHeader}>
          <div className={styles.heroBadge} style={{ marginBottom: '12px' }}>
            <span className={styles.heroBadgeDot} />
            <span>Developer Core Architecture</span>
          </div>
          <h2 className={styles.sectionTitle}>Built on AST precision, not DOM hacking</h2>
          <p className={styles.sectionSubtitle}>
            Most visual website editors inject disconnected CSS overrides that break in next week's deployment. PATCHWORK operates directly at the source code layer.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard} style={{ background: '#ffffff' }}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="16 18 22 12 16 6" />
                <polyline points="8 6 2 12 8 18" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Babel / TypeScript AST Parser</h3>
            <p className={styles.featureDesc}>
              Incoming LLM proposals are parsed into full syntax trees. If a generated patch breaks JSX tag balance or introduces type errors, it is discarded before ever touching your workspace.
            </p>
          </div>

          <div className={styles.featureCard} style={{ background: '#ffffff' }}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Zero-Dependency PostMessage Bridge</h3>
            <p className={styles.featureDesc}>
              The preview pane communicates with target applications via an isolated iframe bridge using structured <code>postMessage</code> handshakes, preserving complete app state and sandbox isolation.
            </p>
          </div>

          <div className={styles.featureCard} style={{ background: '#ffffff' }}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>SHA-256 Chained Audit Trail</h3>
            <p className={styles.featureDesc}>
              Every single inspection, proposal generation, 3-way merge, and rollback is cryptographically hashed with actor metadata, guaranteeing tamper-evident enterprise governance.
            </p>
          </div>

          <div className={styles.featureCard} style={{ background: '#ffffff' }}>
            <div className={styles.featureIcon}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                <line x1="4" y1="22" x2="4" y2="15" />
              </svg>
            </div>
            <h3 className={styles.featureTitle}>Git-Native Workflow Integration</h3>
            <p className={styles.featureDesc}>
              Seamless GitHub App installation hooks into your target repositories. Authors can generate branch hotfixes, commit directly to feature branches, or dispatch automated Pull Requests.
            </p>
          </div>
        </div>
      </section>

      {/* Documentation & Quick Start Section */}
      <section id="docs" className={styles.workflow} style={{ borderTop: '1px solid var(--border-default)' }}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Developer Documentation & Quick Start</h2>
          <p className={styles.sectionSubtitle}>
            Connect any React, Next.js, or Vite application in less than 2 minutes.
          </p>
        </div>

        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <div className={styles.stepNumber} style={{ fontSize: '13px', marginBottom: '10px' }}>CLI SETUP</div>
            <h3 className={styles.featureTitle}>1. Install Runtime Bridge</h3>
            <p className={styles.featureDesc} style={{ marginBottom: '12px' }}>
              Add the lightweight Seam inspection bridge to your client app root or load it via CDN:
            </p>
            <div style={{ background: '#09090b', color: '#e4e4e7', padding: '10px 12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowX: 'auto' }}>
              <code>npm install @patchwork/seam-bridge</code>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.stepNumber} style={{ fontSize: '13px', marginBottom: '10px' }}>INTEGRATION</div>
            <h3 className={styles.featureTitle}>2. Connect Repository</h3>
            <p className={styles.featureDesc} style={{ marginBottom: '12px' }}>
              Select your local dev server port (e.g. <code>http://localhost:5174</code>) or connect your GitHub repository for remote branches:
            </p>
            <div style={{ background: '#09090b', color: '#e4e4e7', padding: '10px 12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowX: 'auto' }}>
              <code>patchwork link --port 5174</code>
            </div>
          </div>

          <div className={styles.featureCard}>
            <div className={styles.stepNumber} style={{ fontSize: '13px', marginBottom: '10px' }}>TEST GATES</div>
            <h3 className={styles.featureTitle}>3. Automated Assertions</h3>
            <p className={styles.featureDesc} style={{ marginBottom: '12px' }}>
              Automated Playwright test runs run on ephemeral sandboxes to prevent layout shifts or broken flows:
            </p>
            <div style={{ background: '#09090b', color: '#e4e4e7', padding: '10px 12px', borderRadius: '6px', fontFamily: 'var(--font-mono)', fontSize: '12px', overflowX: 'auto' }}>
              <code>patchwork test --gate production</code>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className={styles.bottomCta}>
        <h2 className={styles.bottomCtaTitle}>Ready to visually edit your codebase?</h2>
        <p className={styles.bottomCtaSubtitle}>
          Connect your repository or test drive the interactive studio right now.
        </p>
        <button type="button" className={styles.primaryCta} onClick={onLaunchStudio}>
          Launch PATCHWORK Studio
        </button>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <div className={styles.brandTitle}>PATCHWORK</div>
            <p className={styles.footerTag}>
              Visual website editing and code-change management platform. Built for engineering teams.
            </p>
          </div>
          <div className={styles.footerLinks}>
            <div className={styles.footerCol}>
              <span className={styles.footerHeading}>Product</span>
              <a href="#features" className={styles.footerLink}>Visual Editor</a>
              <a href="#features" className={styles.footerLink}>Conflict Resolver</a>
              <a href="#features" className={styles.footerLink}>Automated Tests</a>
              <a href="#features" className={styles.footerLink}>Releases</a>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerHeading}>Integrations</span>
              <span className={styles.footerLink}>GitHub App</span>
              <span className={styles.footerLink}>Vercel CI/CD</span>
              <span className={styles.footerLink}>Supabase Auth</span>
              <span className={styles.footerLink}>Groq LLM</span>
            </div>
            <div className={styles.footerCol}>
              <span className={styles.footerHeading}>Company</span>
              <span className={styles.footerLink}>Documentation</span>
              <span className={styles.footerLink}>API Reference</span>
              <span className={styles.footerLink}>Security Model</span>
              <span className={styles.footerLink}>Privacy</span>
            </div>
          </div>
        </div>
        <div className={styles.footerBottom}>
          <span>© 2026 PATCHWORK Platform. All rights reserved.</span>
          <span className={styles.footerStatus}>
            <span className={styles.statusDot} /> All Systems Operational
          </span>
        </div>
      </footer>
    </div>
  );
}
