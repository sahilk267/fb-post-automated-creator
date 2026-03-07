import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useOrg } from '../context/OrgContext';
import { listContent, type Content } from '../api/content';

export default function Calendar() {
    const { currentOrg } = useOrg();
    const [scheduledItems, setScheduledItems] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch approved content which might have schedule_at for this organization
        listContent({ status: 'approved', organization_id: currentOrg?.id })
            .then((res) => {
                const withSchedule = res.filter(c => c.schedule_at != null && !c.publish_statuses.some(ps => ps.status === 'posted'));
                // Sort by schedule date
                const sorted = [...withSchedule].sort((a, b) =>
                    new Date(a.schedule_at!).getTime() - new Date(b.schedule_at!).getTime()
                );
                setScheduledItems(sorted);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load schedule'))
            .finally(() => setLoading(false));
    }, [currentOrg]);

    if (loading) return <p className="text-slate-500">Loading your content calendar...</p>;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-semibold text-slate-900">Content Calendar</h1>
                <p className="text-slate-600">Plan and manage your upcoming automated posts.</p>
            </div>

            {error && <p className="text-red-600 text-sm">{error}</p>}

            <div className="space-y-6">
                {scheduledItems.length === 0 ? (
                    <div className="p-20 rounded-[2.5rem] border-2 border-dashed border-slate-200 text-center bg-slate-50 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                        <div className="relative z-10">
                            <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mx-auto mb-8 border border-slate-100 group-hover:scale-110 transition-transform duration-500">
                                <svg className="w-10 h-10 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-black text-slate-900 mb-2">Queue is Empty</h3>
                            <p className="text-slate-500 max-w-sm mx-auto mb-8 text-sm leading-relaxed">Your content pipeline is currently clear. Scale your reach by scheduling high-impact posts with our AI-powered drafting tool.</p>
                            <Link to="/content/new" className="inline-flex items-center rounded-xl bg-slate-900 px-8 py-3 text-sm font-black text-white shadow-xl shadow-slate-200 hover:bg-indigo-600 hover:shadow-indigo-100 transition-all active:scale-95">
                                Start Drafting
                            </Link>
                        </div>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Elegant Timeline Rail */}
                        <div className="absolute left-[23px] top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-500/20 via-indigo-500/10 to-transparent rounded-full"></div>
                        <div className="absolute left-[23px] top-6 h-12 w-1 bg-indigo-500 rounded-full blur-[1px]"></div>

                        <div className="space-y-10 relative pl-16">
                            {scheduledItems.map((item, idx) => {
                                const date = new Date(item.schedule_at!);
                                return (
                                    <div key={item.id} className="relative group animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 150}ms` }}>
                                        {/* Marker */}
                                        <div className="absolute -left-[53px] top-4 w-5 h-5 rounded-full border-[3px] border-white bg-indigo-600 shadow-lg shadow-indigo-200 ring-2 ring-indigo-50 group-hover:scale-125 transition-all duration-300 z-10"></div>

                                        <div className="flex flex-col lg:flex-row lg:items-center gap-6 bg-white p-7 rounded-[2rem] border border-slate-200 shadow-sm hover:shadow-2xl hover:shadow-indigo-100/50 transition-all duration-500 group-hover:border-indigo-200 relative overflow-hidden">
                                            {/* Accent Blur */}
                                            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-indigo-500/10 transition-colors"></div>

                                            <div className="flex-1 min-w-0 relative z-10">
                                                <div className="flex items-center gap-3 mb-3">
                                                    <span className="text-[10px] font-black text-indigo-700 uppercase tracking-[0.2em] px-3 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100">
                                                        {date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                                        {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <h3 className="text-lg font-black text-slate-900 mb-2 truncate group-hover:text-indigo-600 transition-colors">
                                                    {item.title}
                                                </h3>
                                                <p className="text-sm text-slate-600 line-clamp-2 mb-6 leading-relaxed">
                                                    {item.body}
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    <Link
                                                        to={`/content/${item.id}`}
                                                        className="px-4 py-2 rounded-lg bg-slate-50 text-[11px] font-black text-slate-900 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all border border-slate-100"
                                                    >
                                                        Review Content
                                                    </Link>
                                                    {item.media_id && (
                                                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 italic">
                                                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                            Visual Attached
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-6 ml-auto lg:ml-0 lg:pl-8 lg:border-l lg:border-slate-100 relative z-10">
                                                <div className="text-center min-w-[100px]">
                                                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">Queue Status</div>
                                                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-[10px] font-black tracking-widest shadow-lg shadow-indigo-100">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></span>
                                                        READY
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-16 p-8 rounded-[2.5rem] bg-indigo-900 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 blur-3xl rounded-full -mr-32 -mt-32"></div>
                            <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                                <div className="w-20 h-20 rounded-[2rem] bg-white/10 flex items-center justify-center flex-shrink-0 backdrop-blur-md border border-white/20 transform group-hover:rotate-12 transition-transform duration-700">
                                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                </div>
                                <div className="text-center md:text-left">
                                    <h4 className="text-xl font-black tracking-tight mb-2 uppercase">Autopilot Engine Active</h4>
                                    <p className="text-sm text-indigo-100/80 leading-relaxed font-medium">The content queue is synced with Meta Graph API. Our background workers are processing scheduled items with infinite retry logic and automated token guards enabled.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
