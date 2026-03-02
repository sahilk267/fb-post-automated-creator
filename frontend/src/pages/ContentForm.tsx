import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createContent, updateContent, getContent } from '../api/content';
import { getCategories, generateThemes, type ContentCategory } from '../api/vce';
import { listPages, type MetaPage } from '../api/metaPages';

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

  // Automation: category → themes → load into form (new content only)
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ContentCategory | null>(null);
  const [themes, setThemes] = useState<string[]>([]);
  const [themesLoading, setThemesLoading] = useState(false);
  const [themeError, setThemeError] = useState('');

  // Schedule for (new content only): when to publish after approval
  const [scheduleAt, setScheduleAt] = useState('');
  const [schedulePageId, setSchedulePageId] = useState<number | ''>('');
  const [pages, setPages] = useState<MetaPage[]>([]);

  useEffect(() => {
    if (!isEdit || userId === null || !id) return;
    getContent(userId, parseInt(id, 10))
      .then((c) => { setTitle(c.title); setBody(c.body); setLoaded(true); })
      .catch(() => { setError('Content not found'); setLoaded(true); });
  }, [isEdit, userId, id]);

  // Load categories and pages when creating new content
  useEffect(() => {
    if (isEdit || userId === null) return;
    getCategories(userId).then(setCategories).catch(() => setCategories([]));
    listPages(userId).then(setPages).catch(() => setPages([]));
  }, [isEdit, userId]);

  // Auto-generate themes when category is selected (new content only)
  useEffect(() => {
    if (isEdit || userId === null || !selectedCategory) {
      setThemes([]);
      return;
    }
    setThemeError('');
    setThemesLoading(true);
    generateThemes(userId, { category_id: selectedCategory.id, count: 8 })
      .then((res) => {
        if (res.available && res.themes.length) setThemes(res.themes);
        else if (!res.available) setThemeError('Theme generation not configured (add GEMINI_API_KEY).');
        else setThemes([]);
      })
      .catch(() => setThemeError('Could not generate themes.'))
      .finally(() => setThemesLoading(false));
  }, [isEdit, userId, selectedCategory?.id]);

  function loadThemeIntoForm(theme: string) {
    setTitle(theme);
    setBody(`Expand on: ${theme}\n\n`);
  }

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
        const payload: { title: string; body: string; schedule_at?: string; schedule_meta_page_id?: number } = { title, body };
        if (scheduleAt && schedulePageId !== '') {
          payload.schedule_at = new Date(scheduleAt).toISOString();
          payload.schedule_meta_page_id = schedulePageId;
        }
        const created = await createContent(userId, payload);
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

      {/* Automation: Category → AI themes → load into form (new content only) */}
      {!isEdit && (
        <div className="mb-8 p-5 rounded-xl bg-indigo-50 border-2 border-indigo-200">
          <h2 className="text-base font-semibold text-indigo-900 mb-1">Create with AI – category & themes</h2>
          <p className="text-sm text-indigo-700 mb-3">Select a category → themes generate automatically → click a theme to load it into the form below.</p>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            value={selectedCategory?.id ?? ''}
            onChange={(e) => {
              const id = e.target.value ? parseInt(e.target.value, 10) : 0;
              setSelectedCategory(categories.find((c) => c.id === id) ?? null);
            }}
            className="mb-3 w-full max-w-md rounded-lg border border-slate-300 px-3 py-2 focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="">Choose category...</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {categories.length === 0 && !themesLoading && <p className="text-slate-500 text-sm mb-2">No categories yet. Run the app with DB seed (Docker or init_db) to get Motivation, Tips, Reflection.</p>}
          {themesLoading && <p className="text-indigo-600 text-sm font-medium mb-2">Generating themes...</p>}
          {themeError && <p className="text-amber-700 text-sm mb-2">{themeError}</p>}
          {!themesLoading && themes.length > 0 && (
            <>
              <p className="text-sm font-medium text-slate-700 mb-2">Click a theme to load it into Title & Body below</p>
              <div className="flex flex-wrap gap-2">
                {themes.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => loadThemeIntoForm(t)}
                    className="rounded-lg border-2 border-indigo-300 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:bg-indigo-100 hover:border-indigo-500"
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
        {!isEdit && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
            <h3 className="text-sm font-semibold text-slate-800">Schedule for (optional)</h3>
            <p className="text-xs text-slate-600">After approval, this content will be published to the selected page at the chosen time.</p>
            <div className="flex flex-wrap gap-4 items-end">
              <div>
                <label htmlFor="schedule_at" className="block text-xs font-medium text-slate-600 mb-1">Date & time</label>
                <input
                  id="schedule_at"
                  type="datetime-local"
                  value={scheduleAt}
                  onChange={(e) => setScheduleAt(e.target.value)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label htmlFor="schedule_page" className="block text-xs font-medium text-slate-600 mb-1">Publish to page</label>
                <select
                  id="schedule_page"
                  value={schedulePageId === '' ? '' : schedulePageId}
                  onChange={(e) => setSchedulePageId(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm min-w-[180px]"
                >
                  <option value="">Select page...</option>
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>{p.page_name || p.page_id}</option>
                  ))}
                </select>
                {pages.length === 0 && (
                  <p className="text-amber-700 text-xs mt-1">
                    No pages? <Link to="/meta-pages" className="font-medium underline hover:no-underline">Connect Facebook and sync pages</Link>.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
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
