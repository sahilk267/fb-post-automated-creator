import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { listAuditLogs, type AuditLog } from '../api/audit';

export default function AuditLogs() {
  const { userId } = useAuth();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId === null) return;
    listAuditLogs(userId, { limit: 100 })
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Audit Logs</h1>
      {loading ? (
        <p className="text-slate-500">Loading...</p>
      ) : logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-500">
          No audit logs.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Time</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Action</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Entity</th>
                <th className="text-left px-4 py-3 font-medium text-slate-700">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{new Date(log.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3 font-medium">{log.action}</td>
                  <td className="px-4 py-3">{log.entity_type}{log.entity_id != null ? ` #${log.entity_id}` : ''}</td>
                  <td className="px-4 py-3 text-slate-600">{log.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
