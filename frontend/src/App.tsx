import { useState, useCallback } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import PreviewPane from './PreviewPane';
import Inspector from './Inspector';
import HistoryView from './HistoryView';
import DeployView from './DeployView';
import WebsitesView from './WebsitesView';
import { MOCK_WEBSITES } from './api';
import type { SelectedComponent, ConnectedWebsite } from './types';

export default function App() {
  const [activeView, setActiveView]         = useState<string>('websites');
  const [currentWebsite, setCurrentWebsite] = useState<ConnectedWebsite>(MOCK_WEBSITES[0]);
  const [selected, setSelected]             = useState<SelectedComponent | null>(null);
  const [editMode, setEditMode]             = useState(true);

  const handleSelectWebsite = useCallback((site: ConnectedWebsite) => {
    setCurrentWebsite(site);
    setActiveView('editor');
    setSelected(null);
  }, []);

  const handleSelectComponent = useCallback((component: SelectedComponent) => {
    setSelected(component);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelected(null);
  }, []);

  const toggleEditMode = useCallback(() => {
    setEditMode(prev => !prev);
  }, []);

  return (
    <div className="shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            <span className="breadcrumb-seg" onClick={() => setActiveView('websites')}>PATCHWORK</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-seg" onClick={() => setActiveView('websites')}>
              {currentWebsite.name}
            </span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-active">
              {activeView === 'websites' ? 'Connected Sites' : activeView === 'editor' ? 'Visual Editor' : activeView === 'history' ? 'History' : 'Deployments'}
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
            <span style={{ color: '#64748b' }}>•</span>
            <span>⎇ {currentWebsite.branch}</span>
          </div>

          <div className="topbar-badge">
            <span className="badge-dot" />
            <span>Git Bridge Online</span>
          </div>
        </div>
      </div>

      {/* Main Workspace Layout */}
      <div className="workspace">
        <Sidebar
          activeView={activeView}
          onViewChange={setActiveView}
          website={currentWebsite}
        />

        <div className="main-content">
          {activeView === 'websites' && (
            <WebsitesView onSelectWebsite={handleSelectWebsite} />
          )}

          {activeView === 'editor' && (
            <>
              <PreviewPane
                selectedId={selected?.componentId ?? null}
                onSelect={handleSelectComponent}
                editMode={editMode}
                website={currentWebsite}
                onToggleEditMode={toggleEditMode}
              />
              <Inspector
                selected={selected}
                onClear={handleClearSelection}
              />
            </>
          )}

          {activeView === 'history' && <HistoryView />}
          {activeView === 'deploy' && <DeployView />}
        </div>
      </div>
    </div>
  );
}
