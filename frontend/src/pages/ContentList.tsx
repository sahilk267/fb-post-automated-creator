import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { listContent, type Content } from '../api/content';

export default function ContentList() {
  const { isAuthenticated } = useAuth();
  const [content, setContent] = useState<Content[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) return;
    const params = statusFilter ? { limit: 100, status: statusFilter } : { limit: 100 };
    listContent(params)
      .then(setContent)
      .catch(() => setContent([]))
      .finally(() => setLoading(false));
  }, [isAuthenticated, statusFilter]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Content</h1>
        <Link to="/content/new" className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800">
          New content
        </Link>
      </div>
      <div className="mb-4 flex gap-2 items-center">
        <label className="text-sm text-slate-600">Status:</label>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
        >
          <option value="">All</option>
          <option value="draft">Draft</option>
          <option value="pending_approval">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : content.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No content. <Link to="/content/new" className="text-indigo-600 hover:underline">Create one</Link>.
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {content.map((c) => (
            <li key={c.id}>
              <Link to={`/content/${c.id}`} className="block px-4 py-3 hover:bg-slate-50 flex items-center justify-between">
                <span className="font-medium text-slate-900">{c.title}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${c.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
                  c.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
                    c.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-slate-100 text-slate-600'
                  }`}>
                  {c.status}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
