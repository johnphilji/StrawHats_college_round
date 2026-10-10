import styles from './Sidebar.module.css';
import type { ConnectedWebsite } from './types';

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
  website: ConnectedWebsite;
  unresolvedConflictsCount?: number;
}

export default function Sidebar({
  activeView,
  onViewChange,
  website,
  unresolvedConflictsCount = 1,
}: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Brand */}
      <div className={styles.brand} onClick={() => onViewChange('websites')}>
        <div className={styles.logoMark}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
        </div>
        <div className={styles.brandInfo}>
          <div className={styles.brandName}>PATCHWORK</div>
          <div className={styles.brandTagline}>Visual Code Studio</div>
        </div>
      </div>

      {/* Active Website Selector */}
      <div className={styles.currentSiteCard} onClick={() => onViewChange('websites')}>
        <div className={styles.siteMonogram}>{website.code}</div>
        <div className={styles.siteMeta}>
          <div className={styles.siteName}>{website.name}</div>
          <div className={styles.siteRepo}>{website.repoOwner}/{website.repoName}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navGroupLabel}>WORKSPACE</div>
        <button
          className={`${styles.navBtn} ${activeView === 'editor' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('editor')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M9 3v18" />
              <path d="M14 9l3 3-3 3" />
            </svg>
          </span>
          <span className={styles.navLabel}>Visual Editor</span>
        </button>

        <div className={styles.navGroupLabel} style={{ marginTop: '14px' }}>VERIFICATION & RELEASE</div>

        {/* Conflict Resolver */}
        <button
          className={`${styles.navBtn} ${activeView === 'conflicts' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('conflicts')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="18" r="3" />
              <circle cx="6" cy="6" r="3" />
              <path d="M13 6h3a2 2 0 0 1 2 2v7" />
              <line x1="6" y1="9" x2="6" y2="21" />
            </svg>
          </span>
          <span className={styles.navLabel}>Conflict Resolver</span>
          {unresolvedConflictsCount > 0 && (
            <span className={styles.navBadgeAlert}>{unresolvedConflictsCount}</span>
          )}
        </button>

        {/* Automated Testing */}
        <button
          className={`${styles.navBtn} ${activeView === 'testing' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('testing')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          </span>
          <span className={styles.navLabel}>Automated Tests</span>
        </button>

        {/* Releases & Rollback */}
        <button
          className={`${styles.navBtn} ${activeView === 'deploy' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('deploy')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="16 16 12 12 8 16" />
              <line x1="12" y1="12" x2="12" y2="21" />
              <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" />
            </svg>
          </span>
          <span className={styles.navLabel}>Releases & Rollback</span>
          <span className={styles.navBadgeNeutral}>{website.activeRelease}</span>
        </button>

        <div className={styles.navGroupLabel} style={{ marginTop: '14px' }}>REPOSITORY</div>

        {/* Connected Websites */}
        <button
          className={`${styles.navBtn} ${activeView === 'websites' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('websites')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
          </span>
          <span className={styles.navLabel}>Connected Repos</span>
        </button>

        {/* Audit Trail */}
        <button
          className={`${styles.navBtn} ${activeView === 'audit' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('audit')}
        >
          <span className={styles.navIcon}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
          </span>
          <span className={styles.navLabel}>Audit Log</span>
        </button>
      </nav>

      <div className={styles.spacer} />

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.gitStatus}>
          <span className={styles.gitDot} />
          <span>Git Bridge: <strong>Connected</strong></span>
        </div>
        <div className={styles.branchStatus}>branch: {website.branch}</div>
      </div>
    </aside>
  );
}
