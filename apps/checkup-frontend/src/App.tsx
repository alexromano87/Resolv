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
import { useAuth } from './contexts/AuthContext';
import { CheckupAppLayout } from './layout/CheckupAppLayout';

function CheckupHome() {
  const { user } = useAuth();
  if (!user) return null;
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

      <Route path="*" element={<Navigate to="/checkup/" replace />} />
    </Routes>
  );
}
