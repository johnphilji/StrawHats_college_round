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
import LandingPage from './LandingPage';
import AuthModal from './AuthModal';
import DashboardView from './DashboardView';
import { MOCK_WEBSITES } from './api';
import type { SelectedComponent, ConnectedWebsite, CodeChange } from './types';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './lib/supabase';

export default function App() {
  // Start on public homepage on refresh/initial visit; user can launch Studio or sign in
  const [inStudio, setInStudio]             = useState<boolean>(false);
  const [activeView, setActiveView]         = useState<string>('dashboard');
  const [currentWebsite, setCurrentWebsite] = useState<ConnectedWebsite | null>(null);
  const [websites]                          = useState<ConnectedWebsite[]>(MOCK_WEBSITES);
  const [selected, setSelected]             = useState<SelectedComponent | null>(null);
  const [activeChange, setActiveChange]     = useState<CodeChange | null>(null);
  const [session, setSession]               = useState<Session | null>(null);
  const [user, setUser]                     = useState<User | null>(null);
  const [authModalOpen, setAuthModalOpen]   = useState<boolean>(false);
  const [authModalMode, setAuthModalMode]   = useState<'signin' | 'signup' | 'forgot'>('signin');

  useEffect(() => {
    if (!supabase) return;
    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data.session);
        setUser(data.session?.user ?? null);
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      if (nextSession && (event === 'SIGNED_IN' || event === 'USER_UPDATED')) {
        // Direct OAuth / GitHub sign-in to the Dashboard
        setInStudio(true);
        setActiveView('dashboard');
      }
    });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const openSignIn = useCallback(() => {
    setAuthModalMode('signin');
    setAuthModalOpen(true);
  }, []);

  const openSignUp = useCallback(() => {
    setAuthModalMode('signup');
    setAuthModalOpen(true);
  }, []);

  const handleSignOut = useCallback(() => {
    void supabase?.auth.signOut();
    setSession(null);
    setUser(null);
    setInStudio(false);
  }, []);

  const handleLaunchStudio = useCallback(() => {
    if (!session) {
      // If not logged in, clicking Open Studio buttons pops up the login modal
      openSignIn();
    } else {
      // If already logged in, go straight to dashboard view
      setActiveView('dashboard');
      setInStudio(true);
    }
  }, [session, openSignIn]);

  const handleAuthSuccess = useCallback(() => {
    setAuthModalOpen(false);
    // After login, navigate first to the dashboard page
    setActiveView('dashboard');
    setInStudio(true);
  }, []);

  const handleSelectWebsite = useCallback((site: ConnectedWebsite) => {
    setCurrentWebsite(site);
    // Clicking "Open in Editor" from the connected repos page opens the visual editor
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

  // Public Landing Page view (starts on homepage on initial load and refresh)
  if (!inStudio) {
    return (
      <>
        <LandingPage
          onLaunchStudio={handleLaunchStudio}
          onSignIn={openSignIn}
          onSignUp={openSignUp}
          isAuthenticated={Boolean(session)}
        />
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          initialMode={authModalMode}
          onAuthSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Authenticated Developer Studio
  return (
    <div className="shell">
      {/* Topbar */}
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="site-dropdown"
            onClick={() => setInStudio(false)}
            title="Return to public homepage"
          >
            ← Public Home
          </button>

          <div className="breadcrumb">
            <span className="breadcrumb-brand" onClick={() => setActiveView('dashboard')}>PATCHWORK</span>
            {activeView === 'dashboard' ? (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-active">Studio Dashboard</span>
              </>
            ) : activeView === 'websites' ? (
              <>
                <span className="breadcrumb-sep">/</span>
                <span className="breadcrumb-active">Connected Repositories</span>
              </>
            ) : (
              <>
                {currentWebsite && (
                  <>
                    <span className="breadcrumb-sep">/</span>
                    <span className="breadcrumb-seg" onClick={() => setActiveView('websites')} title="Click to view all websites">
                      {currentWebsite.name}
                    </span>
                  </>
                )}
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
                    : 'Audit Log'}
                </span>
              </>
            )}
          </div>

          {activeView !== 'websites' && activeView !== 'dashboard' && currentWebsite && (
            <button className="site-dropdown" onClick={() => setActiveView('websites')}>
              Switch Site
            </button>
          )}
        </div>

        <div className="topbar-right">
          {currentWebsite && (
            <div className="repo-pill">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                <path d="M9 18c-4.51 2-5-2-7-2" />
              </svg>
              <span>{currentWebsite.repoOwner}/{currentWebsite.repoName}</span>
              <span style={{ color: '#d4d4d8' }}>•</span>
              <span>{currentWebsite.branch}</span>
            </div>
          )}

          <div className="topbar-badge">
            <span className="badge-dot" />
            <span>Git Bridge Online</span>
          </div>

          {session ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="userMenuBtn"
                onClick={handleSignOut}
                title={`Signed in as ${user?.email ?? 'developer'}. Click to sign out.`}
              >
                <span className="userAvatarMini">
                  {user?.email ? user.email.slice(0, 2).toUpperCase() : 'DEV'}
                </span>
                <span>Sign out</span>
              </button>
            </div>
          ) : (
            <button className="site-dropdown" onClick={openSignIn}>
              Sign In
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
          {activeView === 'dashboard' && (
            <DashboardView
              onNavigate={setActiveView}
              onSelectWebsite={handleSelectWebsite}
              websites={websites}
              unresolvedConflictsCount={1}
            />
          )}

          {activeView === 'websites' && (
            <WebsitesView
              onSelectWebsite={handleSelectWebsite}
              isAuthenticated={Boolean(session)}
              onSignIn={openSignIn}
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
                projectId={currentWebsite?.projectId}
                repositoryIdentifier={currentWebsite?.repositoryIdentifier}
                productionBranch={currentWebsite?.branch}
                onRequireAuth={openSignIn}
              />
            </div>
          )}

          {activeView === 'conflicts' && <ConflictsView />}
          {activeView === 'testing' && <TestingView />}
          {activeView === 'deploy' && <DeployView />}
          {activeView === 'audit' && <AuditView />}
        </main>
      </div>

      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
      />
    </div>
  );
}
