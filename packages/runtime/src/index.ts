import { initEditorBridge } from './editorBridge.js';
import { applyOperations } from './dom.js';

(async () => {
  // 1. Identify site ID from script tag
  const scriptTag = document.currentScript || document.querySelector('script[data-site]');
  if (!scriptTag) return;
  const siteId = scriptTag.getAttribute('data-site');
  if (!siteId) return;

  const urlParams = new URLSearchParams(window.location.search);
  const isEditMode = urlParams.get('pw_edit') === '1' && window.parent !== window;
  const previewReleaseId = urlParams.get('pw_release');

  // If in edit mode, initialize the bridge and stop auto-fetching releases
  if (isEditMode) {
    initEditorBridge(siteId);
    return;
  }

  // 2. Fetch Release
  let endpoint = `http://localhost:4001/api/sites/${siteId}/release/active.json`;
  if (previewReleaseId) {
    endpoint = `http://localhost:4001/api/sites/${siteId}/release/${previewReleaseId}.json`;
  }

  try {
    const res = await fetch(endpoint);
    if (!res.ok) return;
    const data = await res.json();
    if (data.operations && data.operations.length > 0) {
      // 3. Apply operations with healing
      applyOperations(siteId, data.operations);
    }
  } catch (e) {
    // Fail silently in production
  }
})();
