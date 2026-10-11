import { useState, useCallback, useEffect } from 'react';
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
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

export default function App() {
  const [activeView, setActiveView]         = useState<string>('editor');
  const [currentWebsite, setCurrentWebsite] = useState<ConnectedWebsite>(MOCK_WEBSITES[0]);
  const [selected, setSelected]             = useState<SelectedComponent | null>(null);
  const [activeChange, setActiveChange]     = useState<CodeChange | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setSession(data.session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleSignIn = useCallback(() => {
    if (!supabase) return;
    void supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: window.location.origin, scopes: 'read:user user:email' },
    });
  }, []);

  const handleSignOut = useCallback(() => {
    void supabase?.auth.signOut();
  }, []);

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
                : 'Audit Log'}
            </span>
          </div>

          {activeView !== 'websites' && (
            <button className="site-dropdown" onClick={() => setActiveView('websites')}>
              Switch Site
            </button>
          )}
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
          {supabase && (
            <button className="site-dropdown" onClick={session ? handleSignOut : handleSignIn}>
              {session ? 'Sign out' : 'Sign in with GitHub'}
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
            <WebsitesView
              onSelectWebsite={handleSelectWebsite}
              isAuthenticated={Boolean(session)}
              onSignIn={handleSignIn}
            />
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
                onOpenConflicts={() => setActiveView('conflicts')}
                projectId={currentWebsite.projectId}
                repositoryIdentifier={currentWebsite.repositoryIdentifier}
                productionBranch={currentWebsite.branch}
              />
            </div>
          )}

          {activeView === 'conflicts' && <ConflictsView />}
          {activeView === 'testing' && <TestingView />}
          {activeView === 'deploy' && <DeployView />}
          {activeView === 'audit' && <AuditView />}
        </main>
      </div>
    </div>
  );
}
