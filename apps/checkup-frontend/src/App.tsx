import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ChangePasswordPage from './pages/ChangePasswordPage';
import PreassessmentPage from './pages/PreassessmentPage';
import SettingsPage from './pages/SettingsPage';
import AdminWorkspacePage from './pages/AdminWorkspacePage';
import ManageQuestionsPage from './pages/ManageQuestionsPage';
import QuestionnairePage from './pages/QuestionnairePage';
import { useAuth } from './contexts/AuthContext';
import { CheckupAppLayout } from './layout/CheckupAppLayout';

function CheckupHome() {
  const { user } = useAuth();
  if (!user) return null;
  return <PreassessmentPage />;
}

export default function App() {
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
