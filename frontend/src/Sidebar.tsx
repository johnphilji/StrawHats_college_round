import styles from './Sidebar.module.css';
import type { ConnectedWebsite } from './types';

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
  website: ConnectedWebsite;
}

const NAV = [
  { id: 'websites', label: 'Connected Sites', icon: '🌐' },
  { id: 'editor',   label: 'Visual Editor',   icon: '⬡' },
  { id: 'history',  label: 'Change History',  icon: '◷' },
  { id: 'deploy',   label: 'Deployments',     icon: '▲' },
];

export default function Sidebar({ activeView, onViewChange, website }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo} onClick={() => onViewChange('websites')} style={{ cursor: 'pointer' }}>
        <div className={styles.logoMark}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM14 14a2 2 0 100-4 2 2 0 000 4z"
              fill="currentColor" fillOpacity="0.9"/>
          </svg>
        </div>
        <span className={styles.logoText}>Patchwork</span>
      </div>

      {/* Active Website Badge */}
      <div className={styles.project} onClick={() => onViewChange('websites')} style={{ cursor: 'pointer' }}>
        <div className={styles.projectDot} />
        <div className={styles.projectInfo}>
          <div className={styles.projectName}>{website.name}</div>
          <div className={styles.projectBranch}>{website.repoName} • ⎇ {website.branch}</div>
        </div>
      </div>

      {/* Nav items */}
      <nav className={styles.nav}>
        {NAV.map(item => (
          <button
            key={item.id}
            className={`${styles.navItem} ${activeView === item.id ? styles.navItemActive : ''}`}
            onClick={() => onViewChange(item.id)}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.spacer} />

      {/* Status footer */}
      <div className={styles.footer}>
        <div className={styles.statusRow}>
          <span className={styles.statusDot} />
          <span className={styles.statusText}>Git Bridge Active</span>
        </div>
        <div className={styles.versionRow}>PATCHWORK v1.0 • Hackathon MVP</div>
      </div>
    </aside>
  );
}
