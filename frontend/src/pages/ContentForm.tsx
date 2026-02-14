import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createContent, updateContent, getContent } from '../api/content';

export default function ContentForm() {
  const { userId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = id != null;
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(!isEdit);

  useEffect(() => {
    if (!isEdit || userId === null || !id) return;
    getContent(userId, parseInt(id, 10))
      .then((c) => { setTitle(c.title); setBody(c.body); setLoaded(true); })
      .catch(() => { setError('Content not found'); setLoaded(true); });
  }, [isEdit, userId, id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (userId === null) return;
    setError('');
    setLoading(true);
    try {
      if (isEdit && id) {
        await updateContent(userId, parseInt(id, 10), { title, body });
        navigate(`/content/${id}`, { replace: true });
      } else {
        const created = await createContent(userId, { title, body });
        navigate(`/content/${created.id}`, { replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && !loaded && !error) {
    return <p className="text-slate-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">{isEdit ? 'Edit content' : 'New content'}</h1>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">Title</label>
          <input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={200}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="body" className="block text-sm font-medium text-slate-700 mb-1">Body</label>
          <textarea
            id="body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
            rows={6}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-slate-900 text-white px-4 py-2 font-medium hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? 'Saving...' : isEdit ? 'Save' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
