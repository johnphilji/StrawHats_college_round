import { useEffect, useState } from 'react';
import styles from './WebsitesView.module.css';
import type { ConnectedWebsite } from './types';
import { MOCK_WEBSITES } from './api';
import {
  beginGitHubInstallation,
  createProject,
  fetchGitHubRepositories,
  fetchProjects,
  type GitHubRepository,
  type ProjectRecord,
} from './api-client';

interface WebsitesViewProps {
  onSelectWebsite: (website: ConnectedWebsite) => void;
  isAuthenticated: boolean;
  onSignIn: () => void;
}

function projectToWebsite(project: ProjectRecord, repository?: GitHubRepository): ConnectedWebsite {
  const ownerAndName = project.repositoryUrl?.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
  return {
    id: project.id,
    projectId: project.id,
    repositoryIdentifier: project.repositoryIdentifier ?? undefined,
    name: project.name,
    tagline: project.description ?? 'Connected GitHub repository',
    repoUrl: project.repositoryUrl ?? repository?.url ?? '',
    repoOwner: repository?.owner ?? ownerAndName?.[1] ?? 'github',
    repoName: repository?.name ?? ownerAndName?.[2] ?? project.name,
    branch: project.productionBranch,
    previewUrl: repository?.url ?? project.repositoryUrl ?? '',
    productionUrl: repository?.url ?? project.repositoryUrl ?? '',
    status: 'connected',
    mode: 'managed',
    runtimeLoaderInstalled: false,
    lastModified: 'Connected',
    componentCount: 0,
    category: 'Ecommerce',
    code: project.name.slice(0, 2).toUpperCase(),
    framework: 'GitHub repository',
    activeRelease: 'No release',
    activePatchesCount: 0,
  };
}

export default function WebsitesView({ onSelectWebsite, isAuthenticated, onSignIn }: WebsitesViewProps) {
  const [websites, setWebsites] = useState<ConnectedWebsite[]>(MOCK_WEBSITES);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState('');
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetchProjects(controller.signal)
      .then((projects) => {
        const projectSites = projects.map((project) => projectToWebsite(project));
        setWebsites([...MOCK_WEBSITES, ...projectSites]);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : 'Could not load projects.');
      });
    fetchGitHubRepositories(controller.signal)
      .then((result) => setRepositories(result.repositories))
      .catch(() => {
        if (!controller.signal.aborted) setRepositories([]);
      });
    return () => controller.abort();
  }, [isAuthenticated]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onSignIn();
      return;
    }
    const repository = repositories.find((item) => String(item.id) === selectedRepositoryId);
    if (!name.trim() || !repository) return;
    setIsConnecting(true);
    setRequestError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        repositoryUrl: repository.url,
        repositoryIdentifier: String(repository.id),
        productionBranch: repository.defaultBranch,
      });
      const site = projectToWebsite(project, repository);
      setWebsites((current) => [site, ...current.filter((item) => item.projectId !== site.projectId)]);
      setShowModal(false);
      setName('');
      setSelectedRepositoryId('');
      onSelectWebsite(site);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not connect this repository.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleInstallGitHubApp = async () => {
    try {
      const { url } = await beginGitHubInstallation();
      window.location.assign(url);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not start GitHub App installation.');
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connected Websites</h1>
          <p className={styles.subtitle}>
            Select a website to load its preview and start visual editing. PATCHWORK connects directly to your Git repository.
          </p>
        </div>

        <button className={styles.connectBtn} onClick={() => setShowModal(true)}>
          + Connect Website
        </button>
      </div>

      {/* Website Cards Grid */}
      <div className={styles.grid}>
        {websites.map(site => (
          <div key={site.id} className={styles.card} onClick={() => onSelectWebsite(site)}>
            <div className={styles.cardTop}>
              <div className={styles.iconBox}>{site.code}</div>
              <div className={styles.infoBox}>
                <h3 className={styles.siteName}>{site.name}</h3>
                <div className={styles.repoPill}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  </svg>
                  <span>{site.repoOwner}/{site.repoName}</span>
                  <span className={styles.divider}>•</span>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="6" y1="3" x2="6" y2="15" />
                    <circle cx="18" cy="6" r="3" />
                    <circle cx="6" cy="18" r="3" />
                    <path d="M18 9a9 9 0 0 1-9 9" />
                  </svg>
                  <span>{site.branch}</span>
                </div>
              </div>
            </div>

            <p className={styles.tagline}>{site.tagline}</p>

            <div className={styles.cardFooter}>
              <span className={styles.previewUrl}>{site.previewUrl}</span>
              <button className={styles.openBtn}>
                Open in Editor
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      {showModal && (
        <div className={styles.overlay} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Connect a Website Repository</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConnect} className={styles.form}>
              {requestError && <p className={styles.connectionError} role="alert">{requestError}</p>}
              {!isAuthenticated && (
                <div className={styles.field}>
                  <span className={styles.label}>Sign in with GitHub to connect an owned repository.</span>
                  <button type="button" className={styles.submitBtn} onClick={onSignIn}>Sign in with GitHub</button>
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>Website Name</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Pet Store"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              {isAuthenticated && repositories.length > 0 ? (
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="github-repository">GitHub repository</label>
                  <select
                    id="github-repository"
                    className={styles.input}
                    value={selectedRepositoryId}
                    onChange={(event) => setSelectedRepositoryId(event.target.value)}
                    required
                  >
                    <option value="">Select a repository</option>
                    {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
                  </select>
                </div>
              ) : isAuthenticated ? (
                <div className={styles.field}>
                  <span className={styles.label}>Install the PATCHWORK GitHub App to list repositories.</span>
                  <button type="button" className={styles.cancelBtn} onClick={() => void handleInstallGitHubApp()}>Install GitHub App</button>
                </div>
              ) : null}

              <div className={styles.modalActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn} disabled={!isAuthenticated || !selectedRepositoryId || isConnecting}>
                  {isConnecting ? 'Connecting…' : 'Connect Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
