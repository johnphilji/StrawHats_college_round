import { useState, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';
import './App.css';
import Sidebar from './Sidebar';
import PreviewPane from './PreviewPane';
import Inspector from './Inspector';
import ConflictsView from './ConflictsView';
import TestingView from './TestingView';
import DeployView from './DeployView';
import WebsitesView from './WebsitesView';
import AuditView from './AuditView';
import { MOCK_WEBSITES } from './api';
import type { SelectedComponent, ConnectedWebsite, CodeChange } from './types';

type Repository = {
  id: number;
  name: string;
  fullName: string;
  owner: string;
  private: boolean;
  description: string | null;
  url: string;
  defaultBranch: string;
};

type Source = {
  repository: Repository;
  path: string;
  ref: string;
  source: string;
  size: number;
};

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '');

export default function App() {
  // Studio & Visual Editor state (from HEAD)
  const [activeView, setActiveView]         = useState<string>('editor');
  const [currentWebsite, setCurrentWebsite] = useState<ConnectedWebsite>(MOCK_WEBSITES[0]);
  const [selected, setSelected]             = useState<SelectedComponent | null>(null);
  const [activeChange, setActiveChange]     = useState<CodeChange | null>(null);

  // GitHub & Supabase integration state (from backend)
  const [session, setSession]                         = useState<Session | null>(null);
  const [authLoading, setAuthLoading]                 = useState<boolean>(() => Boolean(supabase));
  const [repositories, setRepositories]               = useState<Repository[]>([]);
  const [hasMoreRepositories, setHasMoreRepositories] = useState(false);
  const [selectedRepo, setSelectedRepo]               = useState<Repository | null>(null);
  const [filePath, setFilePath]                       = useState('');
  const [ref, setRef]                                 = useState('');
  const [source, setSource]                           = useState<Source | null>(null);
  const [loading, setLoading]                         = useState(false);
  const [error, setError]                             = useState('');
  const [notice, setNotice]                           = useState('');

  // HEAD handlers
  const handleSelectWebsite = useCallback((site: ConnectedWebsite) => {
    setCurrentWebsite(site);
    setActiveView('editor');
    setSelected(null);
    setActiveChange(null);
  }, []);

  const handleSelectComponent = useCallback((component: SelectedComponent) => {
    setSelected(component);
    if (activeChange && activeChange.componentId !== component.componentId) {
      setActiveChange(null);
    }
  }, [activeChange]);

  const handleClearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  const handleReleaseSuccess = useCallback((deployedChange: CodeChange) => {
    void deployedChange;
  }, []);

  // Backend handlers
  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    if (!session?.access_token) throw new Error('Your session has expired. Sign in again.');
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
    });
    const body = (await response.json()) as { success: boolean; data?: T; error?: { message?: string } };
    if (!response.ok || !body.success) throw new Error(body.error?.message || 'The request could not be completed.');
    return body.data as T;
  }, [session]);

  useEffect(() => {
    if (!supabase) return;
    void supabase.auth
      .getSession()
      .then(({ data }: { data: { session: Session | null } }) => setSession(data.session))
      .finally(() => setAuthLoading(false));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: unknown, nextSession: Session | null) => setSession(nextSession));
    return () => subscription.unsubscribe();
  }, []);

  const loadRepositories = useCallback(async (page = 1, append = false) => {
    setLoading(true);
    setError('');
    try {
      const result = await request<{ repositories: Repository[]; hasMore: boolean }>(
        `/github/repositories?page=${page}&per_page=50`,
      );
      setRepositories(current => (append ? [...current, ...result.repositories] : result.repositories));
      setHasMoreRepositories(result.hasMore);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load repositories.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    if (session) {
      const params = new URLSearchParams(window.location.search);
      if (params.has('github_connected')) {
        setNotice('GitHub repository access is connected.');
        setActiveView('github');
        window.history.replaceState({}, '', '/');
      }
      void loadRepositories();
    } else {
      setRepositories([]);
      setSelectedRepo(null);
      setSource(null);
      setHasMoreRepositories(false);
    }
  }, [session, loadRepositories]);

  async function signIn() {
    if (!supabase) {
      setError('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign in.');
      return;
    }
    setError('');
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: 'read:user user:email',
      },
    });
    if (authError) setError(authError.message);
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
  }

  async function connectRepository() {
    setError('');
    try {
      const result = await request<{ url: string }>('/github/installation/setup', { method: 'POST' });
      window.location.assign(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start GitHub App setup.');
    }
  }

  async function selectRepository(repository: Repository) {
    setSelectedRepo(repository);
    setSource(null);
    setError('');
    try {
      setSelectedRepo(await request<Repository>(`/github/repositories/${repository.id}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load repository metadata.');
    }
  }

  async function retrieveSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRepo) return;
    setLoading(true);
    setError('');
    setSource(null);
    try {
      const query = new URLSearchParams({ path: filePath, ...(ref ? { ref } : {}) });
      setSource(await request<Source>(`/github/repositories/${selectedRepo.id}/source?${query}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to retrieve source.');
    } finally {
      setLoading(false);
    }
  }

  const handleUseRepoInEditor = useCallback((repo: Repository) => {
    const newSite: ConnectedWebsite = {
      id: `gh_${repo.id}`,
      name: repo.name,
      tagline: repo.description || `GitHub repository ${repo.fullName}`,
      repoUrl: repo.url,
      repoOwner: repo.owner,
      repoName: repo.name,
      branch: repo.defaultBranch || 'main',
      previewUrl: 'http://localhost:3000',
      productionUrl: `https://${repo.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}.patchwork.dev`,
      status: 'connected',
      mode: 'managed',
      runtimeLoaderInstalled: true,
      lastModified: 'Just now',
      componentCount: 0,
      category: 'SaaS',
      code: repo.name.slice(0, 2).toUpperCase(),
      framework: 'React / Web',
      activeRelease: 'v1.0.0',
      activePatchesCount: 0,
    };
    setCurrentWebsite(newSite);
    setActiveView('editor');
    setSelected(null);
    setActiveChange(null);
  }, []);

  return (
    <div className="shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            <span className="breadcrumb-brand" onClick={() => setActiveView('websites')}>PATCHWORK</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-seg" onClick={() => setActiveView('websites')}>
              {currentWebsite.name}
            </span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-active">
              {activeView === 'editor'
                ? 'Visual Editor'
                : activeView === 'conflicts'
                ? 'Conflict Resolver'
                : activeView === 'testing'
                ? 'Automated Testing'
                : activeView === 'deploy'
                ? 'Releases & Rollback'
                : activeView === 'websites'
                ? 'Connected Repositories'
                : activeView === 'github'
                ? 'GitHub Workspace'
                : 'Audit Log'}
            </span>
          </div>

          {activeView !== 'websites' && (
            <button className="site-dropdown" onClick={() => setActiveView('websites')}>
              Switch Site
            </button>
          )}

          <button
            className="site-dropdown"
            onClick={() => setActiveView(activeView === 'github' ? 'editor' : 'github')}
            style={activeView === 'github' ? { background: '#eef2ff', borderColor: '#c7d2fe', color: '#4f46e5', fontWeight: 600 } : {}}
          >
            {activeView === 'github' ? '← Back to Editor' : 'GitHub Repos & Source'}
          </button>
        </div>

        <div className="topbar-right">
          <div className="repo-pill">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
              <path d="M9 18c-4.51 2-5-2-7-2" />
            </svg>
            <span>{currentWebsite.repoOwner}/{currentWebsite.repoName}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>branch: {currentWebsite.branch}</span>
          </div>

          <div className="topbar-badge">
            <span className="badge-dot" />
            <span>Git Bridge Online</span>
          </div>

          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
                {session.user?.email || 'GitHub Connected'}
              </span>
              <button
                className="site-dropdown"
                onClick={() => void signOut()}
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              className="site-dropdown"
              onClick={() => {
                setActiveView('github');
                if (supabase) void signIn();
              }}
              style={{ padding: '3px 9px', fontSize: '11px', color: '#16a34a', borderColor: '#bbf7d0', fontWeight: 600 }}
            >
              Sign in with GitHub
            </button>
          )}
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div className="workspace">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          website={currentWebsite}
          unresolvedConflictsCount={1}
        />

        <main className="main-content">
          {activeView === 'websites' && (
            <WebsitesView onSelectWebsite={handleSelectWebsite} />
          )}

          {activeView === 'editor' && (
            <div className="editor-layout">
              {/* Center: Live Website Preview (iframe + selection bridge) */}
              <PreviewPane
                selectedId={selected?.componentId ?? null}
                onSelect={handleSelectComponent}
                website={currentWebsite}
                activeChange={activeChange}
              />

              {/* Right: Inspector */}
              <Inspector
                selected={selected}
                onClear={handleClearSelection}
                activeChange={activeChange}
                onChangeUpdate={setActiveChange}
                onReleaseSuccess={handleReleaseSuccess}
                onOpenConflicts={() => setActiveView('conflicts')}
              />
            </div>
          )}

          {activeView === 'conflicts' && <ConflictsView />}
          {activeView === 'testing' && <TestingView />}
          {activeView === 'deploy' && <DeployView />}
          {activeView === 'audit' && <AuditView />}

          {activeView === 'github' && (
            <div className="github-view">
              <div className="github-container">
                {authLoading ? (
                  <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
                    <p>Restoring your session…</p>
                  </div>
                ) : !session ? (
                  <section className="login card">
                    <div className="eyebrow">SOURCE CONTROL</div>
                    <h1>Build from your code.</h1>
                    <p>Sign in with PATCHWORK through Supabase, then connect a GitHub repository to retrieve source for your generation workflow.</p>
                    <button className="primary github" disabled={!supabase} onClick={() => void signIn()}>
                      <span aria-hidden="true">◉</span> Continue with GitHub
                    </button>
                    {!supabase && <small>Configure the Supabase frontend variables to enable sign in.</small>}
                    {error && <p className="error" role="alert">{error}</p>}
                  </section>
                ) : (
                  <>
                    <section className="welcome">
                      <div>
                        <div className="eyebrow">YOUR WORKSPACE</div>
                        <h1>Choose a repository.</h1>
                        <p>Private repositories are available when the PATCHWORK GitHub App has access.</p>
                      </div>
                      <button className="primary" onClick={() => void connectRepository()}>
                        ＋ Connect Repository
                      </button>
                    </section>

                    {notice && <p className="notice">{notice}</p>}
                    {error && <p className="error" role="alert">{error}</p>}

                    <div className="layout">
                      <section className="card repo-card">
                        <div className="section-heading">
                          <div>
                            <div className="eyebrow">GITHUB APP ACCESS</div>
                            <h2>Repositories</h2>
                          </div>
                          <button className="quiet" onClick={() => void loadRepositories()}>
                            Refresh
                          </button>
                        </div>
                        {loading && repositories.length === 0 ? (
                          <p className="muted">Loading repositories…</p>
                        ) : repositories.length ? (
                          <>
                            <ul className="repo-list">
                              {repositories.map(repo => (
                                <li key={repo.id}>
                                  <button
                                    className={`repo-row ${selectedRepo?.id === repo.id ? 'active' : ''}`}
                                    onClick={() => void selectRepository(repo)}
                                  >
                                    <span className="repo-icon">{repo.private ? '▣' : '⑂'}</span>
                                    <span className="repo-copy">
                                      <strong>{repo.fullName}</strong>
                                      <small>{repo.description || `Default branch: ${repo.defaultBranch}`}</small>
                                    </span>
                                    <span className="badge">{repo.private ? 'Private' : 'Public'}</span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                            {hasMoreRepositories && (
                              <button
                                className="outline"
                                disabled={loading}
                                onClick={() => void loadRepositories(Math.floor(repositories.length / 50) + 1, true)}
                              >
                                {loading ? 'Loading…' : 'Load more repositories'}
                              </button>
                            )}
                          </>
                        ) : (
                          <div className="empty">
                            <span className="empty-icon">⌘</span>
                            <h3>Connect a repository</h3>
                            <p>Install the PATCHWORK GitHub App and choose the repositories it can access.</p>
                            <button className="outline" onClick={() => void connectRepository()}>
                              Install GitHub App
                            </button>
                          </div>
                        )}
                      </section>

                      <section className="card source-card">
                        <div className="eyebrow">SOURCE RETRIEVAL</div>
                        <h2>{selectedRepo ? selectedRepo.fullName : 'Select a repository'}</h2>
                        {selectedRepo ? (
                          <>
                            <p className="muted">Files are fetched individually and limited to 256 KB.</p>
                            <form onSubmit={retrieveSource}>
                              <label htmlFor="source-path">File path</label>
                              <input
                                id="source-path"
                                value={filePath}
                                onChange={event => setFilePath(event.target.value)}
                                placeholder="src/components/Hero.tsx"
                                required
                                maxLength={500}
                              />
                              <label htmlFor="source-ref">Branch or commit (optional)</label>
                              <input
                                id="source-ref"
                                value={ref}
                                onChange={event => setRef(event.target.value)}
                                placeholder={selectedRepo.defaultBranch}
                                maxLength={255}
                              />
                              <div style={{ display: 'flex', gap: '10px', marginTop: '12px' }}>
                                <button className="primary" disabled={loading}>
                                  {loading ? 'Retrieving…' : 'Retrieve source'}
                                </button>
                                <button
                                  type="button"
                                  className="outline"
                                  onClick={() => handleUseRepoInEditor(selectedRepo)}
                                >
                                  Open in Visual Editor →
                                </button>
                              </div>
                            </form>
                          </>
                        ) : (
                          <div className="source-empty">
                            <span>⌁</span>
                            <p>Choose a repository to view its metadata and retrieve a source file.</p>
                          </div>
                        )}
                      </section>
                    </div>

                    {source && (
                      <section className="card preview">
                        <div className="section-heading">
                          <div>
                            <div className="eyebrow">
                              {source.ref} · {source.size.toLocaleString()} BYTES
                            </div>
                            <h2>{source.path}</h2>
                          </div>
                          <span className="badge">Ready for generation</span>
                        </div>
                        <pre><code>{source.source}</code></pre>
                      </section>
                    )}

                    <footer>
                      PATCHWORK <span>·</span> Your source stays in your authorized repository.
                    </footer>
                  </>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
