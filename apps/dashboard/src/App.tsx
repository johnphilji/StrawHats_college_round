import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardPage from './pages/DashboardPage';
import WebsitesPage from './pages/WebsitesPage';
import EditorPage from './pages/EditorPage';
import PatchesPage from './pages/PatchesPage';
import PatchPreviewPage from './pages/PatchPreviewPage';
import ConflictsPage from './pages/ConflictsPage';
import ReleasesPage from './pages/ReleasesPage';
import TestsPage from './pages/TestsPage';
import AuditPage from './pages/AuditPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/websites" element={<WebsitesPage />} />
          <Route path="/editor/:websiteId" element={<EditorPage />} />
          <Route path="/patches" element={<PatchesPage />} />
          <Route path="/preview/:patchId" element={<PatchPreviewPage />} />
          <Route path="/conflicts" element={<ConflictsPage />} />
          <Route path="/releases" element={<ReleasesPage />} />
          <Route path="/tests" element={<TestsPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
