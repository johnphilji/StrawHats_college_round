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
    : '6px';

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
              reason: 'Original selector moved inside .payment-action. Re-bound with 94% confidence.',
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

        {/* Viewport controls with clean SVGs */}
        <div className={styles.viewportControls}>
          <button
            className={`${styles.viewportBtn} ${viewport === 'desktop' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('desktop')}
            title="Desktop view"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="3" width="20" height="14" rx="2" />
              <line x1="8" y1="21" x2="16" y2="21" />
              <line x1="12" y1="17" x2="12" y2="21" />
            </svg>
            <span>Desktop</span>
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'tablet' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('tablet')}
            title="Tablet view"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="2" width="16" height="20" rx="2" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
            <span>Tablet</span>
          </button>
          <button
            className={`${styles.viewportBtn} ${viewport === 'mobile' ? styles.viewportBtnActive : ''}`}
            onClick={() => setViewport('mobile')}
            title="Mobile view"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" />
              <line x1="12" y1="18" x2="12" y2="18" />
            </svg>
            <span>Mobile</span>
          </button>
        </div>

        {/* Element Relocation Test Button */}
        <button
          className={`${styles.toolBtn} ${isDomMutated ? styles.toolBtnActive : ''}`}
          onClick={onToggleDomMutation}
          title="Simulate upstream DOM change to test smart element tracking"
        >
          {isDomMutated ? 'DOM Mutated: Active' : 'Test Relocation'}
        </button>

        {/* Visual Diff Slider Toggle */}
        <button
          className={`${styles.toolBtn} ${viewMode === 'diff' ? styles.toolBtnActive : ''}`}
          onClick={() => setViewMode(v => v === 'live' ? 'diff' : 'live')}
        >
          {viewMode === 'diff' ? 'Exit Diff' : 'Visual Diff'}
        </button>

        {/* Branch state indicator */}
        <div className={styles.branchPill}>
          {isBranchApplied ? (
            <span className={styles.branchApplied}>
              branch: <strong>{activeChange.branch}</strong>
            </span>
          ) : (
            <span className={styles.branchMain}>
              branch: <strong>{website.branch}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Guide Banner */}
      {viewMode === 'live' ? (
        <div className={styles.instructionBanner}>
          <span className={styles.guideBadge}>EDITOR</span>
          <span>Hover over any element on the website to highlight, then click to describe a code change.</span>
          {isDomMutated && (
            <span className={styles.mutatedAlert}>
              DOM Tree Shifted • Smart Tracking Active
            </span>
          )}
        </div>
      ) : (
        <div className={styles.diffControlBar}>
          <span className={styles.diffLabel}>BASELINE</span>
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
              <span>Seasonal Promotion: 20% off all catalog orders with code PATCHWORK</span>
              {(hoveredId === 'nav-announcement' || selectedId === 'nav-announcement') && (
                <div className={styles.badge}>&lt;div.announcement&gt;</div>
              )}
            </div>

            {/* Header */}
            <header className={styles.header}>
              <div className={styles.logo}>Acme Supply Co.</div>
              <nav className={styles.nav}>
                <span>Products</span>
                <span>Categories</span>
                <span>Documentation</span>
                <span>Support</span>
              </nav>
              <div className={styles.cartIcon}>Cart (1)</div>
            </header>

            {/* Hero Section */}
            <div className={styles.heroSection}>
              <div className={styles.heroLeft}>
                <span className={styles.vetBadge}>Verified Product</span>

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
                  Wholesome nutrition, durable gear, and personalized care regimens delivered directly to your doorstep.
                </p>

                {/* Primary Button */}
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
                      <div className={styles.badge}>&lt;button.btn-primary&gt;</div>
                    )}
                  </button>

                  <button className={styles.secondaryBtn}>Learn More</button>
                </div>
              </div>

              {/* Order Summary Drawer on right */}
              <div className={styles.cartCard}>
                <div className={styles.cartHeader}>
                  <span>Order Summary</span>
                  <span className={styles.cartCount}>1 Item</span>
                </div>

                <div className={styles.cartItem}>
                  <div className={styles.itemBox}>PKG</div>
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
                        <div className={styles.badge}>&lt;span.price&gt;</div>
                      )}
                    </span>
                  </div>
                </div>

                {/* Checkout Button */}
                {isDomMutated ? (
                  <div className={styles.mutatedWrap}>
                    <div className={styles.mutatedNote}>Relocated into .payment-action container</div>
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
                          <div className={styles.badge}>&lt;.payment-action &gt; button&gt; (Relocated)</div>
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
                      <div className={styles.badge}>&lt;button.btn-checkout&gt;</div>
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
        <span className={styles.trayLabel}>Elements:</span>
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
