import styles from './DashboardView.module.css';
import type { ConnectedWebsite } from './types';

interface DashboardViewProps {
  onNavigate: (view: string) => void;
  onSelectWebsite: (website: ConnectedWebsite) => void;
  websites: ConnectedWebsite[];
  unresolvedConflictsCount?: number;
}

export default function DashboardView({
  onNavigate,
  onSelectWebsite,
  websites,
  unresolvedConflictsCount = 1,
}: DashboardViewProps) {
  return (
    <div className={styles.container}>
      <div className={styles.contentWrapper}>
        {/* Header Banner */}
        <div className={styles.header}>
        <div className={styles.badge}>DEVELOPER WORKSPACE</div>
        <h1 className={styles.title}>Patchwork Studio Dashboard</h1>
        <p className={styles.subtitle}>
          Modify, test, and ship live website changes in production through independently managed patches — without waiting for full rebuilds or CI/CD redeployments.
        </p>
      </div>

      {/* Feature Capabilities Grid */}
      <div className={styles.grid}>
        <div className={styles.card} onClick={() => onNavigate('websites')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>01</span>
            <span className={styles.cardTag}>Connection</span>
          </div>
          <h2 className={styles.cardTitle}>Connected Repositories</h2>
          <p className={styles.cardDesc}>
            Connect your live deployed web applications via direct URL or GitHub App integration. Manage environments and branches across production and staging.
          </p>
          <div className={styles.cardMeta}>
            <span>{websites.length} {websites.length === 1 ? 'repository' : 'repositories'} available</span>
            <span className={styles.actionLink}>View Repos →</span>
          </div>
        </div>

        <div className={styles.card} onClick={() => onNavigate('editor')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>02</span>
            <span className={styles.cardTag}>Visual Editing</span>
          </div>
          <h2 className={styles.cardTitle}>Live Visual Editor</h2>
          <p className={styles.cardDesc}>
            Click directly on live DOM elements within your deployed site. Modify copy, styles, layouts, and CTAs, with changes mapped directly back to source components.
          </p>
          <div className={styles.cardMeta}>
            <span>Bridges AST & DOM</span>
            <span className={styles.actionLink}>Open Editor →</span>
          </div>
        </div>

        <div className={styles.card} onClick={() => onNavigate('conflicts')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>03</span>
            <span className={styles.cardTag}>Safety</span>
          </div>
          <h2 className={styles.cardTitle}>Conflict Resolver</h2>
          <p className={styles.cardDesc}>
            Intelligent AST-level merge protection. Detect overlapping edits, stale target selectors, and component changes across concurrent team branches before shipping.
          </p>
          <div className={styles.cardMeta}>
            {unresolvedConflictsCount > 0 ? (
              <span className={styles.conflictAlert}>{unresolvedConflictsCount} pending conflict</span>
            ) : (
              <span>0 conflicts detected</span>
            )}
            <span className={styles.actionLink}>Resolve →</span>
          </div>
        </div>

        <div className={styles.card} onClick={() => onNavigate('testing')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>04</span>
            <span className={styles.cardTag}>Verification</span>
          </div>
          <h2 className={styles.cardTitle}>Automated Testing Suite</h2>
          <p className={styles.cardDesc}>
            Run headless Playwright tests, DOM integrity checks, and regression audits in isolated browser sandboxes before patches ever hit live end users.
          </p>
          <div className={styles.cardMeta}>
            <span className={styles.badgeSuccess}>4/4 checks passing</span>
            <span className={styles.actionLink}>Run Tests →</span>
          </div>
        </div>

        <div className={styles.card} onClick={() => onNavigate('deploy')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>05</span>
            <span className={styles.cardTag}>Delivery</span>
          </div>
          <h2 className={styles.cardTitle}>Releases & Rollback</h2>
          <p className={styles.cardDesc}>
            Publish hotfix releases instantly to live visitors. If an unexpected regression occurs, execute instant one-click rollbacks to restore baseline functionality.
          </p>
          <div className={styles.cardMeta}>
            <span>Zero-downtime rollback</span>
            <span className={styles.actionLink}>Manage Releases →</span>
          </div>
        </div>

        <div className={styles.card} onClick={() => onNavigate('audit')}>
          <div className={styles.cardHeader}>
            <span className={styles.stepNum}>06</span>
            <span className={styles.cardTag}>Governance</span>
          </div>
          <h2 className={styles.cardTitle}>Audit Trail & Logs</h2>
          <p className={styles.cardDesc}>
            Full cryptographic provenance log detailing every visual selection, AST diff, team approval, test execution, and production release timestamp.
          </p>
          <div className={styles.cardMeta}>
            <span>Tamper-evident logs</span>
            <span className={styles.actionLink}>View Audit Log →</span>
          </div>
        </div>
      </div>

      {/* Quick Launch Section */}
      <div className={styles.quickLaunchSection}>
        <div className={styles.quickLaunchHeader}>
          <div>
            <h3 className={styles.quickLaunchTitle}>Quick Repository Access</h3>
            <p className={styles.quickLaunchSub}>Choose a connected website to launch directly in the Visual Editor</p>
          </div>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => onNavigate('websites')}
          >
            Manage All Connected Repos
          </button>
        </div>

        <div className={styles.reposList}>
          {websites.slice(0, 3).map((site) => (
            <div key={site.id} className={styles.repoItem}>
              <div className={styles.repoInfo}>
                <div className={styles.repoHeaderRow}>
                  <span className={styles.repoName}>{site.name}</span>
                  <span className={styles.repoCategory}>{site.category}</span>
                </div>
                <div className={styles.repoMeta}>
                  <span>{site.repoOwner}/{site.repoName}</span>
                  <span>•</span>
                  <span>{site.branch}</span>
                  <span>•</span>
                  <span className={styles.repoStatusActive}>{site.status}</span>
                </div>
              </div>
              <button
                type="button"
                className={styles.openEditorBtn}
                onClick={() => onSelectWebsite(site)}
              >
                Open in Editor →
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  </div>
  );
}
