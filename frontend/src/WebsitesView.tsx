import { useCallback, useEffect, useState } from 'react';
import styles from './WebsitesView.module.css';
import type { ConnectedWebsite } from './types';
import { MOCK_WEBSITES } from './api';
import {
  beginGitHubInstallation,
  createProject,
  fetchGitHubInstallation,
  fetchGitHubRepositories,
  fetchProjects,
  type GitHubInstallation,
  type GitHubRepository,
  type ProjectRecord,
} from './api-client';

interface WebsitesViewProps {
  onSelectWebsite: (website: ConnectedWebsite) => void;
  isAuthenticated: boolean;
  onSignIn: () => void;
}

interface Connections {
  installation: GitHubInstallation;
  repositories: GitHubRepository[];
}

const GITHUB_CONNECTED_PARAM = 'github_connected';

function cameBackFromInstallation(): boolean {
  return new URLSearchParams(window.location.search).get(GITHUB_CONNECTED_PARAM) === '1';
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
    previewUrl: project.productionUrl ?? repository?.url ?? project.repositoryUrl ?? '',
    productionUrl: project.productionUrl ?? repository?.url ?? project.repositoryUrl ?? '',
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
  const [websites, setWebsites] = useState<ConnectedWebsite[]>(isAuthenticated ? [] : MOCK_WEBSITES);
  const [showModal, setShowModal] = useState(cameBackFromInstallation);
  const [name, setName] = useState('');
  const [selectedRepositoryId, setSelectedRepositoryId] = useState('');
  const [branch, setBranch] = useState('');
  const [hostedUrl, setHostedUrl] = useState('');
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [installation, setInstallation] = useState<GitHubInstallation | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(() =>
    cameBackFromInstallation() ? 'GitHub connected. Pick a repository below to add it to PATCHWORK.' : null,
  );
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);

  const fetchConnections = useCallback(async (signal?: AbortSignal): Promise<Connections> => {
    const [install, repos] = await Promise.all([
      fetchGitHubInstallation(signal).catch(() => ({ connected: false } as GitHubInstallation)),
      fetchGitHubRepositories(signal).catch(() => ({ repositories: [], hasMore: false })),
    ]);
    return { installation: install, repositories: repos.repositories };
  }, []);

  const applyConnections = useCallback((result: Connections) => {
    setInstallation(result.installation);
    setRepositories(result.repositories);
  }, []);

  const refreshConnections = useCallback(async () => {
    setIsLoadingRepos(true);
    try {
      applyConnections(await fetchConnections());
    } finally {
      setIsLoadingRepos(false);
    }
  }, [applyConnections, fetchConnections]);

  // Strip the one-shot callback query param once the app has read it.
  useEffect(() => {
    if (cameBackFromInstallation()) window.history.replaceState({}, '', window.location.pathname);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const controller = new AbortController();
    fetchProjects(controller.signal)
      .then((projects) => {
        const projectSites = projects.map((project) => projectToWebsite(project));
        setWebsites(projectSites);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setRequestError(error instanceof Error ? error.message : 'Could not load projects.');
      });
    fetchConnections(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) applyConnections(result);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoadingRepos(false);
      });
    return () => controller.abort();
  }, [isAuthenticated, applyConnections, fetchConnections]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      onSignIn();
      return;
    }
    const repository = repositories.find((item) => String(item.id) === selectedRepositoryId);
    if (!name.trim() || !repository) return;
    const productionUrl = hostedUrl.trim();
    if (productionUrl) {
      try {
        new URL(productionUrl);
      } catch {
        setRequestError('Enter a valid hosted site URL, e.g. https://your-site.vercel.app');
        return;
      }
    }
    setIsConnecting(true);
    setRequestError(null);
    try {
      const project = await createProject({
        name: name.trim(),
        repositoryUrl: repository.url,
        repositoryIdentifier: String(repository.id),
        productionBranch: branch.trim() || repository.defaultBranch,
        ...(productionUrl ? { productionUrl } : {}),
      });
      const site = projectToWebsite(project, repository);
      setWebsites((current) => [site, ...current.filter((item) => item.projectId !== site.projectId)]);
      setShowModal(false);
      setNotice(null);
      setName('');
      setSelectedRepositoryId('');
      setBranch('');
      setHostedUrl('');
      onSelectWebsite(site);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not connect this repository.');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleInstallGitHubApp = async () => {
    setRequestError(null);
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
          <h1 className={styles.title}>Connected Repos</h1>
          <p className={styles.subtitle}>
            Select a repository to load its preview and start visual editing. PATCHWORK connects directly to your Git repository.
          </p>
        </div>

        <div className={styles.headerActions}>
          {isAuthenticated && installation && (
            <span className={installation.connected ? styles.statusPillOn : styles.statusPillOff}>
              {installation.connected ? 'GitHub App connected' : 'GitHub App not installed'}
            </span>
          )}
          <button className={styles.connectBtn} onClick={() => { setNotice(null); setShowModal(true); }}>
            + Connect Repo
          </button>
        </div>
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
              <h3 className={styles.modalTitle}>Connect a Repository</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleConnect} className={styles.form}>
              {notice && <p className={styles.connectionNotice} role="status">{notice}</p>}
              {requestError && <p className={styles.connectionError} role="alert">{requestError}</p>}
              {!isAuthenticated && (
                <div className={styles.field}>
                  <span className={styles.label}>Sign in with GitHub to connect an owned repository.</span>
                  <button type="button" className={styles.submitBtn} onClick={onSignIn}>Sign in with GitHub</button>
                </div>
              )}
              <div className={styles.field}>
                <label className={styles.label}>Repository Label</label>
                <input
                  type="text"
                  placeholder="e.g. Acme Pet Store"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className={styles.input}
                  required
                />
              </div>

              {isAuthenticated && installation?.connected ? (
                <>
                  {repositories.length > 0 ? (
                    <>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="github-repository">GitHub repository</label>
                        <select
                          id="github-repository"
                          className={styles.input}
                          value={selectedRepositoryId}
                          onChange={(event) => {
                            const id = event.target.value;
                            setSelectedRepositoryId(id);
                            setBranch(repositories.find((repo) => String(repo.id) === id)?.defaultBranch ?? '');
                          }}
                          required
                        >
                          <option value="">Select a repository</option>
                          {repositories.map((repository) => <option key={repository.id} value={repository.id}>{repository.fullName}</option>)}
                        </select>
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="github-branch">Production branch</label>
                        <input
                          id="github-branch"
                          className={styles.input}
                          value={branch}
                          onChange={(event) => setBranch(event.target.value)}
                          placeholder="main"
                          required
                        />
                      </div>
                      <div className={styles.field}>
                        <label className={styles.label} htmlFor="hosted-url">Hosted site URL</label>
                        <input
                          id="hosted-url"
                          type="url"
                          className={styles.input}
                          value={hostedUrl}
                          onChange={(event) => setHostedUrl(event.target.value)}
                          placeholder="https://your-site.vercel.app"
                          required
                        />
                      </div>
                      {selectedRepositoryId && (
                        <p className={styles.storedHint}>
                          PATCHWORK stores this repository and its hosted URL. Edits are generated from the source via the GitHub App installation; the editor preview loads <strong>{hostedUrl.trim() || 'the hosted site'}</strong>.
                        </p>
                      )}
                    </>
                  ) : (
                    <div className={styles.field}>
                      <span className={styles.label}>No repositories are shared with PATCHWORK yet. Grant access to a repository on GitHub, then refresh.</span>
                    </div>
                  )}
                  <button type="button" className={styles.cancelBtn} onClick={() => void refreshConnections()} disabled={isLoadingRepos}>
                    {isLoadingRepos ? 'Refreshing…' : 'Refresh repositories'}
                  </button>
                </>
              ) : isAuthenticated && installation === null ? (
                <div className={styles.field}>
                  <span className={styles.label}>Checking GitHub connection…</span>
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
                <button type="submit" className={styles.submitBtn} disabled={!isAuthenticated || !selectedRepositoryId || !branch.trim() || !hostedUrl.trim() || isConnecting}>
                  {isConnecting ? 'Connecting…' : 'Connect Repo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
