import { useCallback, useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import './App.css'

type Repository = { id: number; name: string; fullName: string; owner: string; private: boolean; description: string | null; url: string; defaultBranch: string }
type Source = { repository: Repository; path: string; ref: string; source: string; size: number }

const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api').replace(/\/$/, '')

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [repositories, setRepositories] = useState<Repository[]>([])
  const [hasMoreRepositories, setHasMoreRepositories] = useState(false)
  const [selected, setSelected] = useState<Repository | null>(null)
  const [filePath, setFilePath] = useState('')
  const [ref, setRef] = useState('')
  const [source, setSource] = useState<Source | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const request = useCallback(async <T,>(path: string, init: RequestInit = {}): Promise<T> => {
    if (!session?.access_token) throw new Error('Your session has expired. Sign in again.')
    const response = await fetch(`${apiUrl}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${session.access_token}`, ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...init.headers },
    })
    const body = await response.json() as { success: boolean; data?: T; error?: { message?: string } }
    if (!response.ok || !body.success) throw new Error(body.error?.message || 'The request could not be completed.')
    return body.data as T
  }, [session])

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }
    void supabase.auth.getSession().then(({ data }) => setSession(data.session)).finally(() => setAuthLoading(false))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession))
    return () => subscription.unsubscribe()
  }, [])

  const loadRepositories = useCallback(async (page = 1, append = false) => {
    setLoading(true); setError('')
    try {
      const result = await request<{ repositories: Repository[]; hasMore: boolean }>(`/github/repositories?page=${page}&per_page=50`)
      setRepositories(current => append ? [...current, ...result.repositories] : result.repositories)
      setHasMoreRepositories(result.hasMore)
    }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load repositories.') }
    finally { setLoading(false) }
  }, [request])

  useEffect(() => {
    if (session) {
      const params = new URLSearchParams(window.location.search)
      if (params.has('github_connected')) { setNotice('GitHub repository access is connected.'); window.history.replaceState({}, '', '/') }
      void loadRepositories()
    } else { setRepositories([]); setSelected(null); setSource(null); setHasMoreRepositories(false) }
  }, [session, loadRepositories])

  async function signIn() {
    if (!supabase) { setError('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to enable sign in.'); return }
    setError('')
    const { error: authError } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: `${window.location.origin}/auth/callback`, scopes: 'read:user user:email' } })
    if (authError) setError(authError.message)
  }

  async function connectRepository() {
    setError('')
    try {
      const result = await request<{ url: string }>('/github/installation/setup', { method: 'POST' })
      window.location.assign(result.url)
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to start GitHub App setup.') }
  }

  async function selectRepository(repository: Repository) {
    setSelected(repository); setSource(null); setError('')
    try { setSelected(await request<Repository>(`/github/repositories/${repository.id}`)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Unable to load repository metadata.') }
  }

  async function retrieveSource(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    setLoading(true); setError(''); setSource(null)
    try {
      const query = new URLSearchParams({ path: filePath, ...(ref ? { ref } : {}) })
      setSource(await request<Source>(`/github/repositories/${selected.id}/source?${query}`))
    } catch (err) { setError(err instanceof Error ? err.message : 'Unable to retrieve source.') }
    finally { setLoading(false) }
  }

  if (authLoading) return <main className="shell"><p>Restoring your session…</p></main>

  return <main className="shell">
    <header className="topbar"><a className="wordmark" href="/">PATCHWORK<span>.</span></a><span>Repository workspace</span>{session && <button className="quiet" onClick={() => void supabase?.auth.signOut()}>Sign out</button>}</header>
    {!session ? <section className="login card">
      <div className="eyebrow">SOURCE CONTROL</div><h1>Build from your code.</h1>
      <p>Sign in with PATCHWORK through Supabase, then connect a GitHub repository to retrieve source for your generation workflow.</p>
      <button className="primary github" disabled={!supabase} onClick={() => void signIn()}><span aria-hidden="true">◉</span> Continue with GitHub</button>
      {!supabase && <small>Configure the Supabase frontend variables to enable sign in.</small>}
      {error && <p className="error" role="alert">{error}</p>}
    </section> : <>
      <section className="welcome"><div><div className="eyebrow">YOUR WORKSPACE</div><h1>Choose a repository.</h1><p>Private repositories are available when the PATCHWORK GitHub App has access.</p></div><button className="primary" onClick={() => void connectRepository()}>＋ Connect Repository</button></section>
      {notice && <p className="notice">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
      <div className="layout">
        <section className="card repo-card"><div className="section-heading"><div><div className="eyebrow">GITHUB APP ACCESS</div><h2>Repositories</h2></div><button className="quiet" onClick={() => void loadRepositories()}>Refresh</button></div>
          {loading && repositories.length === 0 ? <p className="muted">Loading repositories…</p> : repositories.length ? <><ul className="repo-list">{repositories.map(repo => <li key={repo.id}><button className={`repo-row ${selected?.id === repo.id ? 'active' : ''}`} onClick={() => void selectRepository(repo)}><span className="repo-icon">{repo.private ? '▣' : '⑂'}</span><span className="repo-copy"><strong>{repo.fullName}</strong><small>{repo.description || `Default branch: ${repo.defaultBranch}`}</small></span><span className="badge">{repo.private ? 'Private' : 'Public'}</span></button></li>)}</ul>{hasMoreRepositories && <button className="outline" disabled={loading} onClick={() => void loadRepositories(Math.floor(repositories.length / 50) + 1, true)}>{loading ? 'Loading…' : 'Load more repositories'}</button>}</> : <div className="empty"><span className="empty-icon">⌘</span><h3>Connect a repository</h3><p>Install the PATCHWORK GitHub App and choose the repositories it can access.</p><button className="outline" onClick={() => void connectRepository()}>Install GitHub App</button></div>}
        </section>
        <section className="card source-card"><div className="eyebrow">SOURCE RETRIEVAL</div><h2>{selected ? selected.fullName : 'Select a repository'}</h2>
          {selected ? <><p className="muted">Files are fetched individually and limited to 256 KB.</p><form onSubmit={retrieveSource}><label htmlFor="source-path">File path</label><input id="source-path" value={filePath} onChange={event => setFilePath(event.target.value)} placeholder="src/components/Hero.tsx" required maxLength={500}/><label htmlFor="source-ref">Branch or commit (optional)</label><input id="source-ref" value={ref} onChange={event => setRef(event.target.value)} placeholder={selected.defaultBranch} maxLength={255}/><button className="primary" disabled={loading}>{loading ? 'Retrieving…' : 'Retrieve source'}</button></form></> : <div className="source-empty"><span>⌁</span><p>Choose a repository to view its metadata and retrieve a source file.</p></div>}
        </section>
      </div>
      {source && <section className="card preview"><div className="section-heading"><div><div className="eyebrow">{source.ref} · {source.size.toLocaleString()} BYTES</div><h2>{source.path}</h2></div><span className="badge">Ready for generation</span></div><pre><code>{source.source}</code></pre></section>}
    </>}
    <footer>PATCHWORK <span>·</span> Your source stays in your authorized repository.</footer>
  </main>
}

export default App
