import { useState, useEffect } from 'react';
import {
    listSystemSettings,
    updateSystemSetting,
    testStripe,
    testGDrive,
    syncEnv,
    listAllUsers,
    updateUserStatus,
    listAllOrgs,
    updateOrgTier,
    getGlobalAuditLogs,
    type SystemSetting,
    type TestResult,
    type AdminUser,
    type AdminOrg,
    type AuditLog
} from '../api/adminSettings';

type TabType = 'config' | 'users' | 'orgs' | 'logs' | 'quotas';

export default function SystemSettings() {
    const [activeTab, setActiveTab] = useState<TabType>('config');
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [orgs, setOrgs] = useState<AdminOrg[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // Form state (Shared for settings/quotas)
    const [key, setKey] = useState('');
    const [value, setValue] = useState('');
    const [isEncrypted, setIsEncrypted] = useState(false);
    const [description, setDescription] = useState('');

    // Test results
    const [stripeResult, setStripeResult] = useState<TestResult | null>(null);
    const [gdriveResult, setGDriveResult] = useState<TestResult | null>(null);

    useEffect(() => {
        fetchTabData();
    }, [activeTab]);

    async function fetchTabData() {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'config' || activeTab === 'quotas') {
                const data = await listSystemSettings();
                setSettings(data);
            } else if (activeTab === 'users') {
                const data = await listAllUsers();
                setUsers(data);
            } else if (activeTab === 'orgs') {
                const data = await listAllOrgs();
                setOrgs(data);
            } else if (activeTab === 'logs') {
                const data = await getGlobalAuditLogs();
                setLogs(data);
            }
        } catch (err) {
            setError('Failed to load data for ' + activeTab);
        } finally {
            setLoading(false);
        }
    }

    async function handleUpdateSetting(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setActionLoading('updating');
        try {
            await updateSystemSetting({ key, value, is_encrypted: isEncrypted, description });
            setSuccess(`Setting ${key} updated successfully`);
            setKey('');
            setValue('');
            setDescription('');
            fetchTabData();
        } catch (err: any) {
            setError(err.response?.data?.detail || 'Failed to update setting');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleTestStripe() {
        setActionLoading('test-stripe');
        setStripeResult(null);
        try {
            const res = await testStripe();
            setStripeResult(res);
        } catch (err) {
            setStripeResult({ success: false, error: 'Request failed' });
        } finally {
            setActionLoading(null);
        }
    }

    async function handleTestGDrive() {
        setActionLoading('test-gdrive');
        setGDriveResult(null);
        try {
            const res = await testGDrive();
            setGDriveResult(res);
        } catch (err) {
            setGDriveResult({ success: false, error: 'Request failed' });
        } finally {
            setActionLoading(null);
        }
    }

    async function handleSyncEnv() {
        setActionLoading('sync-env');
        try {
            const res = await syncEnv();
            setSuccess(res.message);
        } catch (err) {
            setError('Sync failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleToggleUserStatus(userId: number, currentStatus: boolean) {
        setActionLoading(`user-${userId}`);
        try {
            await updateUserStatus(userId, !currentStatus);
            setSuccess(`User status updated`);
            fetchTabData();
        } catch (err) {
            setError('Update failed');
        } finally {
            setActionLoading(null);
        }
    }

    async function handleUpdateTier(orgId: number, tier: string) {
        setActionLoading(`org-${orgId}`);
        try {
            await updateOrgTier(orgId, tier);
            setSuccess(`Tier updated to ${tier.toUpperCase()}`);
            fetchTabData();
        } catch (err) {
            setError('Update failed');
        } finally {
            setActionLoading(null);
        }
    }

    const TABS = [
        { id: 'config', label: 'CONFIGURATION', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg> },
        { id: 'quotas', label: 'QUOTAS & LIMITS', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg> },
        { id: 'users', label: 'USER CONTROL', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 01-9-3.47M21 16.143v4M15 8.657L12 12m0 0l-3-3.343M12 12v6" /></svg> },
        { id: 'orgs', label: 'ORGANIZATIONS', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg> },
        { id: 'logs', label: 'AUDIT LOGS', icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg> },
    ];

    return (
        <div className="max-w-7xl mx-auto py-12 px-4">
            <header className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Super Admin Control</h1>
                    <p className="text-slate-500 font-bold">Platform-wide oversight and high-security settings.</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm overflow-x-auto no-scrollbar">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id
                                ? 'bg-slate-900 text-white shadow-lg'
                                : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>
            </header>

            {error && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 font-bold text-sm shadow-sm">{error}</div>}
            {success && <div className="mb-6 p-4 bg-emerald-50 border border-emerald-100 rounded-2xl text-emerald-700 font-bold text-sm shadow-sm">{success}</div>}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                {/* LEFT CONTENT AREA */}
                <div className="lg:col-span-2 space-y-8">

                    {/* CONFIGURATION TAB */}
                    {activeTab === 'config' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Global Keys</h2>
                                    <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400">
                                        {settings.filter(s => !s.key.startsWith('LIMIT_')).length} ACTIVE KEYS
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {settings.filter(s => !s.key.startsWith('LIMIT_')).map(s => (
                                        <div key={s.key} className="p-8 hover:bg-slate-50/30 transition-colors group">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-black text-slate-900">{s.key}</span>
                                                        {s.is_encrypted && <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase rounded">Encrypted</span>}
                                                    </div>
                                                    <p className="text-xs font-bold text-slate-400">{s.description || 'System setting'}</p>
                                                    <code className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-1 rounded block mt-2">{s.value}</code>
                                                </div>
                                                <button
                                                    onClick={() => { setKey(s.key); setValue(''); setIsEncrypted(s.is_encrypted); setDescription(s.description || ''); }}
                                                    className="p-2 opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-indigo-600"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            <section className="grid md:grid-cols-2 gap-8">
                                <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-indigo-500/20 transition-all duration-700"></div>
                                    <h3 className="text-xl font-black uppercase tracking-widest leading-none">Gateway Sync</h3>
                                    <p className="text-slate-400 text-[10px] font-bold">Write DB settings to permanent .env file for runtime security.</p>
                                    <button
                                        onClick={handleSyncEnv}
                                        disabled={actionLoading === 'sync-env'}
                                        className="w-full py-4 bg-white text-slate-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-100 active:scale-95 transition-all"
                                    >
                                        {actionLoading === 'sync-env' ? 'Synchronizing...' : 'Sync to Environments'}
                                    </button>
                                </div>
                                <div className="p-8 bg-slate-900 rounded-[2rem] text-white space-y-6 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-rose-500/20 transition-all duration-700"></div>
                                    <h3 className="text-xl font-black uppercase tracking-widest leading-none">Diagnostics</h3>
                                    <p className="text-slate-400 text-[10px] font-bold">Test real-time connectivity to Stripe & Google Cloud services.</p>
                                    <div className="flex gap-4">
                                        <button onClick={handleTestStripe} className="flex-1 py-4 bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">Stripe</button>
                                        <button onClick={handleTestGDrive} className="flex-1 py-4 bg-slate-800 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all">GDrive</button>
                                    </div>
                                    {(stripeResult || gdriveResult) && (
                                        <div className="pt-2 text-[9px] font-black uppercase tracking-widest space-y-1">
                                            {stripeResult && <div className={stripeResult.success ? 'text-emerald-400' : 'text-rose-400'}>Stripe: {stripeResult.success ? 'Connected' : 'Error'}</div>}
                                            {gdriveResult && <div className={gdriveResult.success ? 'text-emerald-400' : 'text-rose-400'}>GDrive: {gdriveResult.success ? 'Connected' : 'Error'}</div>}
                                        </div>
                                    )}
                                </div>
                            </section>
                        </div>
                    )}

                    {/* USERS TAB */}
                    {activeTab === 'users' && (
                        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Global Users</h2>
                                <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400">
                                    {users.length} REGISTERED
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">User Details</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Account Type</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {users.map(u => (
                                            <tr key={u.id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="font-black text-slate-900 text-sm mb-1">{u.username}</div>
                                                    <div className="text-xs font-bold text-slate-400">{u.email}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${u.is_active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                                                        {u.is_active ? 'Active' : 'Banned'}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${u.is_admin ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                                                        {u.is_admin ? 'Super Admin' : 'User'}
                                                    </span>
                                                </td>
                                                <td className="p-6">
                                                    <button
                                                        disabled={u.is_admin}
                                                        onClick={() => handleToggleUserStatus(u.id, u.is_active)}
                                                        className={`p-2 rounded-xl transition-all ${u.is_active ? 'text-rose-400 hover:bg-rose-50' : 'text-emerald-400 hover:bg-emerald-50'} disabled:opacity-20`}
                                                    >
                                                        {u.is_active ? (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728L5.636 5.636" /></svg>
                                                        ) : (
                                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                        )}
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* ORGS TAB */}
                    {activeTab === 'orgs' && (
                        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Global Workspaces</h2>
                                <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400">
                                    {orgs.length} TEAMS
                                </span>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Organization</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Current Tier</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing ID</th>
                                            <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tier Override</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {orgs.map(o => (
                                            <tr key={o.id} className="hover:bg-slate-50/30 transition-colors">
                                                <td className="p-6">
                                                    <div className="font-black text-slate-900 text-sm">{o.name}</div>
                                                    <div className="text-[10px] font-bold text-slate-400">ID: {o.id} • Registered {new Date(o.created_at).toLocaleDateString()}</div>
                                                </td>
                                                <td className="p-6">
                                                    <span className={`px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest ${o.subscription_tier === 'agency' ? 'bg-amber-100 text-amber-700' : o.subscription_tier === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {o.subscription_tier}
                                                    </span>
                                                    <div className="text-[8px] font-black text-slate-400 mt-1 uppercase tracking-tight">{o.subscription_status}</div>
                                                </td>
                                                <td className="p-6">
                                                    <code className="text-[9px] font-mono text-slate-400">{o.stripe_customer_id || 'NOT SYNCED'}</code>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex gap-2">
                                                        {['free', 'pro', 'agency'].map(t => (
                                                            <button
                                                                key={t}
                                                                onClick={() => handleUpdateTier(o.id, t)}
                                                                className={`p-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${o.subscription_tier === t ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'}`}
                                                            >
                                                                {t[0]}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}

                    {/* LOGS TAB */}
                    {activeTab === 'logs' && (
                        <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Global Audit Trail</h2>
                                <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase">
                                    LIVE MONITORING Active
                                </span>
                            </div>
                            <div className="divide-y divide-slate-50 h-[600px] overflow-y-auto custom-scrollbar">
                                {logs.map(log => (
                                    <div key={log.id} className="p-6 hover:bg-slate-50/30 transition-colors flex items-start gap-4">
                                        <div className="p-2 bg-slate-100 rounded-xl text-slate-400 mt-1">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center justify-between gap-4 mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-black text-slate-900 uppercase tracking-widest">{log.action}</span>
                                                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-500 text-[8px] font-black uppercase tracking-widest rounded-md">{log.module}</span>
                                                </div>
                                                <span className="text-[10px] font-bold text-slate-400">{new Date(log.created_at).toLocaleString()}</span>
                                            </div>
                                            <p className="text-xs font-bold text-slate-500 mb-1">User ID: <span className="text-slate-900">{log.user_id}</span></p>
                                            {log.details && <pre className="text-[10px] font-mono text-slate-400 bg-slate-50 p-2 rounded-lg mt-2 overflow-x-auto">{log.details}</pre>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* QUOTAS TAB */}
                    {activeTab === 'quotas' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <section className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                                    <h2 className="text-lg font-black text-slate-900 uppercase tracking-widest">Dynamic Tier Limits</h2>
                                    <span className="px-3 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-400 uppercase">
                                        Active Policies
                                    </span>
                                </div>
                                <div className="divide-y divide-slate-50">
                                    {['FREE', 'PRO', 'AGENCY'].map(tier => (
                                        <div key={tier} className="p-10 hover:bg-slate-50/30 transition-colors">
                                            <h3 className="text-sm font-black text-slate-900 tracking-widest uppercase mb-6 flex items-center gap-3">
                                                {tier} PLAN
                                                <div className="h-px bg-slate-100 flex-1"></div>
                                            </h3>
                                            <div className="grid md:grid-cols-2 gap-6">
                                                {['MAX_POSTS', 'MAX_MEMBERS'].map(attr => {
                                                    const keyName = `LIMIT_${tier}_${attr}`;
                                                    const currentSetting = settings.find(s => s.key === keyName);
                                                    return (
                                                        <div key={attr} className="p-6 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-all group">
                                                            <div className="flex items-center justify-between mb-2">
                                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{attr.replace('_', ' ')}</span>
                                                                <button
                                                                    onClick={() => { setKey(keyName); setValue(currentSetting?.value || '0'); setDescription(`Dynamic limit for ${tier}`); setIsEncrypted(false); }}
                                                                    className="text-slate-300 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-all"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                                                                </button>
                                                            </div>
                                                            <div className="text-2xl font-black text-slate-900">
                                                                {currentSetting?.value || (attr === 'MAX_POSTS' ? (tier === 'FREE' ? '10' : tier === 'PRO' ? '100' : '500') : (tier === 'FREE' ? '1' : tier === 'PRO' ? '5' : '20'))}
                                                            </div>
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase italic mt-1">per workspace / month</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>
                    )}

                </div>

                {/* RIGHT SIDEBAR - GLOBAL ACTIONS & FORM */}
                <div className="space-y-8">

                    {/* GLOBAL STATUS PANEL */}
                    <div className="p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-xl shadow-slate-200/50 space-y-6">
                        <section>
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Platform Mode</h2>
                            {(() => {
                                const maint = settings.find(s => s.key === 'MAINTENANCE_MODE');
                                const isActive = maint?.value === 'true';
                                return (
                                    <button
                                        onClick={() => { setKey('MAINTENANCE_MODE'); setValue(isActive ? 'false' : 'true'); setIsEncrypted(false); setDescription('Emergency global maintenance lock'); }}
                                        className={`w-full p-4 rounded-2xl flex items-center justify-between border-2 transition-all group ${isActive ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}
                                    >
                                        <div className="flex flex-col items-start">
                                            <span className={`text-sm font-black uppercase tracking-widest ${isActive ? 'text-rose-600' : 'text-emerald-600'}`}>
                                                {isActive ? 'Maintenance Mode' : 'System Public'}
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-400">Click to Toggle</span>
                                        </div>
                                        <div className={`w-3 h-3 rounded-full shadow-lg ${isActive ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                    </button>
                                );
                            })()}
                        </section>

                        <div className="h-px bg-slate-50"></div>

                        <section>
                            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-4">Update Database Setting</h2>
                            <form onSubmit={handleUpdateSetting} className="space-y-4">
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">Key</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-bold focus:ring-2 focus:ring-indigo-100"
                                        placeholder="LIMIT_FREE_MAX_POSTS"
                                        value={key}
                                        onChange={e => setKey(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[8px] font-black text-slate-400 mb-1 uppercase tracking-widest">Value</label>
                                    <textarea
                                        required
                                        rows={2}
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-100"
                                        placeholder="New value..."
                                        value={value}
                                        onChange={e => setValue(e.target.value)}
                                    />
                                </div>
                                <div className="flex items-center justify-between gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="w-3 h-3 rounded text-indigo-600"
                                            checked={isEncrypted}
                                            onChange={e => setIsEncrypted(e.target.checked)}
                                        />
                                        <span className="text-[8px] font-black text-slate-500 uppercase">Encrypt</span>
                                    </label>
                                    <button
                                        type="submit"
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                                    >
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>

                    <div className="p-8 bg-indigo-600 rounded-[2.5rem] shadow-xl shadow-indigo-200 text-white relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700"></div>
                        <h2 className="text-xl font-black mb-1">Global Health</h2>
                        <p className="text-indigo-200 text-[10px] font-bold mb-6">Service Response Status</p>

                        <div className="space-y-4">
                            {[
                                { name: 'AutoGrowth API', status: 'Stable', ping: '12ms' },
                                { name: 'Compute Engine', status: 'Stable', ping: '45ms' },
                                { name: 'Auth Gateway', status: 'Stable', ping: '8ms' }
                            ].map(serv => (
                                <div key={serv.name} className="flex items-center justify-between gap-4 p-3 bg-white/5 rounded-xl border border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-tight">{serv.name}</div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-black text-emerald-300">{serv.ping}</span>
                                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full"></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}

// Add simple CSS for scrollbar to the artifact if needed, but Tailwind classes generally handle basics.
