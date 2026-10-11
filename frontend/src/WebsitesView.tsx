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

const LOCAL_WEBSITES_KEY = 'patchwork_custom_websites';

function getInitialWebsites(): ConnectedWebsite[] {
  try {
    const saved = localStorage.getItem(LOCAL_WEBSITES_KEY);
    if (saved) {
      const parsed: ConnectedWebsite[] = JSON.parse(saved);
      // Ensure Persia Darbar is always first
      const hasPersia = parsed.some(s => s.id === 'persia-darbar');
      if (hasPersia) return parsed;
      return [...MOCK_WEBSITES, ...parsed.filter(s => !MOCK_WEBSITES.some(m => m.id === s.id))];
    }
  } catch {
    // ignore
  }
  return MOCK_WEBSITES;
}

export default function WebsitesView({ onSelectWebsite, isAuthenticated, onSignIn }: WebsitesViewProps) {
  const [websites, setWebsites] = useState<ConnectedWebsite[]>(getInitialWebsites);
  const [showModal, setShowModal] = useState(false);
  const [connectTab, setConnectTab] = useState<'url' | 'github'>('url');

  // Form fields
  const [name, setName] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('main');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState<'Ecommerce' | 'SaaS' | 'Docs'>('Ecommerce');

  // GitHub mode fields
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
        setWebsites((current) => {
          const merged = [...current];
          projectSites.forEach(ps => {
            if (!merged.some(m => m.id === ps.id || m.projectId === ps.projectId)) {
              merged.push(ps);
            }
          });
          return merged;
        });
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

  const saveCustomWebsite = (newSite: ConnectedWebsite) => {
    setWebsites((current) => {
      const updated = [newSite, ...current.filter((item) => item.id !== newSite.id)];
      try {
        localStorage.setItem(LOCAL_WEBSITES_KEY, JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  const handleConnectUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let cleanUrl = previewUrl.trim();
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `http://${cleanUrl}`;
    }

    // derive repo owner/name
    let repoOwner = 'local';
    let repoName = name.trim().toLowerCase().replace(/\s+/g, '-');
    if (repoUrl.trim()) {
      const match = repoUrl.match(/github\.com[:/]([^/]+)\/([^/.]+)/i);
      if (match) {
        repoOwner = match[1];
        repoName = match[2];
      }
    }

    const code = name.trim().slice(0, 2).toUpperCase();
    const siteId = `site-${Date.now()}`;

    const newSite: ConnectedWebsite = {
      id: siteId,
      name: name.trim(),
      tagline: tagline.trim() || `Live website connected at ${cleanUrl}`,
      repoUrl: repoUrl.trim() || `https://github.com/${repoOwner}/${repoName}`,
      repoOwner,
      repoName,
      branch: branch.trim() || 'main',
      previewUrl: cleanUrl,
      productionUrl: cleanUrl,
      status: 'connected',
      mode: 'managed',
      runtimeLoaderInstalled: true,
      lastModified: 'Just now',
      componentCount: 16,
      category,
      code,
      framework: 'React / Vite',
      activeRelease: 'v1.0.0',
      activePatchesCount: 0,
    };

    saveCustomWebsite(newSite);
    setShowModal(false);
    resetForm();
    onSelectWebsite(newSite);
  };

  const handleConnectGitHub = async (e: React.FormEvent) => {
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
      saveCustomWebsite(site);
      setShowModal(false);
      resetForm();
      onSelectWebsite(site);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : 'Could not connect this repository.');
    } finally {
      setIsConnecting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setPreviewUrl('');
    setRepoUrl('');
    setBranch('main');
    setTagline('');
    setSelectedRepositoryId('');
    setRequestError(null);
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
            Select any website to load its preview into the Visual Editor. Add your own local or remote sites anytime.
          </p>
        </div>

        <button className={styles.connectBtn} onClick={() => { setShowModal(true); setRequestError(null); }}>
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
              <h3 className={styles.modalTitle}>Connect a Website to PATCHWORK</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)} aria-label="Close">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Mode selection tabs */}
            <div style={{ padding: '16px 24px 0 24px' }}>
              <div className={styles.modeTabs}>
                <button
                  type="button"
                  className={`${styles.modeTab} ${connectTab === 'url' ? styles.modeTabActive : ''}`}
                  onClick={() => setConnectTab('url')}
                >
                  Live Website / URL
                </button>
                <button
                  type="button"
                  className={`${styles.modeTab} ${connectTab === 'github' ? styles.modeTabActive : ''}`}
                  onClick={() => setConnectTab('github')}
                >
                  GitHub Repository
                </button>
              </div>
            </div>

            {connectTab === 'url' ? (
              <form onSubmit={handleConnectUrl} className={styles.form}>
                <div className={styles.field}>
                  <label className={styles.label}>Website Name</label>
                  <input
                    type="text"
                    placeholder="e.g. My Production Store"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>Website URL</label>
                  <input
                    type="url"
                    placeholder="https://my-app.vercel.app"
                    value={previewUrl}
                    onChange={e => setPreviewUrl(e.target.value)}
                    className={styles.input}
                    required
                  />
                  <span className={styles.helperText}>Live deployed URL where the website is hosted</span>
                </div>

                <div className={styles.gridTwoCol}>
                  <div className={styles.field}>
                    <label className={styles.label}>Git Branch</label>
                    <input
                      type="text"
                      placeholder="main"
                      value={branch}
                      onChange={e => setBranch(e.target.value)}
                      className={styles.input}
                    />
                  </div>

                  <div className={styles.field}>
                    <label className={styles.label}>Category</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as 'Ecommerce' | 'SaaS' | 'Docs')}
                      className={styles.input}
                    >
                      <option value="Ecommerce">Ecommerce</option>
                      <option value="SaaS">SaaS Platform</option>
                      <option value="Docs">Documentation</option>
                    </select>
                  </div>
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>GitHub Repository URL (Optional)</label>
                  <input
                    type="text"
                    placeholder="https://github.com/my-org/my-repo"
                    value={repoUrl}
                    onChange={e => setRepoUrl(e.target.value)}
                    className={styles.input}
                  />
                </div>

                <div className={styles.modalActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className={styles.submitBtn}>
                    Connect & Open in Editor
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleConnectGitHub} className={styles.form}>
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
            )}
          </div>
        </div>
      )}
    </div>
  );
}
