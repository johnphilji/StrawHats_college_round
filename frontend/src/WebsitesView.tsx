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
  const [name, setName] = useState('');
  const [repoUrl, setRepoUrl] = useState('');

  const handleConnect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSite: ConnectedWebsite = {
      id: `site_${Date.now()}`,
      name,
      tagline: `Connected repository ${repoUrl || 'custom'}`,
      repoUrl: repoUrl || 'https://github.com/organization/new-site.git',
      repoOwner: 'johnphilji',
      repoName: name.toLowerCase().replace(/\s+/g, '-'),
      branch: 'main',
      previewUrl: 'http://localhost:3000',
      productionUrl: `https://${name.toLowerCase().replace(/\s+/g, '-')}.patchwork.dev`,
      status: 'connected',
      mode: 'managed',
      runtimeLoaderInstalled: true,
      lastModified: 'Just now',
      componentCount: 8,
      category: 'Ecommerce',
      icon: '🛍️',
      framework: 'HTML / CSS / JS',
      activeRelease: 'v1.0.0',
      activePatchesCount: 0,
    };

    setWebsites([newSite, ...websites]);
    setShowModal(false);
    setName('');
    setRepoUrl('');
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Connected Websites</h1>
          <p className={styles.subtitle}>
            Select a website to load its preview and start visual editing. PATCHWORK connects directly to your Git repository.
          </p>
        </div>

        <button className={styles.connectBtn} onClick={() => setShowModal(true)}>
          + Connect Website
        </button>
      </div>

      {/* Website Cards Grid */}
      <div className={styles.grid}>
        {websites.map(site => (
          <div key={site.id} className={styles.card} onClick={() => onSelectWebsite(site)}>
            <div className={styles.cardTop}>
              <div className={styles.iconBox}>{site.icon}</div>
              <div className={styles.infoBox}>
                <h3 className={styles.siteName}>{site.name}</h3>
                <div className={styles.repoPill}>
                  <span>📦 {site.repoOwner}/{site.repoName}</span>
                  <span style={{ color: '#94a3b8' }}>•</span>
                  <span>⎇ {site.branch}</span>
                </div>
              </div>
            </div>

            <p className={styles.tagline}>{site.tagline}</p>

            <div className={styles.cardFooter}>
              <span className={styles.previewUrl}>{site.previewUrl}</span>
              <button className={styles.openBtn}>
                Open in Editor ➔
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
              <h3 className={styles.modalTitle}>Connect a Website Repository</h3>
              <button className={styles.closeBtn} onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleConnect} className={styles.form}>
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

              <div className={styles.field}>
                <label className={styles.label}>Git Repository URL</label>
                <input
                  type="url"
                  placeholder="https://github.com/johnphilji/demo-sites.git"
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
                  Connect Website
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
