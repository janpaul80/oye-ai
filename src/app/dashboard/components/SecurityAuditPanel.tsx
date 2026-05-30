import React, { useState, useEffect } from 'react';

export default function SecurityAuditPanel({ activeOrgId, isDegradedMode }: { activeOrgId: string, isDegradedMode: boolean }) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDegradedMode) {
      setLogs([
        {
          id: 'mock-audit-1',
          action: 'security.whatsapp_rate_limited',
          details: { ip: '192.168.1.100', limit: 120 },
          created_at: new Date().toISOString()
        },
        {
          id: 'mock-audit-2',
          action: 'organization_settings_updated',
          details: { settings: { default_provider: 'openai' } },
          created_at: new Date(Date.now() - 3600000).toISOString()
        }
      ]);
      setLoading(false);
      return;
    }
    
    fetch(`/api/security/audit?orgId=${activeOrgId}`)
      .then(res => res.json())
      .then(data => { setLogs(data.data || []); setLoading(false); })
      .catch(err => { console.error(err); setLoading(false); });
  }, [activeOrgId, isDegradedMode]);

  if (loading) return <div className="text-zinc-500 text-xs text-center py-10">Cargando Security Audit Ledger...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          <span className="text-indigo-400">🛡️</span> Security Ledger & RLS Audit
        </h3>
        <p className="text-xs text-zinc-400 mt-1">Historial inmutable de eventos de seguridad, fallos de firmas de webhooks, rate limiting y actualizaciones administrativas.</p>
      </div>
      
      <div className="bg-[#121215] border border-white/[0.04] rounded-xl overflow-hidden">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-white/[0.02] border-b border-white/[0.04] text-zinc-400 font-medium">
              <th className="p-3 w-1/4">Fecha / Hora</th>
              <th className="p-3 w-1/3">Acción (Evento)</th>
              <th className="p-3 w-5/12">Detalles del Payload</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log: any) => (
              <tr key={log.id} className="border-b border-white/[0.04] hover:bg-white/[0.01]">
                <td className="p-3 text-zinc-400 font-mono">
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="p-3 text-white font-mono">
                  <span className={`px-2 py-1 rounded-sm text-[10px] uppercase font-bold tracking-wider ${
                    log.action.includes('security') || log.action.includes('failure') 
                      ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                      : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-zinc-300 font-mono text-[10px]">
                  <pre className="bg-black/20 p-2 rounded overflow-x-auto border border-white/5">
                    {JSON.stringify(log.details, null, 2)}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={3} className="p-10 text-center text-zinc-500 font-medium text-sm">
                  <div className="text-3xl mb-2">✅</div>
                  No hay eventos de seguridad registrados.<br/>
                  <span className="text-xs font-normal">Todo está en orden.</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
