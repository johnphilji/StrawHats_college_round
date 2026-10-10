import { useState } from 'react';
import styles from './PreviewPane.module.css';
import type { SelectedComponent, ConnectedWebsite, CodeChange } from './types';
import { MOCK_COMPONENTS } from './api';

interface PreviewPaneProps {
  selectedId: string | null;
  onSelect: (component: SelectedComponent) => void;
  website: ConnectedWebsite;
  activeChange: CodeChange | null;
  isDomMutated: boolean;
  onToggleDomMutation: () => void;
}

export default function PreviewPane({
  selectedId,
  onSelect,
  website,
  activeChange,
  isDomMutated,
  onToggleDomMutation,
}: PreviewPaneProps) {
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'live' | 'diff'>('live');
  const [diffSlider, setDiffSlider] = useState<number>(50);

  const viewportWidth = {
    desktop: '100%',
    tablet: '768px',
    mobile: '375px',
  }[viewport];

  // Dynamic overrides if activeChange is in 'applied_branch' or 'deployed' status
  const isBranchApplied = activeChange && (activeChange.status === 'applied_branch' || activeChange.status === 'deployed');
  const heroCtaApplied = isBranchApplied && activeChange.componentId === 'hero-cta';
  const checkoutApplied = isBranchApplied && activeChange.componentId === 'checkout-button';

  const heroCtaText = heroCtaApplied && activeChange.previewApplied.text
    ? activeChange.previewApplied.text
    : 'Buy Now — $34.99';

  const heroCtaBg = heroCtaApplied && activeChange.previewApplied.backgroundColor
    ? activeChange.previewApplied.backgroundColor
    : '#2563eb';

  const heroCtaRadius = heroCtaApplied && activeChange.previewApplied.borderRadius
    ? activeChange.previewApplied.borderRadius
    : '8px';

  const checkoutText = checkoutApplied && activeChange.previewApplied.text
    ? activeChange.previewApplied.text
    : 'Proceed to Checkout';

  const checkoutBg = checkoutApplied && activeChange.previewApplied.backgroundColor
    ? activeChange.previewApplied.backgroundColor
    : '#16a34a';

  const handleComponentClick = (componentId: string) => {
    const comp = MOCK_COMPONENTS.find(c => c.componentId === componentId);
    if (comp) {
      if (isDomMutated && componentId === 'checkout-button') {
        const mutated: SelectedComponent = {
          ...comp,
          fingerprint: {
            ...comp.fingerprint,
            selector: '.payment-action > button',
            parentTag: 'DIV',
            parentSelector: '.payment-action',
            isSelfHealed: true,
            selfHealProposal: {
              originalSelector: '#checkout-button',
              newSelector: '.payment-action > button',
              reason: 'Original selector #checkout-button moved inside .payment-action. Re-bound with 94% confidence.',
              confidence: 94,
            },
          },
        };
        onSelect(mutated);
      } else {
        onSelect(comp);
      }
    }
  };

  return (
    <div className={styles.pane}>
      {/* Top Browser URL Bar & Controls */}
      <div className={styles.toolbar}>
        <div className={styles.urlBar}>
          <span className={styles.urlDot} />
          <span className={styles.urlText}>{website.previewUrl}</span>
        </div>

        {/* Viewport controls */}
        <div className={styles.viewportControls}>
          <button
            className={`${styles.viewportBtn} ${viewport === 'desktop' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('desktop')}
          >
            🖥 Desktop
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'tablet' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('tablet')}
          >
            📱 Tablet
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'mobile' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('mobile')}
          >
            📲 Mobile
          </button>
        </div>

        {/* Self-Healing DOM Shift button */}
        <button
          className={`${styles.toolBtn} ${isDomMutated ? styles.toolBtnActive : ''}`}
          onClick={onToggleDomMutation}
          title="Simulate upstream website DOM update to test smart self-healing"
        >
          {isDomMutated ? '🧬 DOM Mutated (Active)' : '⚡ Test Self-Healing'}
        </button>

        {/* Visual Diff Slider button */}
        <button
          className={`${styles.toolBtn} ${viewMode === 'diff' ? styles.toolBtnActive : ''}`}
          onClick={() => setViewMode(v => v === 'live' ? 'diff' : 'live')}
          title="Compare original baseline vs branch change with visual split slider"
        >
          {viewMode === 'diff' ? '👁 Exit Visual Diff' : '🔍 Visual Diff Slider'}
        </button>

        {/* Branch state tag */}
        <div className={styles.branchPill}>
          {isBranchApplied ? (
            <span className={styles.branchApplied}>
              ● Previewing: <strong>{activeChange.branch}</strong>
            </span>
          ) : (
            <span className={styles.branchMain}>
              ⎇ <strong>{website.branch}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Guide Banner */}
      {viewMode === 'live' ? (
        <div className={styles.instructionBanner}>
          <span className={styles.sparkle}>✦</span>
          <span>
            <strong>Interactive Visual Editor:</strong> Hover over any element to highlight, then click to prompt AI for code changes.
          </span>
          {isDomMutated && (
            <span className={styles.mutatedAlert}>
              ⚠️ DOM Tree Shifted • Smart Element Tracking Active
            </span>
          )}
        </div>
      ) : (
        <div className={styles.diffControlBar}>
          <span className={styles.diffLabel}>ORIGINAL BASELINE</span>
          <input
            type="range"
            min="0"
            max="100"
            value={diffSlider}
            onChange={(e) => setDiffSlider(Number(e.target.value))}
            className={styles.diffSlider}
          />
          <span className={styles.diffLabel}>BRANCH MODIFIED ({diffSlider}%)</span>
        </div>
      )}

      {/* Main Preview Stage */}
      <div className={styles.stage}>
        <div className={styles.viewportFrame} style={{ width: viewportWidth }}>
          <div className={styles.storefront}>
            {/* Top Announcement Bar */}
            <div
              className={`${styles.announcement} ${hoveredId === 'nav-announcement' ? styles.hovered : ''} ${selectedId === 'nav-announcement' ? styles.selected : ''}`}
              onClick={() => handleComponentClick('nav-announcement')}
              onMouseEnter={() => setHoveredId('nav-announcement')}
              onMouseLeave={() => setHoveredId(null)}
            >
              <span>🐾 Flash Sale: 20% off all organic treats with code PATCHWORK</span>
              {(hoveredId === 'nav-announcement' || selectedId === 'nav-announcement') && (
                <div className={styles.badge}>&lt;div.announcement&gt; Top Banner</div>
              )}
            </div>

            {/* Header */}
            <header className={styles.header}>
              <div className={styles.logo}>🐾 Acme Pet Store</div>
              <nav className={styles.nav}>
                <span>Dogs</span>
                <span>Cats</span>
                <span>Treats</span>
                <span>About</span>
              </nav>
              <div className={styles.cartIcon}>🛒 Cart (1)</div>
            </header>

            {/* Hero Body */}
            <div className={styles.heroSection}>
              <div className={styles.heroLeft}>
                <span className={styles.vetBadge}>Veterinarian Approved</span>

                {/* Hero Title */}
                <h1
                  className={`${styles.heroTitle} ${hoveredId === 'hero-title' ? styles.hovered : ''} ${selectedId === 'hero-title' ? styles.selected : ''}`}
                  onClick={() => handleComponentClick('hero-title')}
                  onMouseEnter={() => setHoveredId('hero-title')}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  Premium Care for Happy Companions
                  {(hoveredId === 'hero-title' || selectedId === 'hero-title') && (
                    <div className={styles.badge}>&lt;h1&gt; Hero Heading</div>
                  )}
                </h1>

                <p className={styles.heroDesc}>
                  Wholesome nutrition, durable playthings, and personalized healthcare regimens for pets.
                </p>

                {/* The Buy Now Button (Hero CTA) */}
                <div className={styles.heroActions}>
                  <button
                    className={`${styles.buyBtn} ${hoveredId === 'hero-cta' ? styles.hovered : ''} ${selectedId === 'hero-cta' ? styles.selected : ''}`}
                    style={{
                      backgroundColor: heroCtaBg,
                      borderRadius: heroCtaRadius,
                    }}
                    onClick={() => handleComponentClick('hero-cta')}
                    onMouseEnter={() => setHoveredId('hero-cta')}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span>{heroCtaText}</span>
                    {(hoveredId === 'hero-cta' || selectedId === 'hero-cta') && (
                      <div className={styles.badge}>&lt;button.btn-primary&gt; Buy Now Button</div>
                    )}
                  </button>

                  <button className={styles.secondaryBtn}>Learn More</button>
                </div>
              </div>

              {/* Mini Cart Drawer on right */}
              <div className={styles.cartCard}>
                <div className={styles.cartHeader}>
                  <span>Shopping Cart</span>
                  <span className={styles.cartCount}>1 Item</span>
                </div>

                <div className={styles.cartItem}>
                  <div className={styles.itemIcon}>🦴</div>
                  <div className={styles.itemMeta}>
                    <div className={styles.itemTitle}>Organic Dental Chews (30pk)</div>
                    <span
                      className={`${styles.itemPrice} ${hoveredId === 'product-price' ? styles.hovered : ''} ${selectedId === 'product-price' ? styles.selected : ''}`}
                      onClick={() => handleComponentClick('product-price')}
                      onMouseEnter={() => setHoveredId('product-price')}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      $34.99
                      {(hoveredId === 'product-price' || selectedId === 'product-price') && (
                        <div className={styles.badge}>&lt;span.price&gt; Price Tag</div>
                      )}
                    </span>
                  </div>
                </div>

                {/* Checkout Button (Supports simulated DOM mutation) */}
                {isDomMutated ? (
                  <div className={styles.mutatedWrap}>
                    <div className={styles.mutatedNote}>🧬 Upstream Refactor: inside &lt;div class="payment-action"&gt;</div>
                    <div className="payment-action">
                      <button
                        className={`${styles.checkoutBtn} ${hoveredId === 'checkout-button' ? styles.hovered : ''} ${selectedId === 'checkout-button' ? styles.selected : ''}`}
                        style={{ backgroundColor: checkoutBg }}
                        onClick={() => handleComponentClick('checkout-button')}
                        onMouseEnter={() => setHoveredId('checkout-button')}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <span>{checkoutText}</span>
                        {(hoveredId === 'checkout-button' || selectedId === 'checkout-button') && (
                          <div className={styles.badge}>&lt;.payment-action &gt; button&gt; (Self-Healed)</div>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    className={`${styles.checkoutBtn} ${hoveredId === 'checkout-button' ? styles.hovered : ''} ${selectedId === 'checkout-button' ? styles.selected : ''}`}
                    style={{ backgroundColor: checkoutBg }}
                    onClick={() => handleComponentClick('checkout-button')}
                    onMouseEnter={() => setHoveredId('checkout-button')}
                    onMouseLeave={() => setHoveredId(null)}
                  >
                    <span>{checkoutText}</span>
                    {(hoveredId === 'checkout-button' || selectedId === 'checkout-button') && (
                      <div className={styles.badge}>&lt;button.btn-checkout&gt; Checkout</div>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Component quick selector bar */}
      <div className={styles.quickTray}>
        <span className={styles.trayLabel}>Detected Elements:</span>
        {MOCK_COMPONENTS.map(c => (
          <button
            key={c.componentId}
            className={`${styles.trayChip} ${selectedId === c.componentId ? styles.trayChipActive : ''}`}
            onClick={() => handleComponentClick(c.componentId)}
          >
            <span>{c.label}</span>
            <span className={styles.chipTag}>&lt;{c.tagName.toLowerCase()}&gt;</span>
          </button>
        ))}
      </div>
    </div>
  );
}
