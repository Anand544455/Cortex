import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { ToastProvider } from './context/ToastContext';
import { Spinner } from './components/ui/DataDisplay';

import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import Dashboard from './pages/Dashboard';
import SitesList from './pages/sites/SitesList';
import CrawlPage from './pages/crawl/CrawlPage';
import KeywordsPage from './pages/keywords/KeywordsPage';
import BacklinksPage from './pages/backlinks/BacklinksPage';
import OutreachPage from './pages/outreach/OutreachPage';
import ContentStudioPage from './pages/content/ContentStudioPage';
import AeoPage from './pages/aeo/AeoPage';
import SmoPage from './pages/smo/SmoPage';
import LocalSeoPage from './pages/local/LocalSeoPage';
import CompetitorsPage from './pages/competitors/CompetitorsPage';
import ReportsPage from './pages/reports/ReportsPage';
import SettingsPage from './pages/settings/SettingsPage';
import AdminPage from './pages/admin/AdminPage';
import AgentPage from './pages/agent/AgentPage';
import IntegrationsPage from './pages/integrations/IntegrationsPage';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Spinner size={28} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  return <WorkspaceProvider>{children}</WorkspaceProvider>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/sites" element={<ProtectedRoute><SitesList /></ProtectedRoute>} />
            <Route path="/crawl" element={<ProtectedRoute><CrawlPage /></ProtectedRoute>} />
            <Route path="/keywords" element={<ProtectedRoute><KeywordsPage /></ProtectedRoute>} />
            <Route path="/backlinks" element={<ProtectedRoute><BacklinksPage /></ProtectedRoute>} />
            <Route path="/outreach" element={<ProtectedRoute><OutreachPage /></ProtectedRoute>} />
            <Route path="/content" element={<ProtectedRoute><ContentStudioPage /></ProtectedRoute>} />
            <Route path="/aeo" element={<ProtectedRoute><AeoPage /></ProtectedRoute>} />
            <Route path="/smo" element={<ProtectedRoute><SmoPage /></ProtectedRoute>} />
            <Route path="/local" element={<ProtectedRoute><LocalSeoPage /></ProtectedRoute>} />
            <Route path="/competitors" element={<ProtectedRoute><CompetitorsPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
            <Route path="/agent" element={<ProtectedRoute><AgentPage /></ProtectedRoute>} />
            <Route path="/integrations" element={<ProtectedRoute><IntegrationsPage /></ProtectedRoute>} /> */}




            <Route path="/" element={<Dashboard />} />
            <Route path="/sites" element={<SitesList />} />
            <Route path="/crawl" element={<CrawlPage />} />
            <Route path="/keywords" element={<KeywordsPage />} />
            <Route path="/backlinks" element={<BacklinksPage />} />
            <Route path="/outreach" element={<OutreachPage />} />
            <Route path="/content" element={<ContentStudioPage />} />
            <Route path="/aeo" element={<AeoPage />} />
            <Route path="/smo" element={<SmoPage />} />
            <Route path="/local" element={<LocalSeoPage />} />
            <Route path="/competitors" element={<CompetitorsPage />} />
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />


            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
