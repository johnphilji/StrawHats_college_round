import { useState } from 'react';
import styles from './WebsitesView.module.css';
import type { ConnectedWebsite } from './types';
import { MOCK_WEBSITES } from './api';

interface WebsitesViewProps {
  onSelectWebsite: (website: ConnectedWebsite) => void;
}

export default function WebsitesView({ onSelectWebsite }: WebsitesViewProps) {
  const [websites, setWebsites] = useState<ConnectedWebsite[]>(MOCK_WEBSITES);
  const [showModal, setShowModal] = useState(false);
  const [newRepoUrl, setNewRepoUrl] = useState('');
  const [newRepoName, setNewRepoName] = useState('');
  const [newCategory, setNewCategory] = useState<'Ecommerce' | 'SaaS' | 'Docs' | 'Portfolio'>('Ecommerce');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRepoName.trim()) return;

    const newSite: ConnectedWebsite = {
      id: `site_${Date.now()}`,
      name: newRepoName,
      tagline: `Connected repository ${newRepoUrl || 'custom'}`,
      repoUrl: newRepoUrl || 'https://github.com/johnphilji/my-website.git',
      repoOwner: 'johnphilji',
      repoName: newRepoName.toLowerCase().replace(/\s+/g, '-'),
      branch: 'main',
      previewUrl: 'http://localhost:3000',
      productionUrl: `https://${newRepoName.toLowerCase().replace(/\s+/g, '-')}.patchwork.dev`,
      status: 'connected',
      lastModified: 'Just now',
      componentCount: 12,
      category: newCategory,
      icon: newCategory === 'Ecommerce' ? '🛍️' : newCategory === 'SaaS' ? '⚡' : '📄',
      framework: 'HTML / CSS / JS',
    };

    setWebsites(prev => [newSite, ...prev]);
    setShowModal(false);
    setNewRepoName('');
    setNewRepoUrl('');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <div className={styles.title}>
            Connected Websites
            <span className={styles.titleBadge}>Multi-Repository</span>
          </div>
          <p className={styles.subtitle}>
            PATCHWORK acts as an intelligent visual editing layer on top of your connected Git repositories.
            Select a website to load its preview and start editing components visually.
          </p>
        </div>

        <button className={styles.connectBtn} onClick={() => setShowModal(true)}>
          <span>+</span> Connect New Repository
        </button>
      </div>

      {/* GitHub Auth & Repo Bridge Status Banner */}
      <div className={styles.authBanner}>
        <div className={styles.authInfo}>
          <span className={styles.authDot} />
          <span>GitHub App Integration: <strong>Authorized</strong></span>
          <span>•</span>
          <span className={styles.authScope}>Scope: repo, workflow, write:packages</span>
        </div>
        <div className={styles.authScope}>
          3 Repositories Synchronized
        </div>
      </div>

      {/* Grid of connected websites */}
      <div className={styles.grid}>
        {websites.map(site => (
          <div key={site.id} className={styles.card}>
            <div className={styles.cardHeader}>
              <div className={styles.siteIcon}>{site.icon}</div>
              <div className={styles.siteTitleGroup}>
                <div className={styles.siteName}>{site.name}</div>
                <div className={styles.siteCategory}>{site.category} • {site.framework}</div>
              </div>
            </div>

            <p className={styles.siteTagline}>{site.tagline}</p>

            <div className={styles.repoBox}>
              <div className={styles.repoRow}>
                <span className={styles.repoLabel}>Repository</span>
                <span className={styles.repoValue}>
                  {site.repoOwner}/{site.repoName}
                  {site.subpath && <span style={{ color: '#94a3b8' }}>{site.subpath}</span>}
                </span>
              </div>
              <div className={styles.repoRow}>
                <span className={styles.repoLabel}>Target Branch</span>
                <span className={styles.branchTag}>⎇ {site.branch}</span>
              </div>
              <div className={styles.repoRow}>
                <span className={styles.repoLabel}>Local Preview</span>
                <span className={styles.repoValue}>{site.previewUrl}</span>
              </div>
            </div>

            <div className={styles.statsRow}>
              <span className={styles.statusLive}>
                <span className={styles.statusLiveDot} />
                Live Preview Ready
              </span>
              <span>{site.componentCount} Components</span>
            </div>

            <button
              className={styles.openBtn}
              onClick={() => onSelectWebsite(site)}
            >
              <span>✦</span> Open in Visual Editor ➔
            </button>
          </div>
        ))}
      </div>

      {/* Modal to connect a new repo */}
      {showModal && (
        <div className={styles.modalBackdrop} onClick={() => setShowModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Connect GitHub Repository</h3>
              <button className={styles.modalClose} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleConnect}>
              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Website Name</label>
                <input
                  className={styles.modalInput}
                  placeholder="e.g. Acme Pet Store"
                  value={newRepoName}
                  onChange={e => setNewRepoName(e.target.value)}
                  required
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>GitHub Repository URL</label>
                <input
                  className={styles.modalInput}
                  placeholder="https://github.com/johnphilji/demo-sites.git"
                  value={newRepoUrl}
                  onChange={e => setNewRepoUrl(e.target.value)}
                />
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel}>Type / Category</label>
                <select
                  className={styles.modalInput}
                  value={newCategory}
                  onChange={e => setNewCategory(e.target.value as any)}
                >
                  <option value="Ecommerce">Ecommerce Store</option>
                  <option value="SaaS">SaaS Landing Page</option>
                  <option value="Docs">Documentation</option>
                  <option value="Portfolio">Portfolio / Company</option>
                </select>
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.cancelBtn}
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className={styles.submitBtn}>
                  Connect & Load
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
