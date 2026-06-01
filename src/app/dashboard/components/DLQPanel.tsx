import React, { useState, useEffect } from 'react';

export default function DLQPanel({ activeOrgId, isDegradedMode }: { activeOrgId: string, isDegradedMode: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = () => {
    if (isDegradedMode) {
      setLogs([{
        id: 'mock-dlq-uuid-1',
        queue_name: 'ai.cascade_inference',
        error_reason: 'AI Provider timeout (>15s). Fallback provider also failed.',
        retry_count: 3,
        status: 'pending',
        created_at: new Date().toISOString()
      }]);
      setLoading(false);
      return;
    }
    
    fetch(`/api/queues/dlq?orgId=${activeOrgId}`)
      .then(res => res.json())
      .then(data => { setLogs(data.data || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  };

  useEffect(() => {
    fetchLogs();
  }, [activeOrgId, isDegradedMode]);

  const updateStatus = async (id: string, status: string) => {
    if (isDegradedMode) {
      setLogs(prev => prev.filter(l => l.id !== id));
      return;
    }
    try {
      await fetch('/api/queues/dlq', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dlqId: id, orgId: activeOrgId, status })
      });
      fetchLogs();
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) return <div className="text-zinc-500 text-xs text-center py-10">Cargando Dead Letter Queue (DLQ)...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          <span className="text-red-400">💀</span> Dead Letter Queue
        </h3>
        <p className="text-xs text-zinc-400 mt-1">Jobs y mensajes fallidos que agotaron sus reintentos máximos y requieren resolución manual.</p>
      </div>
      
      <div className="bg-[#121215] border border-white/[0.04] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/[0.04] text-zinc-400 font-medium">
              <th className="p-3">Job ID / Fecha</th>
              <th className="p-3">Queue Route</th>
              <th className="p-3">Razón de Fallo</th>
              <th className="p-3">Reintentos</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                <td className="p-3 font-mono text-zinc-300">
                  {log.id.slice(0, 8)}<br/>
                  <span className="text-zinc-500">{new Date(log.created_at).toLocaleString()}</span>
                </td>
                <td className="p-3 text-pink-400 font-mono">{log.queue_name}</td>
                <td className="p-3 text-zinc-300 max-w-[300px] truncate" title={log.error_reason}>{log.error_reason}</td>
                <td className="p-3 text-orange-400 text-center">{log.retry_count}</td>
                <td className="p-3">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => updateStatus(log.id, 'replayed')}
                      className="px-3 py-1.5 bg-white/5 hover:bg-white/15 rounded text-white transition-colors border border-white/10"
                    >
                      Reintentar
                    </button>
                    <button 
                      onClick={() => updateStatus(log.id, 'archived')}
                      className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded transition-colors border border-red-500/20"
                    >
                      Ignorar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-zinc-500 font-medium text-sm">
                  <div className="text-3xl mb-2">🎉</div>
                  El Dead Letter Queue está vacío.<br/>
                  <span className="text-xs font-normal">Todos los procesos asíncronos están fluyendo correctamente.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
