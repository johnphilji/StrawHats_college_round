import { useState, useCallback } from 'react';
import './App.css';
import Sidebar from './Sidebar';
import PreviewPane from './PreviewPane';
import Inspector from './Inspector';
import HistoryView from './HistoryView';
import DeployView from './DeployView';
import type { SelectedComponent } from './types';

export default function App() {
  const [activeView, setActiveView]   = useState<string>('editor');
  const [selected, setSelected]       = useState<SelectedComponent | null>(null);
  const [editMode, setEditMode]       = useState(false);

  const handleSelect = useCallback((component: SelectedComponent) => {
    setSelected(component);
  }, []);

  const handleClear = useCallback(() => {
    setSelected(null);
  }, []);

  return (
    <div className="shell">
      {/* Topbar */}
      <div className="topbar">
        <div className="topbar-left">
          <div className="breadcrumb">
            <span className="breadcrumb-seg">StrawHats</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-seg">Acme Store</span>
            <span className="breadcrumb-sep">/</span>
            <span className="breadcrumb-seg breadcrumb-active">Visual Editor</span>
          </div>
        </div>

        <div className="topbar-center">
          {activeView === 'editor' && (
            <div className="mode-toggle">
              <button
                className={`mode-btn ${!editMode ? 'mode-btn-active' : ''}`}
                onClick={() => setEditMode(false)}
              >
                View
              </button>
              <button
                className={`mode-btn ${editMode ? 'mode-btn-active' : ''}`}
                onClick={() => setEditMode(true)}
              >
                ✦ Edit
              </button>
            </div>
          )}
        </div>

        <div className="topbar-right">
          <div className="topbar-badge">
            <span className="badge-dot" />
            <span>demo-v1</span>
          </div>
          <div className="avatar">JS</div>
        </div>
      </div>

      <div className="workspace">
        <Sidebar activeView={activeView} onViewChange={setActiveView} />

        {/* Main content area */}
        <div className="main-area">
          {activeView === 'editor' && (
            <div className="editor-layout">
              <PreviewPane
                selectedId={selected?.componentId ?? null}
                onSelect={handleSelect}
                editMode={editMode}
              />
              <Inspector selected={selected} onClear={handleClear} />
            </div>
          )}

          {activeView === 'history' && (
            <HistoryView />
          )}

          {activeView === 'deploy' && (
            <DeployView />
          )}

          {activeView === 'settings' && (
            <div className="settings-placeholder">
              <div className="placeholder-icon">⚙</div>
              <div className="placeholder-title">Settings</div>
              <div className="placeholder-text">Project settings, API keys, and team configuration will live here.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
