import { useState, useEffect } from 'react';
import { listContent, getInsights, type Content, type Insights as InsightsData } from '../api/content';

export default function Insights() {
    const [contentList, setContentList] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedContent, setSelectedContent] = useState<Content | null>(null);
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        listContent({ status: 'approved' }) // FB status 'posted' is what we want, but listContent uses status 'draft'/'approved'
            .then((res) => {
                // Filter for those actually posted
                const posted = res.filter(c => c.fb_status === 'posted');
                setContentList(posted);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load content'))
            .finally(() => setLoading(false));
    }, []);

    async function handleViewInsights(content: Content) {
        setSelectedContent(content);
        setInsights(null);
        setLoadingInsights(true);
        try {
            const data = await getInsights(content.id);
            setInsights(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch insights');
        } finally {
            setLoadingInsights(false);
        }
    }

    if (loading) return <p className="text-slate-500">Loading growth data...</p>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Growth Dashboard</h1>
                <p className="text-slate-600">Track engagement and reach for your published content.</p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: List of Published Content */}
                <div className="lg:col-span-1 space-y-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Recently Published</h2>
                    {contentList.length === 0 ? (
                        <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-slate-500 text-sm">No published posts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {contentList.map((c) => (
                                <button
                                    key={c.id}
                                    onClick={() => handleViewInsights(c)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedContent?.id === c.id
                                            ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 ring-opacity-20'
                                            : 'bg-white border-slate-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="text-sm font-semibold text-slate-900 truncate">{c.title}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        Published {new Date(c.approved_at || c.created_at).toLocaleDateString()}
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Insights View */}
                <div className="lg:col-span-2">
                    {!selectedContent ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400">
                            <svg className="w-12 h-12 mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <p className="text-sm font-medium">Select a post to view detailed insights from Meta.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full">
                            <div className="p-6 border-b border-slate-100 bg-slate-50">
                                <h3 className="text-lg font-bold text-slate-900 mb-1">{selectedContent.title}</h3>
                                <p className="text-xs text-slate-500">Facebook Post ID: {selectedContent.fb_post_id}</p>
                            </div>

                            <div className="p-8">
                                {loadingInsights ? (
                                    <div className="flex flex-col items-center justify-center py-12">
                                        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                                        <p className="text-slate-500 text-sm">Fetching real-time data from Meta...</p>
                                    </div>
                                ) : insights ? (
                                    <div className="space-y-8">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="p-6 rounded-2xl bg-indigo-50 border border-indigo-100">
                                                <div className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-2">Reach (Post Impressions)</div>
                                                <div className="text-4xl font-black text-indigo-900">{insights.reach.toLocaleString()}</div>
                                                <div className="text-xs text-indigo-500 mt-2">Unique people who saw this post.</div>
                                            </div>
                                            <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                                                <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Engagement</div>
                                                <div className="text-4xl font-black text-emerald-900">{insights.engagement.toLocaleString()}</div>
                                                <div className="text-xs text-emerald-500 mt-2">Clicks, reactions, and shares.</div>
                                            </div>
                                        </div>

                                        <div className="pt-6 border-t border-slate-100">
                                            <h4 className="text-sm font-bold text-slate-900 mb-4">Performance Summary</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between text-sm">
                                                    <span className="text-slate-600">Engagement Rate</span>
                                                    <span className="font-bold text-slate-900">{insights.reach > 0 ? ((insights.engagement / insights.reach) * 100).toFixed(2) : '0.00'}%</span>
                                                </div>
                                                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-indigo-600 rounded-full"
                                                        style={{ width: `${Math.min(100, (insights.reach > 0 ? (insights.engagement / insights.reach) * 100 : 0))}%` }}
                                                    ></div>
                                                </div>
                                                <p className="text-xs text-slate-500 italic">
                                                    * Data is fetched live from Meta Graph API. Metrics may take up to 24 hours to stabilize on new posts.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-slate-500 italic">
                                        Could not load insights. Ensure the post is still active on Facebook.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
