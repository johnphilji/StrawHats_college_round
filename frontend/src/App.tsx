import { useState, useCallback } from 'react';
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

export default function App() {
  const [activeView, setActiveView]         = useState<string>('editor');
  const [currentWebsite, setCurrentWebsite] = useState<ConnectedWebsite>(MOCK_WEBSITES[0]);
  const [selected, setSelected]             = useState<SelectedComponent | null>(null);
  const [activeChange, setActiveChange]     = useState<CodeChange | null>(null);
  const [isDomMutated, setIsDomMutated]     = useState(false);

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

  const toggleDomMutation = useCallback(() => {
    setIsDomMutated(prev => !prev);
  }, []);

  const handleReleaseSuccess = useCallback((deployedChange: CodeChange) => {
    void deployedChange;
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
                ? 'Connected Websites'
                : 'Audit Trail'}
            </span>
          </div>

          {activeView !== 'websites' && (
            <button className="site-dropdown" onClick={() => setActiveView('websites')}>
              <span>⇄</span> Switch Website
            </button>
          )}
        </div>

        <div className="topbar-right">
          <div className="repo-pill">
            <span>📦</span>
            <span>{currentWebsite.repoOwner}/{currentWebsite.repoName}</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span>⎇ {currentWebsite.branch}</span>
          </div>

          <div className="topbar-badge">
            <span className="badge-dot" />
            <span>Git Bridge Online</span>
          </div>
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
              {/* Center: Interactive Website Preview */}
              <PreviewPane
                selectedId={selected?.componentId ?? null}
                onSelect={handleSelectComponent}
                website={currentWebsite}
                activeChange={activeChange}
                isDomMutated={isDomMutated}
                onToggleDomMutation={toggleDomMutation}
              />

              {/* Right: Focused Inspector (Select -> Prompt -> Diff -> Approve -> Release) */}
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
        </main>
      </div>
    </div>
  );
}
