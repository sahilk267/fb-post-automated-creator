import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ContentList from './pages/ContentList';
import ContentForm from './pages/ContentForm';
import ContentDetail from './pages/ContentDetail';
import MetaPages from './pages/MetaPages';
import AuditLogs from './pages/AuditLogs';
import Users from './pages/Users';
import Signup from './pages/Signup';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/" element={<Layout />}>
        <Route index element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="content" element={<RequireAuth><ContentList /></RequireAuth>} />
        <Route path="content/new" element={<RequireAuth><ContentForm /></RequireAuth>} />
        <Route path="content/:id" element={<RequireAuth><ContentDetail /></RequireAuth>} />
        <Route path="content/:id/edit" element={<RequireAuth><ContentForm /></RequireAuth>} />
        <Route path="meta-pages" element={<RequireAuth><MetaPages /></RequireAuth>} />
        <Route path="audit-logs" element={<RequireAuth><AuditLogs /></RequireAuth>} />
        <Route path="users" element={<RequireAuth><Users /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
