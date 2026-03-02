import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useEffect } from 'react';
import { getMe } from '../api/users';

export default function Layout() {
  const { userId, user, setUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (userId && !user) {
      getMe(userId)
        .then(setUser)
        .catch(() => logout());
    }
  }, [userId, user, setUser, logout]);

  if (userId && !user) {
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
          {!isLogin && (
            <nav className="flex items-center gap-4">
              <Link to="/" className="hover:text-slate-300">Dashboard</Link>
              <Link to="/content" className="hover:text-slate-300">Content</Link>
              <Link to="/meta-pages" className="hover:text-slate-300">Facebook Pages</Link>
              {user?.is_admin && (
                <>
                  <Link to="/audit-logs" className="hover:text-slate-300">Audit Logs</Link>
                  <Link to="/users" className="hover:text-slate-300">Users</Link>
                </>
              )}
              <span className="text-slate-400 text-sm">
                {user ? `${user.username}${user.is_admin ? ' (Admin)' : ''}` : `User #${userId}`}
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
