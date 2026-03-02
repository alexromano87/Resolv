import { Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PreassessmentPage from './pages/PreassessmentPage';
import SettingsPage from './pages/SettingsPage';
import AdminWorkspacePage from './pages/AdminWorkspacePage';
import ManageQuestionsPage from './pages/ManageQuestionsPage';
import QuestionnairePage from './pages/QuestionnairePage';
import SavedReportsPage from './pages/SavedReportsPage';
import StudioDashboardPage from './pages/StudioDashboardPage';
import HelpPage from './pages/HelpPage';
import { PreassessmentTicketsPage } from './pages/PreassessmentTicketsPage';
import { PreassessmentAlertsPage } from './pages/PreassessmentAlertsPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { useAuth } from './contexts/AuthContext';
import { CheckupAppLayout } from './layout/CheckupAppLayout';

function CheckupHome() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.ruolo !== 'cliente') {
    return <Navigate to="/checkup/dashboard-studio" replace />;
  }
  return <PreassessmentPage />;
}

export default function App() {
  useEffect(() => {
    const flagKey = 'asset_reload_once';
    const shouldReload = (message: string) =>
      /loading chunk|chunkloaderror|module script failed|importing a module script failed/i.test(message);

    const onError = (event: ErrorEvent) => {
      const msg = String(event?.message || '');
      if (!shouldReload(msg)) return;
      if (sessionStorage.getItem(flagKey) === '1') return;
      sessionStorage.setItem(flagKey, '1');
      window.location.reload();
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event?.reason;
      const msg = String(reason?.message || reason || '');
      if (!shouldReload(msg)) return;
      if (sessionStorage.getItem(flagKey) === '1') return;
      sessionStorage.setItem(flagKey, '1');
      window.location.reload();
    };

    if (sessionStorage.getItem(flagKey) === '1') {
      sessionStorage.removeItem(flagKey);
    }

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return (
    <Routes>
      <Route path="/checkup/login" element={<LoginPage />} />
      <Route path="/checkup/cambio-password" element={<ChangePasswordPage />} />

      <Route
        path="/checkup"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <CheckupHome />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/dashboard-studio"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <StudioDashboardPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/ricerca-clienti"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <PreassessmentPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/help"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <HelpPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/clienti/:clientId"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <PreassessmentPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/questionario/:id"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <QuestionnairePage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/amministrazione"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <AdminWorkspacePage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/utenti"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <AdminWorkspacePage initialTab="utenti" />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/impostazioni"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <SettingsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/report-salvati"
        element={
          <ProtectedRoute>
            <CheckupAppLayout>
              <SavedReportsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/checkup/gestione-domande"
        element={
          <ProtectedRoute requiredRole="superadmin">
            <CheckupAppLayout>
              <ManageQuestionsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      {/* Tickets — cliente (own preassessment) */}
      <Route
        path="/checkup/tickets"
        element={
          <ProtectedRoute requiredRole="cliente">
            <CheckupAppLayout>
              <PreassessmentTicketsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      {/* Tickets — admin_studio (specific client) */}
      <Route
        path="/checkup/clienti/:clientId/tickets"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <PreassessmentTicketsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      {/* Alerts — cliente (own preassessment) */}
      <Route
        path="/checkup/alerts"
        element={
          <ProtectedRoute requiredRole="cliente">
            <CheckupAppLayout>
              <PreassessmentAlertsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      {/* Alerts — admin_studio (specific client) */}
      <Route
        path="/checkup/clienti/:clientId/alerts"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <PreassessmentAlertsPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      {/* Audit log — admin_studio only */}
      <Route
        path="/checkup/audit"
        element={
          <ProtectedRoute requiredRole="admin_studio">
            <CheckupAppLayout>
              <AuditLogPage />
            </CheckupAppLayout>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/checkup/" replace />} />
    </Routes>
  );
}
