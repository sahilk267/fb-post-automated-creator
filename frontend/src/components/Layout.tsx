import { Link, useLocation, Outlet, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { isAuthenticated, user, logout, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Redirect if not authenticated (handled by RequireAuth, but safe for layout)
  if (!isAuthenticated && location.pathname !== '/login' && location.pathname !== '/signup') {
    return <Navigate to="/login" replace />;
  }

  if (isAuthenticated && !user && isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Loading...</p>
      </div>
    );
  }

  const isLogin = location.pathname === '/login';

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="font-semibold text-lg tracking-tight">
            Content Platform
          </Link>
          {!isLogin && location.pathname !== '/signup' && (
            <nav className="flex items-center gap-4">
              <Link to="/" className="hover:text-slate-300">Dashboard</Link>
              <Link to="/calendar" className="hover:text-slate-300">Calendar</Link>
              <Link to="/content" className="hover:text-slate-300">Content</Link>
              <Link to="/insights" className="hover:text-slate-300">Insights</Link>
              <Link to="/meta-pages" className="hover:text-slate-300">Facebook Pages</Link>
              {user?.is_admin && (
                <>
                  <Link to="/audit-logs" className="hover:text-slate-300">Audit Logs</Link>
                  <Link to="/users" className="hover:text-slate-300">Users</Link>
                </>
              )}
              <span className="text-slate-400 text-sm">
                {user ? `${user.username}${user.is_admin ? ' (Admin)' : ''}` : 'Loading...'}
              </span>
              <button
                type="button"
                onClick={() => { logout(); navigate('/login'); }}
                className="text-slate-400 hover:text-white text-sm"
              >
                Logout
              </button>
            </nav>
          )}
        </div>
      </header>
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
