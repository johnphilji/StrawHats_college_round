import styles from './Sidebar.module.css';
import type { ConnectedWebsite } from './types';

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
  website: ConnectedWebsite;
  unresolvedConflictsCount?: number;
}

const NAV_ITEMS = [
  { id: 'editor',    label: 'Visual Editor',         icon: '⬡', badge: null },
  { id: 'conflicts', label: 'Conflict Resolver',     icon: '⚡', badge: '1 Conflict' },
  { id: 'testing',   label: 'Automated Testing',     icon: '🧪', badge: 'Playwright' },
  { id: 'deploy',    label: 'Releases & Rollback',    icon: '▲', badge: 'v1.2.0' },
  { id: 'websites',  label: 'Connected Websites',     icon: '🌐', badge: null },
  { id: 'audit',     label: 'Audit Trail',            icon: '📜', badge: null },
];

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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.9" />
            <rect x="13" y="3" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.5" />
            <rect x="3" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.5" />
            <rect x="13" y="13" width="8" height="8" rx="2" fill="currentColor" fillOpacity="0.9" />
          </svg>
        </div>
        <div className={styles.brandInfo}>
          <div className={styles.brandName}>PATCHWORK</div>
          <div className={styles.brandTagline}>Visual Git Editor</div>
        </div>
      </div>

      {/* Active Website Card */}
      <div className={styles.currentSiteCard} onClick={() => onViewChange('websites')}>
        <span className={styles.siteIcon}>{website.icon}</span>
        <div className={styles.siteMeta}>
          <div className={styles.siteName}>{website.name}</div>
          <div className={styles.siteRepo}>{website.repoOwner}/{website.repoName}</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className={styles.nav}>
        <div className={styles.navGroupLabel}>CORE EDITING</div>
        <button
          className={`${styles.navBtn} ${activeView === 'editor' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('editor')}
        >
          <span className={styles.navIcon}>⬡</span>
          <span className={styles.navLabel}>Visual Editor</span>
        </button>

        <div className={styles.navGroupLabel} style={{ marginTop: '12px' }}>SAFETY & GOVERNANCE</div>
        {NAV_ITEMS.slice(1, 4).map(item => {
          const isConflict = item.id === 'conflicts';
          return (
            <button
              key={item.id}
              className={`${styles.navBtn} ${activeView === item.id ? styles.navBtnActive : ''}`}
              onClick={() => onViewChange(item.id)}
            >
              <span className={styles.navIcon}>{item.icon}</span>
              <span className={styles.navLabel}>{item.label}</span>
              {item.badge && (
                <span
                  className={`${styles.navBadge} ${
                    isConflict && unresolvedConflictsCount > 0
                      ? styles.badgeWarning
                      : styles.badgeNeutral
                  }`}
                >
                  {isConflict ? `${unresolvedConflictsCount} Conflict` : item.badge}
                </span>
              )}
            </button>
          );
        })}

        <div className={styles.navGroupLabel} style={{ marginTop: '12px' }}>SETTINGS & LOGS</div>
        {NAV_ITEMS.slice(4).map(item => (
          <button
            key={item.id}
            className={`${styles.navBtn} ${activeView === item.id ? styles.navBtnActive : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span className={styles.navLabel}>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Footer */}
      <div className={styles.footer}>
        <div className={styles.gitStatus}>
          <span className={styles.gitDot} />
          <span>Git Bridge: <strong>Connected</strong></span>
        </div>
        <div className={styles.branchStatus}>⎇ {website.branch} (tracking)</div>
      </div>
    </aside>
  );
}
