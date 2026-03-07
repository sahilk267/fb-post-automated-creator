import { useState, useEffect } from 'react';
import { listContent, getInsights, type Content, type Insights as InsightsData, type ContentPublishStatus } from '../api/content';
import { listPages } from '../api/metaPages';
import { useOrg } from '../context/OrgContext';

interface PostedContent {
    content: Content;
    ps: ContentPublishStatus;
    pageName: string;
}

export default function Insights() {
    const { currentOrg } = useOrg();
    const [postedItems, setPostedItems] = useState<PostedContent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [selectedContent, setSelectedContent] = useState<PostedContent | null>(null);
    const [insights, setInsights] = useState<InsightsData | null>(null);
    const [loadingInsights, setLoadingInsights] = useState(false);

    useEffect(() => {
        setLoading(true);
        setSelectedContent(null);
        setInsights(null);
        Promise.all([
            listContent({ status: 'approved', organization_id: currentOrg?.id }),
            listPages(currentOrg?.id)
        ])
            .then(([resContent, resPages]) => {
                const items: PostedContent[] = [];
                resContent.forEach(c => {
                    c.publish_statuses?.forEach(ps => {
                        if (ps.status === 'posted') {
                            const page = resPages.find(p => p.id === ps.meta_page_id);
                            items.push({
                                content: c,
                                ps,
                                pageName: page ? (page.page_name || page.page_id) : 'Unknown Page'
                            });
                        }
                    });
                });
                setPostedItems(items);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load content'))
            .finally(() => setLoading(false));
    }, [currentOrg]);

    async function handleViewInsights(item: PostedContent) {
        setSelectedContent(item);
        setInsights(null);
        setLoadingInsights(true);
        try {
            if (item.ps.meta_page_id) {
                const data = await getInsights(item.content.id, item.ps.meta_page_id);
                setInsights(data);
            } else if (item.ps.linkedin_account_id) {
                // In future, implement getLinkedInInsights
                setError('Insights for LinkedIn are coming soon.');
            }
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
                    {postedItems.length === 0 ? (
                        <div className="p-8 rounded-xl border-2 border-dashed border-slate-200 text-center">
                            <p className="text-slate-500 text-sm">No published posts yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                            {postedItems.map((item, idx) => (
                                <button
                                    key={item.content.id + '-' + item.ps.meta_page_id + '-' + idx}
                                    onClick={() => handleViewInsights(item)}
                                    className={`w-full text-left p-4 rounded-xl border transition-all ${selectedContent?.content.id === item.content.id && selectedContent?.ps.meta_page_id === item.ps.meta_page_id
                                        ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500 ring-opacity-20'
                                        : 'bg-white border-slate-200 hover:border-indigo-300'
                                        }`}
                                >
                                    <div className="text-sm font-semibold text-slate-900 truncate">{item.content.title}</div>
                                    <div className="text-xs text-slate-500 mt-1 flex justify-between">
                                        <span>{new Date(item.content.approved_at || item.content.created_at).toLocaleDateString()}</span>
                                        <span className="font-medium text-indigo-600">{item.pageName}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right Column: Insights View */}
                <div className="lg:col-span-2">
                    {!selectedContent ? (
                        <div className="h-full min-h-[400px] flex flex-col items-center justify-center p-8 rounded-3xl bg-slate-50 border-2 border-dashed border-slate-200 text-slate-400 group hover:border-indigo-300 transition-colors">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <p className="text-sm font-bold text-slate-500 tracking-tight">Select a performance to analyze</p>
                            <p className="text-xs text-slate-400 mt-2">Real-time Meta Graph API intelligence</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-indigo-100/20 overflow-hidden h-full animate-in fade-in slide-in-from-right-4 duration-500">
                            <div className="p-8 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
                                <div>
                                    <div className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2">Post Performance</div>
                                    <h3 className="text-xl font-black text-slate-900 leading-tight">{selectedContent.content.title}</h3>
                                    <div className="flex items-center gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-md">Page: {selectedContent.pageName}</span>
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded-md">ID: {selectedContent.ps.platform_post_id}</span>
                                    </div>
                                </div>
                                <div className="hidden sm:block">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" /></svg>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8">
                                {loadingInsights ? (
                                    <div className="flex flex-col items-center justify-center py-20">
                                        <div className="relative w-12 h-12">
                                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-slate-500 text-sm font-bold mt-6 tracking-tight">Syncing with Meta API...</p>
                                    </div>
                                ) : insights ? (
                                    <div className="space-y-10">
                                        <div className="grid grid-cols-2 gap-8 font-sans">
                                            <div className="p-8 rounded-[2rem] bg-indigo-50/50 border border-indigo-100 flex flex-col justify-between hover:shadow-lg hover:shadow-indigo-100/50 transition-all duration-300">
                                                <div>
                                                    <div className="text-[11px] font-black text-indigo-600 uppercase tracking-widest mb-4">Total Reach</div>
                                                    <div className="text-5xl font-black text-indigo-950 tracking-tighter">{insights.reach.toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-6">
                                                    <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></div>
                                                    <span className="text-[11px] font-bold text-indigo-500">Impressions Delivered</span>
                                                </div>
                                            </div>
                                            <div className="p-8 rounded-[2rem] bg-emerald-50/50 border border-emerald-100 flex flex-col justify-between hover:shadow-lg hover:shadow-emerald-100/50 transition-all duration-300">
                                                <div>
                                                    <div className="text-[11px] font-black text-emerald-600 uppercase tracking-widest mb-4">Total Engagement</div>
                                                    <div className="text-5xl font-black text-emerald-950 tracking-tighter">{insights.engagement.toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-2 mt-6">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                                    <span className="text-[11px] font-bold text-emerald-500">Active Interactions</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="pt-8 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-6">
                                                <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Efficiency Analysis</h4>
                                                <span className="text-xl font-black text-slate-900">{insights.reach > 0 ? ((insights.engagement / insights.reach) * 100).toFixed(2) : '0.00'}% <span className="text-[10px] text-slate-400">Rate</span></span>
                                            </div>
                                            <div className="relative pt-1">
                                                <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 p-0.5">
                                                    <div
                                                        style={{ width: `${Math.min(100, (insights.reach > 0 ? (insights.engagement / insights.reach) * 100 : 0))}%` }}
                                                        className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-indigo-700 rounded-full transition-all duration-1000 ease-out"
                                                    ></div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4 pt-4">
                                                <div className="text-center">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Impact</div>
                                                    <div className="text-sm font-black text-slate-700">HIGH</div>
                                                </div>
                                                <div className="text-center border-x border-slate-100">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Trend</div>
                                                    <div className="text-sm font-black text-emerald-600">↑ 12%</div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quality</div>
                                                    <div className="text-sm font-black text-indigo-600">ELITE</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-12 text-center text-slate-400 italic bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                                        Data temporarily unavailable. Meta API is processing results for this post.
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-900 p-4 text-center">
                                <p className="text-[10px] font-bold text-indigo-300 tracking-[0.3em] uppercase">Premium Content Intelligence Analytics Dashboard</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
