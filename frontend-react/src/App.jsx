import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import AppLayout from './components/layout/AppLayout';
import ToastContainer from './components/common/ToastContainer';

const Login          = lazy(() => import('./pages/Login/Login'));
const Dashboard      = lazy(() => import('./pages/Dashboard/Dashboard'));
const PatientsPage   = lazy(() => import('./pages/Patients/PatientsPage'));
const DoctorsPage    = lazy(() => import('./pages/Doctors/DoctorsPage'));
const DiagnosesPage  = lazy(() => import('./pages/Diagnoses/DiagnosesPage'));
const DiseasesPage   = lazy(() => import('./pages/Diseases/DiseasesPage'));
const PatientProfile = lazy(() => import('./pages/PatientProfile/PatientProfile'));
const ForbiddenPage  = lazy(() => import('./pages/ForbiddenPage'));
const NotFoundPage   = lazy(() => import('./pages/NotFoundPage'));

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <i className="fas fa-spinner fa-spin" style={{ fontSize: '1.5rem', color: 'var(--primary)' }} />
    </div>
  );
}

function ProtectedRoute({ children, allowedRoles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/forbidden" replace />;
  }
  return children;
}

export default function App() {
  const { user } = useAuth();

  return (
    <>
      <ToastContainer />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public route */}
          <Route
            path="/login"
            element={user ? <Navigate to="/" replace /> : <Login />}
          />

          {/* All protected pages share the AppLayout (sidebar + topbar) */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard — accessible to every logged-in role */}
            <Route index element={<Dashboard />} />

            {/* Doctors — all roles can view; CRUD is enforced by usePermissions inside the page */}
            <Route path="doctors" element={<DoctorsPage />} />

            {/* Patients — all roles can view; CRUD enforced inside the page */}
            <Route path="patients" element={<PatientsPage />} />
            <Route path="patients/:id" element={<PatientProfile />} />

            {/* Diagnoses — Receptionist is blocked (redirected to /forbidden) */}
            <Route
              path="diagnoses"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DiagnosesPage />
                </ProtectedRoute>
              }
            />

            {/* Disease Catalog — Admin only */}
            <Route
              path="diseases"
              element={
                <ProtectedRoute allowedRoles={['Admin']}>
                  <DiseasesPage />
                </ProtectedRoute>
              }
            />

            {/* 403 page — shown inside the layout so the user retains sidebar context */}
            <Route path="forbidden" element={<ForbiddenPage />} />
          </Route>

          {/* 404 — standalone, no layout */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </>
  );
}
