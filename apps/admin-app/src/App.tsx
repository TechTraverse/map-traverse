import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { ConfigListPage } from './pages/ConfigListPage';
import { ConfigWizardPage } from './pages/ConfigWizardPage';
import { ConfigPreviewPage } from './pages/ConfigPreviewPage';
import { VersionHistoryPage } from './pages/VersionHistoryPage';
import { SourcesPage } from './pages/SourcesPage';
import { CustomizePage } from './pages/CustomizePage';
import { LoginPage } from './pages/LoginPage';
import { RequireAuth } from './components/RequireAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useSettings } from './hooks/useSettings';

function Header() {
  const location = useLocation();
  const { authenticated, unconfigured, username, logout } = useAuth();
  const { settings } = useSettings();
  const showLogout = authenticated && !unconfigured;

  return (
    <header className="mapui:text-white mapui:px-6 mapui:py-4 mapui:shadow-lg" style={{ backgroundColor: settings.header_color }}>
      <div className="mapui:flex mapui:items-center mapui:justify-between">
        <Link to="/configs" className="mapui:flex mapui:items-center mapui:gap-3 mapui:text-lg mapui:font-semibold mapui:hover:text-slate-300">
          {settings.logo_data_url && (
            <img src={settings.logo_data_url} alt="" className="mapui:h-8 mapui:w-auto" />
          )}
          {settings.header_title}
        </Link>
        <div className="mapui:flex mapui:items-center mapui:gap-6">
          <nav className="mapui:flex mapui:gap-4 mapui:text-sm">
            <Link
              to="/configs"
              className={`mapui:hover:text-slate-300 ${location.pathname.startsWith('/configs') ? 'mapui:text-white mapui:font-medium' : 'mapui:text-slate-400'}`}
            >
              Configurations
            </Link>
            <Link
              to="/sources"
              className={`mapui:hover:text-slate-300 ${location.pathname === '/sources' ? 'mapui:text-white mapui:font-medium' : 'mapui:text-slate-400'}`}
            >
              Sources
            </Link>
            <Link
              to="/customize"
              className={`mapui:hover:text-slate-300 ${location.pathname === '/customize' ? 'mapui:text-white mapui:font-medium' : 'mapui:text-slate-400'}`}
            >
              Customize
            </Link>
          </nav>
          {showLogout && (
            <div className="mapui:flex mapui:items-center mapui:gap-3 mapui:text-sm">
              {username && (
                <span className="mapui:text-slate-400">{username}</span>
              )}
              <button
                onClick={() => logout()}
                className="mapui:text-slate-400 mapui:hover:text-white"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div className="mapui:min-h-screen mapui:bg-gray-50 mapui:flex mapui:flex-col">
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="*"
          element={
            <RequireAuth>
              <ErrorBoundary>
                <Header />
                <main className="mapui:flex-1">
                  <Routes>
                    <Route path="/" element={<Navigate to="/configs" replace />} />
                    <Route path="/configs" element={<ConfigListPage />} />
                    <Route path="/sources" element={<SourcesPage />} />
                    <Route path="/customize" element={<CustomizePage />} />
                    <Route path="/configs/new" element={<ConfigWizardPage />} />
                    <Route path="/configs/:id/edit" element={<ConfigWizardPage />} />
                    <Route path="/configs/:id/versions" element={<VersionHistoryPage />} />
                    <Route path="/configs/:id/preview" element={<ConfigPreviewPage />} />
                  </Routes>
                </main>
              </ErrorBoundary>
            </RequireAuth>
          }
        />
      </Routes>
    </div>
  );
}
