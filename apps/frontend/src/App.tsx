import { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PageLoader } from './components/ui/PageLoader';
import { lazyNamed } from './utils/lazyNamed';

const LoginPage = lazy(() => import('./pages/LoginPage'));
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'));
const SelectStudioPage = lazy(() => import('./pages/SelectStudioPage'));
const RicercaPage = lazy(() => import('./pages/RicercaPage'));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage'));
const AdminMaintenancePage = lazy(() => import('./pages/AdminMaintenancePage'));
const AuditLogsPage = lazy(() => import('./pages/AuditLogsPage'));
const ProtectedRoute = lazy(() =>
  import('./components/ProtectedRoute').then((module) => ({ default: module.ProtectedRoute })),
);

const AppLayout = lazyNamed(() => import('./layout/AppLayout'), 'AppLayout');
const DashboardPage = lazyNamed(() => import('./pages/DashboardPage'), 'DashboardPage');
const DashboardCondivisaPage = lazyNamed(
  () => import('./pages/DashboardCondivisaPage'),
  'DashboardCondivisaPage',
);
const ClientiPage = lazyNamed(() => import('./pages/ClientiPage'), 'ClientiPage');
const DebitoriPage = lazyNamed(() => import('./pages/DebitoriPage'), 'DebitoriPage');
const PratichePage = lazyNamed(() => import('./pages/PratichePage'), 'PratichePage');
const UtilitaPage = lazyNamed(() => import('./pages/UtilitaPage'), 'UtilitaPage');
const PraticaDetailPage = lazyNamed(
  () => import('./pages/PraticaDetailPage'),
  'PraticaDetailPage',
);
const PraticaClienteDetailPage = lazyNamed(
  () => import('./pages/PraticaClienteDetailPage'),
  'PraticaClienteDetailPage',
);
const GestioneStudioPage = lazyNamed(
  () => import('./pages/GestioneStudioPage'),
  'GestioneStudioPage',
);
const AvvocatiPage = lazyNamed(() => import('./pages/AvvocatiPage'), 'AvvocatiPage');
const CollaboratoriPage = lazyNamed(
  () => import('./pages/CollaboratoriPage'),
  'CollaboratoriPage',
);
const AlertsPage = lazyNamed(() => import('./pages/AlertsPage'), 'AlertsPage');
const TicketsPage = lazyNamed(() => import('./pages/TicketsPage'), 'TicketsPage');
const AdminUsersPage = lazyNamed(() => import('./pages/AdminUsersPage'), 'AdminUsersPage');
const StudiPage = lazyNamed(() => import('./pages/StudiPage'), 'StudiPage');
const ExportDatiPage = lazyNamed(() => import('./pages/ExportDatiPage'), 'ExportDatiPage');
const ImportDatiPage = lazyNamed(() => import('./pages/ImportDatiPage'), 'ImportDatiPage');
const BackupPage = lazyNamed(() => import('./pages/BackupPage'), 'default');
const ImpostazioniPage = lazyNamed(
  () => import('./pages/ImpostazioniPage'),
  'ImpostazioniPage',
);
const StatistichePage = lazyNamed(
  () => import('./pages/StatistichePage'),
  'StatistichePage',
);
const ReportClientePage = lazyNamed(
  () => import('./pages/ReportClientePage'),
  'ReportClientePage',
);
const ReportFatturazionePage = lazyNamed(
  () => import('./pages/ReportFatturazionePage'),
  'default',
);
const TassiInteressePage = lazyNamed(
  () => import('./pages/TassiInteressePage'),
  'default',
);

const PraticaDetailRoute = () => {
  const { user } = useAuth();
  const { id } = useParams();

  if (user?.ruolo === 'cliente' && id) {
    return <Navigate to={`/pratiche/${id}/cliente`} replace />;
  }

  return <PraticaDetailPage />;
};

const errorFallback = (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-900 dark:bg-slate-900 dark:text-slate-100">
    <div className="text-center space-y-4 rounded-2xl border border-rose-200 bg-rose-50 p-6 shadow-lg dark:border-rose-800 dark:bg-rose-900/60">
      <p className="text-lg font-semibold text-rose-600">Oops! Qualcosa è andato storto</p>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Prova a ricaricare la pagina o torna alla dashboard.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-rose-600 shadow-md shadow-rose-400/30 hover:bg-rose-100 dark:bg-rose-600 dark:text-white"
      >
        Ricarica
      </button>
    </div>
  </div>
);

function App() {
  return (
    <ErrorBoundary fallback={errorFallback}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/select-studio" element={<SelectStudioPage />} />
          <Route path="/dashboard-condivisa" element={<DashboardCondivisaPage />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/clienti" element={<ClientiPage />} />
                    <Route path="/clienti/:id" element={<ClientiPage />} />
                    <Route path="/debitori" element={<DebitoriPage />} />
                    <Route path="/pratiche" element={<PratichePage />} />
                    <Route path="/pratiche/:id" element={<PraticaDetailRoute />} />
                    <Route path="/pratiche/:id/cliente" element={<PraticaClienteDetailPage />} />
                    <Route path="/utilita" element={<UtilitaPage />} />
                    <Route path="/gestione-studio" element={<GestioneStudioPage />} />
                    <Route path="/avvocati" element={<AvvocatiPage />} />
                    <Route path="/collaboratori" element={<CollaboratoriPage />} />
                    <Route path="/alert" element={<AlertsPage />} />
                    <Route path="/ticket" element={<TicketsPage />} />
                    <Route path="/ricerca" element={<RicercaPage />} />
                    <Route path="/report/cliente/:id" element={<ReportClientePage />} />
                    <Route path="/report/fatturazione" element={<ReportFatturazionePage />} />
                    <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
                    <Route path="/admin/users" element={<AdminUsersPage />} />
                    <Route path="/admin/studi" element={<StudiPage />} />
                    <Route path="/admin/maintenance" element={<AdminMaintenancePage />} />
                    <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
                    <Route path="/admin/export-dati" element={<ExportDatiPage />} />
                    <Route path="/admin/import-dati" element={<ImportDatiPage />} />
                    <Route path="/admin/backup" element={<BackupPage />} />
                    <Route path="/admin/tassi-interesse" element={<TassiInteressePage />} />
                    <Route path="/impostazioni" element={<ImpostazioniPage />} />
                    <Route path="/statistiche" element={<StatistichePage />} />
                  </Routes>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}

export default App;
