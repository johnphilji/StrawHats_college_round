import styles from './Sidebar.module.css';

interface SidebarProps {
  activeView: string;
  onViewChange: (v: string) => void;
}

const NAV = [
  { id: 'editor',   label: 'Visual Editor', icon: '⬡' },
  { id: 'history',  label: 'Change History', icon: '◷' },
  { id: 'deploy',   label: 'Deployments',   icon: '▲' },
  { id: 'settings', label: 'Settings',      icon: '⚙' },
];

export default function Sidebar({ activeView, onViewChange }: SidebarProps) {
  return (
    <aside className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoMark}>
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            <path d="M4 4h6v6H4zM12 4h6v6h-6zM4 12h6v6H4zM14 14a2 2 0 100-4 2 2 0 000 4z"
              fill="currentColor" fillOpacity="0.9"/>
          </svg>
        </div>
        <span className={styles.logoText}>Patchwork</span>
      </div>

      {/* Project badge */}
      <div className={styles.project}>
        <div className={styles.projectDot} />
        <div className={styles.projectInfo}>
          <div className={styles.projectName}>Acme Store</div>
          <div className={styles.projectBranch}>feat/demo-site</div>
        </div>
      </div>

      {/* Nav */}
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
          <span className={styles.statusText}>Connected to demo-site</span>
        </div>
        <div className={styles.versionRow}>v1.0.0-alpha</div>
      </div>
    </aside>
  );
}
