import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getContent, submitForApproval, approveContent, deleteContent, publishToFacebook, type Content } from '../api/content';
import { listPages, type MetaPage } from '../api/metaPages';

export default function ContentDetail() {
  const { userId } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [content, setContent] = useState<Content | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [approveComment, setApproveComment] = useState('');
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [selectedPageId, setSelectedPageId] = useState<number | ''>('');
  const [publishLoading, setPublishLoading] = useState(false);

  useEffect(() => {
    if (userId === null || !id) return;
    getContent(userId, parseInt(id, 10)).then(setContent).catch(() => setError('Content not found'));
  }, [userId, id]);

  useEffect(() => {
    if (userId === null) return;
    listPages(userId).then(setPages).catch(() => setPages([]));
  }, [userId]);

  async function handleSubmit() {
    if (userId === null || !id || !content) return;
    setLoading(true);
    setError('');
    try {
      const updated = await submitForApproval(userId, parseInt(id, 10));
      setContent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit');
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(approved: boolean) {
    if (userId === null || !id || !content) return;
    setLoading(true);
    setError('');
    try {
      const updated = await approveContent(userId, parseInt(id, 10), { approved, comment: approveComment || undefined });
      setContent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (userId === null || !id || !content) return;
    if (!window.confirm('Delete this content?')) return;
    setLoading(true);
    setError('');
    try {
      await deleteContent(userId, parseInt(id, 10));
      navigate('/content', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setLoading(false);
    }
  }

  async function handlePublishToFacebook() {
    if (userId === null || !id || !content || selectedPageId === '') return;
    setPublishLoading(true);
    setError('');
    try {
      const updated = await publishToFacebook(userId, parseInt(id, 10), selectedPageId);
      setContent(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to publish to Facebook');
    } finally {
      setPublishLoading(false);
    }
  }

  if (error && !content) {
    return (
      <div>
        <p className="text-red-600">{error}</p>
        <Link to="/content" className="text-indigo-600 hover:underline mt-2 inline-block">Back to list</Link>
      </div>
    );
  }
  if (!content) return <p className="text-slate-500">Loading...</p>;

  const canEdit = content.status === 'draft';
  const canSubmit = content.status === 'draft';
  const canApprove = content.status === 'pending_approval';
  const statusClass =
    content.status === 'approved' ? 'bg-emerald-100 text-emerald-800' :
      content.status === 'pending_approval' ? 'bg-amber-100 text-amber-800' :
        content.status === 'rejected' ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-slate-600';

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{content.title}</h1>
        <span className={'text-sm px-2 py-1 rounded-full ' + statusClass}>{content.status}</span>
      </div>
      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
      <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
        <p className="text-slate-700 whitespace-pre-wrap">{content.body}</p>
        <p className="text-slate-400 text-sm mt-4">
          Created {new Date(content.created_at).toLocaleString()}
          {content.approved_at && ' · Approved ' + new Date(content.approved_at).toLocaleString()}
          {content.fb_status === 'posted' && content.fb_post_id && ' · Published to Facebook'}
          {content.fb_status === 'failed' && ' · Facebook publish failed'}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link to={'/content/' + id + '/edit'} className="rounded-lg border border-slate-300 px-4 py-2 text-slate-700 hover:bg-slate-50">
            Edit
          </Link>
        )}
        {canSubmit && (
          <button type="button" onClick={handleSubmit} disabled={loading} className="rounded-lg bg-amber-600 text-white px-4 py-2 hover:bg-amber-700 disabled:opacity-50">
            Submit for approval
          </button>
        )}
        {canEdit && (
          <button type="button" onClick={handleDelete} disabled={loading} className="rounded-lg border border-red-300 text-red-700 px-4 py-2 hover:bg-red-50 disabled:opacity-50">
            Delete
          </button>
        )}
        {canApprove && (
          <>
            <input type="text" placeholder="Comment (optional)" value={approveComment} onChange={(e) => setApproveComment(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <button type="button" onClick={() => handleApprove(true)} disabled={loading} className="rounded-lg bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700 disabled:opacity-50">Approve</button>
            <button type="button" onClick={() => handleApprove(false)} disabled={loading} className="rounded-lg bg-red-600 text-white px-4 py-2 hover:bg-red-700 disabled:opacity-50">Reject</button>
          </>
        )}
      </div>
      <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-200">
        <h2 className="text-sm font-semibold text-slate-800 mb-2">Publish to Facebook</h2>
        {content.status !== 'approved' ? (
          <p className="text-slate-500 text-sm">Content must be <strong>Approved</strong> before it can be published.</p>
        ) : (
          <>
            <p className="text-slate-600 text-sm mb-2">Choose a Page and publish this content. Connect Facebook and sync pages first from <Link to="/meta-pages" className="text-indigo-600 hover:underline">Facebook Pages</Link>.</p>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedPageId}
                onChange={(e) => setSelectedPageId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[200px]"
              >
                <option value="">Select a page...</option>
                {pages.map((p) => (
                  <option key={p.id} value={p.id}>{p.page_name || p.page_id}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handlePublishToFacebook}
                disabled={publishLoading || selectedPageId === '' || pages.length === 0}
                className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {publishLoading ? 'Publishing...' : 'Publish to Facebook'}
              </button>
            </div>
            {pages.length === 0 && (
              <p className="text-amber-700 text-sm mt-1">
                No pages. <Link to="/meta-pages" className="font-medium underline hover:no-underline">Connect Facebook and sync pages</Link> first.
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
