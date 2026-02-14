import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMe } from '../api/users';

export default function Login() {
  const [userId, setUserId] = useState('1');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUserId: setAuthUserId, setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = parseInt(userId, 10);
    if (Number.isNaN(id) || id < 1) {
      setError('Enter a valid user ID (e.g. 1)');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await getMe(id);
      setAuthUserId(id);
      setUser(user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'User not found. Run scripts/init_db.py to seed users.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-sm rounded-2xl bg-white shadow-lg border border-slate-200 p-8">
        <h1 className="text-2xl font-semibold text-slate-900 mb-2">Sign in</h1>
        <p className="text-slate-500 text-sm mb-6">
          MVP: use user ID (e.g. 1 for admin). Seed DB with scripts/init_db.py.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="userId" className="block text-sm font-medium text-slate-700 mb-1">User ID</label>
            <input
              id="userId"
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="1"
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-slate-900 text-white py-2.5 font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <a href="/docs" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">API Docs</a>
        </p>
      </div>
    </div>
  );
}
