import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createContent, updateContent, getContent } from '../api/content';
import { getCategories, generateThemes, type ContentCategory } from '../api/vce';
import { listPages, type MetaPage } from '../api/metaPages';
import { uploadMedia } from '../api/media';

export default function ContentForm() {
  const { isAuthenticated } = useAuth();
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

  // Media state
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!isEdit || !isAuthenticated || !id) return;
    getContent(parseInt(id, 10))
      .then((c) => {
        setTitle(c.title);
        setBody(c.body);
        setMediaId(c.media_id || null);
        // If content has media_id, we should ideally fetch its URL if not provided by response
        // In our case ContentResponse includes media_id, but maybe not the URL yet? 
        // Our backend ContentResponse schema shows media_id: Optional[int].
        setLoaded(true);
      })
      .catch(() => { setError('Content not found'); setLoaded(true); });
  }, [isEdit, isAuthenticated, id]);

  // Load categories and pages when creating new content
  useEffect(() => {
    if (isEdit || !isAuthenticated) return;
    getCategories().then(setCategories).catch(() => setCategories([]));
    listPages().then(setPages).catch(() => setPages([]));
  }, [isEdit, isAuthenticated]);

  // Auto-generate themes when category is selected (new content only)
  useEffect(() => {
    if (isEdit || !isAuthenticated || !selectedCategory) {
      setThemes([]);
      return;
    }
    setThemeError('');
    setThemesLoading(true);
    generateThemes({ category_id: selectedCategory.id, count: 8 })
      .then((res) => {
        if (res.available && res.themes.length) setThemes(res.themes);
        else if (!res.available) setThemeError('Theme generation not configured (add GEMINI_API_KEY).');
        else setThemes([]);
      })
      .catch(() => setThemeError('Could not generate themes.'))
      .finally(() => setThemesLoading(false));
  }, [isEdit, isAuthenticated, selectedCategory?.id]);

  function loadThemeIntoForm(theme: string) {
    setTitle(theme);
    setBody(`Expand on: ${theme}\n\n`);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const res = await uploadMedia(file);
      setMediaId(res.id);
      setMediaUrl(res.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isAuthenticated) return;
    setError('');
    setLoading(true);
    try {
      if (isEdit && id) {
        await updateContent(parseInt(id, 10), { title, body, media_id: mediaId });
        navigate(`/content/${id}`, { replace: true });
      } else {
        const payload: { title: string; body: string; schedule_at?: string; schedule_meta_page_id?: number; media_id?: number | null } = {
          title,
          body,
          media_id: mediaId
        };
        if (scheduleAt && schedulePageId !== '') {
          payload.schedule_at = new Date(scheduleAt).toISOString();
          payload.schedule_meta_page_id = schedulePageId;
        }
        const created = await createContent(payload);
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
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Left Column: Form */}
        <div className="flex-1">
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

          <form onSubmit={handleSubmit} className="space-y-4">
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

            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
              <label className="block text-sm font-medium text-slate-700">Attach Media (Image or Video)</label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  accept="image/*,video/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="media-upload"
                  disabled={uploading}
                />
                <label
                  htmlFor="media-upload"
                  className={`cursor-pointer rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${uploading ? 'opacity-50' : ''}`}
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </label>
                {mediaId && <span className="text-xs text-green-600 font-medium">File attached</span>}
              </div>
              {mediaUrl && (
                <div className="mt-2 relative w-full max-w-sm rounded-lg overflow-hidden border border-slate-300 aspect-video bg-slate-200">
                  {mediaUrl.match(/\.(mp4|webm|ogg)$/) ? (
                    <video src={mediaUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full h-full object-contain" />
                  )}
                  <button
                    type="button"
                    onClick={() => { setMediaId(null); setMediaUrl(null); }}
                    className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
                    </svg>
                  </button>
                </div>
              )}
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

        {/* Right Column: Live Facebook Preview */}
        <div className="lg:w-[400px] flex-shrink-0">
          <div className="sticky top-6">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">Live Facebook Preview</h2>
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden font-sans">
              {/* FB Header */}
              <div className="p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 flex-shrink-0 border border-slate-100 flex items-center justify-center overflow-hidden">
                  <svg className="w-6 h-6 text-slate-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900">{schedulePageId ? pages.find(p => p.id === schedulePageId)?.page_name || 'My Page' : 'My Page'}</div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    Just now · <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16"><path d="M8 0a8 8 0 1 0 8 8A8 8 0 0 0 8 0zM4.5 7.5a.5.5 0 0 1 .5-.5h5a.5.5 0 0 1 0 1H5a.5.5 0 0 1-.5-.5z" /></svg>
                  </div>
                </div>
              </div>

              {/* FB Body */}
              <div className="px-3 pb-3">
                {title && <div className="text-sm font-bold mb-1">{title}</div>}
                <div className="text-sm text-slate-900 whitespace-pre-wrap">{body || 'Draft post text...'}</div>
              </div>

              {/* FB Media */}
              {mediaUrl && (
                <div className="border-t border-slate-100 bg-slate-50 aspect-auto">
                  {mediaUrl.match(/\.(mp4|webm|ogg)$/) ? (
                    <video src={mediaUrl} className="w-full h-auto" />
                  ) : (
                    <img src={mediaUrl} alt="Preview" className="w-full h-auto" />
                  )}
                </div>
              )}

              {/* FB Footer */}
              <div className="px-3 py-2 border-t border-slate-100 flex items-center justify-between text-slate-500">
                <div className="flex items-center gap-1 text-xs">
                  <div className="flex -space-x-1">
                    <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center ring-2 ring-white">
                      <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm.29 15.88c-1.34 0-2.59-.69-3.34-1.85-.75-1.16-.86-2.58-.3-3.76l1.23-2.59c.2-.42.63-.68 1.09-.68h1.46c.46 0 .89.26 1.09.68l1.23 2.59c.56 1.18.45 2.6-.3 3.76-.75 1.16-2 1.85-3.34 1.85z" /></svg>
                    </div>
                  </div>
                  <span>0</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span>0 Comments</span>
                  <span>0 Shares</span>
                </div>
              </div>
              <div className="px-3 py-1 flex justify-around border-t border-slate-100">
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 py-1.5 px-3 hover:bg-slate-50 rounded">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.708C19.746 10 20.5 10.754 20.5 11.692V14.5c0 .414-.336.75-.75.75H14v4.708c0 .938-.754 1.692-1.692 1.692h-2.808c-.414 0-.75-.336-.75-.75V15.25H4v-4.708c0-.938.754-1.692 1.692-1.692h2.808c.414 0 .75.336.75.75V10h4.708z" /></svg> Like
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 py-1.5 px-3 hover:bg-slate-50 rounded">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg> Comment
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500 py-1.5 px-3 hover:bg-slate-50 rounded">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg> Share
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs leading-relaxed">
              <p className="font-semibold mb-1">💡 Pro-Tip</p>
              Your post will be published exactly as shown in this preview. Use "Create with AI" to generate high-engagement hooks!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
