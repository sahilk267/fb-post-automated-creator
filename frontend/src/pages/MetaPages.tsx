import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listPages, syncPages, type MetaPage } from '../api/metaPages';
import { getPostingPreference, updatePostingPreference } from '../api/scheduledPosts';
import { apiUrl } from '../api/client';

export default function MetaPages() {
  const { userId } = useAuth();
  const [pages, setPages] = useState<MetaPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncLoading, setSyncLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Preference editing state
  const [editingPage, setEditingPage] = useState<MetaPage | null>(null);
  const [cooldown, setCooldown] = useState(15);
  const [maxPosts, setMaxPosts] = useState(5);
  const [prefLoading, setPrefLoading] = useState(false);

  useEffect(() => {
    if (userId === null) return;
    setLoading(true);
    listPages(userId)
      .then(setPages)
      .catch(() => setPages([]))
      .finally(() => setLoading(false));
  }, [userId]);

  function handleConnectFacebook() {
    if (userId === null) return;
    const url = apiUrl('auth/facebook/login', { user_id: userId });
    window.location.href = url.startsWith('http') ? url : `${window.location.origin}${url}`;
  }

  async function handleSync() {
    if (userId === null) return;
    setSyncLoading(true);
    setMessage(null);
    try {
      const res = await syncPages(userId);
      setPages(await listPages(userId));
      setMessage({ type: 'success', text: `Synced ${res.synced} page(s).` });
    } catch (e) {
      setMessage({ type: 'error', text: e instanceof Error ? e.message : 'Sync failed.' });
    } finally {
      setSyncLoading(false);
    }
  }

  async function openSettings(page: MetaPage) {
    if (userId === null) return;
    setEditingPage(page);
    setPrefLoading(true);
    try {
      const pref = await getPostingPreference(userId, page.id);
      setCooldown(pref.cooldown_minutes);
      setMaxPosts(pref.max_posts_per_day);
    } catch (e) {
      // Default fallback if not set yet
      setCooldown(15);
      setMaxPosts(5);
    } finally {
      setPrefLoading(false);
    }
  }

  async function saveSettings(e: React.FormEvent) {
    e.preventDefault();
    if (userId === null || !editingPage) return;
    setPrefLoading(true);
    try {
      await updatePostingPreference(userId, editingPage.id, {
        cooldown_minutes: cooldown,
        max_posts_per_day: maxPosts,
      });
      setEditingPage(null);
      setMessage({ type: 'success', text: 'Settings saved.' });
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setPrefLoading(false);
    }
  }

  // Recommendations state
  const [recPage, setRecPage] = useState<MetaPage | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);
  const [recLoading, setRecLoading] = useState(false);

  async function openRecommendations(page: MetaPage) {
    if (userId === null) return;
    setRecPage(page);
    setRecLoading(true);
    try {
      // Direct fetch to keep it simple without adding to api client file if not needed, or add to api client.
      // Let's assume we add it to api client or use apiFetch directly.
      // Using apiFetch directly since I don't want to edit another file just for this if possible,
      // but cleaner to use client. Let's use apiFetch import from earlier if available or import it.
      // I imported apiUrl, let's look at imports.
      // I need to import apiFetch.
      const res = await fetch(apiUrl(`meta/pages/${page.id}/recommendations`, { user_id: userId }));
      if (res.ok) {
        setRecommendations(await res.json());
      } else {
        setRecommendations(null);
      }
    } catch (e) {
      setRecommendations(null);
    } finally {
      setRecLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-2">Facebook Pages</h1>
      <p className="text-slate-600 text-sm mb-6">
        Connect your Facebook account and sync pages to publish or schedule content to your Pages.
      </p>

      <div className="flex flex-wrap items-center gap-3 mb-6">
        <button
          type="button"
          onClick={handleConnectFacebook}
          className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          Connect Facebook
        </button>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncLoading}
          className="rounded-lg border border-slate-300 bg-white text-slate-700 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
        >
          {syncLoading ? 'Syncing...' : 'Sync pages'}
        </button>
      </div>

      {message && (
        <p className={`text-sm mb-4 ${message.type === 'success' ? 'text-emerald-700' : 'text-red-700'}`}>
          {message.text}
        </p>
      )}

      {loading ? (
        <p className="text-slate-500">Loading pages...</p>
      ) : pages.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          <p className="font-medium mb-1">No pages yet.</p>
          <p>Click <strong>Connect Facebook</strong> to sign in with Facebook, then click <strong>Sync pages</strong> to load your Pages.</p>
        </div>
      ) : (
        <ul className="bg-white rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
          {pages.map((p) => (
            <li key={p.id} className="px-4 py-3 flex items-center justify-between">
              <div>
                <span className="font-medium text-slate-900">{p.page_name || p.page_id}</span>
                {p.category && <span className="ml-2 text-slate-500 text-sm">{p.category}</span>}
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => openRecommendations(p)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Tips
                </button>
                <button
                  onClick={() => openSettings(p)}
                  className="text-sm text-indigo-600 hover:underline"
                >
                  Settings
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Settings Modal */}
      {editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Settings for {editingPage.page_name}</h3>
            {prefLoading ? (
              <p className="text-slate-500">Loading...</p>
            ) : (
              <form onSubmit={saveSettings} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Cooldown (minutes)</label>
                  <p className="text-xs text-slate-500 mb-2">Minimum time between posts.</p>
                  <input
                    type="number"
                    min="1"
                    value={cooldown}
                    onChange={(e) => setCooldown(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Max posts per day</label>
                  <p className="text-xs text-slate-500 mb-2">Safety cap to prevent spamming.</p>
                  <input
                    type="number"
                    min="1"
                    value={maxPosts}
                    onChange={(e) => setMaxPosts(parseInt(e.target.value, 10))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setEditingPage(null)}
                    className="px-4 py-2 text-slate-700 hover:bg-slate-50 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                  >
                    Save
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Recommendations Modal */}
      {recPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Posting Tips for {recPage.page_name}</h3>
            {recLoading ? (
              <p className="text-slate-500">Loading tips...</p>
            ) : !recommendations ? (
              <p className="text-slate-500">No suggestions available right now.</p>
            ) : (
              <div className="space-y-4">
                {recommendations.recommendations?.best_time_windows?.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-indigo-900 mb-1">Best Time Windows</h4>
                    <ul className="list-disc list-inside text-sm text-slate-700">
                      {recommendations.recommendations.best_time_windows.map((w: any, i: number) => (
                        <li key={i}>{w.day_of_week}: {w.start_time} - {w.end_time}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recommendations.recommendations?.category_mix && (
                  <div>
                    <h4 className="text-sm font-medium text-indigo-900 mb-1">Recommended Mix</h4>
                    <p className="text-sm text-slate-700">{JSON.stringify(recommendations.recommendations.category_mix)}</p>
                  </div>
                )}
                <p className="text-xs text-slate-500 italic mt-4">These are AI-driven suggestions based on page history. You always have full control.</p>
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setRecPage(null)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
