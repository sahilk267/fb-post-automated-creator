import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { listContent, type Content } from '../api/content';

export default function Calendar() {
    const [scheduledItems, setScheduledItems] = useState<Content[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch approved content which might have schedule_at
        listContent({ status: 'approved' })
            .then((res) => {
                const withSchedule = res.filter(c => c.schedule_at != null && c.fb_status !== 'posted');
                // Sort by schedule date
                const sorted = [...withSchedule].sort((a, b) =>
                    new Date(a.schedule_at!).getTime() - new Date(b.schedule_at!).getTime()
                );
                setScheduledItems(sorted);
            })
            .catch((err) => setError(err instanceof Error ? err.message : 'Failed to load schedule'))
            .finally(() => setLoading(false));
    }, []);

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
                    <div className="p-12 rounded-2xl border-2 border-dashed border-slate-200 text-center bg-slate-50">
                        <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <h3 className="text-lg font-bold text-slate-900 mb-2">Empty Schedule</h3>
                        <p className="text-slate-500 max-w-sm mx-auto mb-6 text-sm">You have no upcoming posts in the queue. Start drafting and schedule them for approval.</p>
                        <Link to="/content/new" className="inline-flex items-center rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                            New Content
                        </Link>
                    </div>
                ) : (
                    <div className="relative">
                        {/* Simple Timeline View */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200"></div>

                        <div className="space-y-8 relative pl-12">
                            {scheduledItems.map((item) => {
                                const date = new Date(item.schedule_at!);
                                return (
                                    <div key={item.id} className="relative group">
                                        {/* Marker */}
                                        <div className="absolute -left-12 top-2 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 ring-2 ring-indigo-100 group-hover:scale-110 transition-transform"></div>

                                        <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow group-hover:border-indigo-300">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-black text-indigo-600 uppercase tracking-widest px-2 py-0.5 rounded bg-indigo-50">
                                                        {date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500">
                                                        @ {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <h3 className="text-base font-bold text-slate-900 mb-2 truncate group-hover:text-indigo-600">
                                                    {item.title}
                                                </h3>
                                                <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                                                    {item.body}
                                                </p>
                                                <Link
                                                    to={`/content/${item.id}`}
                                                    className="text-xs font-bold text-indigo-600 hover:underline inline-flex items-center gap-1"
                                                >
                                                    View Details
                                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                                </Link>
                                            </div>

                                            <div className="flex items-center gap-3 ml-auto md:ml-0 md:pl-4 md:border-l md:border-slate-100">
                                                <div className="text-right">
                                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Status</div>
                                                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-50 text-amber-700 text-[10px] font-bold ring-1 ring-inset ring-amber-600/20">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                                                        PENDING
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="mt-12 p-6 rounded-2xl bg-indigo-900 text-white shadow-xl flex items-center gap-6">
                            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0 animate-pulse">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-lg font-bold">Automation Active</h4>
                                <p className="text-sm text-white/70">Our "Autopilot" system is monitoring this schedule. Posts will be automatically published to Meta at the exact second specified.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
