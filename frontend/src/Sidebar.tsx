import styles from './Sidebar.module.css';
import type { ConnectedWebsite } from './types';

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
  website: ConnectedWebsite | null;
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
      {/* Window Controls Header matching Photo 2 */}
      <div className={styles.windowHeader}>
        <div className={styles.windowDots}>
          <span className={styles.dotRed} />
          <span className={styles.dotYellow} />
          <span className={styles.dotGreen} />
        </div>
      </div>

      {/* Navigation List - Clean text without icons */}
      <nav className={styles.nav}>
        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'dashboard' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('dashboard')}
        >
          <span className={styles.navLabel}>Dashboard</span>
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'websites' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('websites')}
        >
          <span className={styles.navLabel}>Connected Repos</span>
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'editor' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('editor')}
        >
          <span className={styles.navLabel}>Visual Editor</span>
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'conflicts' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('conflicts')}
        >
          <span className={styles.navLabel}>Conflict Resolver</span>
          {unresolvedConflictsCount > 0 && (
            <span className={styles.badgeAmber}>{unresolvedConflictsCount}</span>
          )}
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'testing' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('testing')}
        >
          <span className={styles.navLabel}>Automated Tests</span>
          <span className={styles.badgeMint}>4/4</span>
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'deploy' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('deploy')}
        >
          <span className={styles.navLabel}>Releases & Rollback</span>
        </button>

        <button
          type="button"
          className={`${styles.navBtn} ${activeView === 'audit' ? styles.navBtnActive : ''}`}
          onClick={() => onViewChange('audit')}
        >
          <span className={styles.navLabel}>Audit Trail</span>
        </button>
      </nav>

      <div className={styles.spacer} />

      {/* Target Repo Status at Bottom */}
      <div
        className={styles.footer}
        onClick={() => onViewChange('websites')}
        title="Click to view all connected repositories"
      >
        <div className={styles.footerSiteName}>
          {website ? website.name : 'Select Repository'}
        </div>
        <div className={styles.footerMeta}>
          <span className={website ? styles.statusDot : styles.statusDotPending} />
          <span>{website ? website.branch : 'No site selected'}</span>
        </div>
      </div>
    </aside>
  );
}
