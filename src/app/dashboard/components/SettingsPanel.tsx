import React, { useState, useEffect } from 'react';

export default function SettingsPanel({ activeOrgId, isDegradedMode }: { activeOrgId: string, isDegradedMode: boolean }) {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (isDegradedMode) {
      setSettings({
        working_hours_start: '09:00',
        working_hours_end: '18:00',
        working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        default_provider: 'langdock',
        sla_hours: 4
      });
      setLoading(false);
      return;
    }

    fetch(`/api/organizations/settings?orgId=${activeOrgId}`)
      .then(res => res.json())
      .then(data => {
        setSettings(data.data || {
          working_hours_start: '09:00',
          working_hours_end: '18:00',
          working_days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
          default_provider: 'langdock',
          sla_hours: 4
        });
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [activeOrgId, isDegradedMode]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage('');
    
    if (isDegradedMode) {
      setTimeout(() => {
        setIsSaving(false);
        setSaveMessage('Configuración guardada (Modo Local).');
      }, 500);
      return;
    }

    try {
      const res = await fetch('/api/organizations/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrgId, ...settings })
      });
      const data = await res.json();
      if (data.error) {
        setSaveMessage(`Error: ${data.error}`);
      } else {
        setSaveMessage('Configuración actualizada exitosamente.');
      }
    } catch (err: any) {
      setSaveMessage('Error de red al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day: string) => {
    setSettings((prev: any) => {
      const days = prev.working_days || [];
      if (days.includes(day)) {
        return { ...prev, working_days: days.filter((d: string) => d !== day) };
      }
      return { ...prev, working_days: [...days, day] };
    });
  };

  if (loading) return <div className="text-zinc-500 text-xs text-center py-10">Cargando Configuración...</div>;
  if (!settings) return null;

  const weekDays = [
    { id: 'Sun', label: 'Dom' }, { id: 'Mon', label: 'Lun' }, { id: 'Tue', label: 'Mar' },
    { id: 'Wed', label: 'Mié' }, { id: 'Thu', label: 'Jue' }, { id: 'Fri', label: 'Vie' },
    { id: 'Sat', label: 'Sáb' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-white text-sm font-bold flex items-center gap-2">
          <span className="text-[#00a884]">⚙️</span> Configuración de la Organización
        </h3>
        <p className="text-xs text-zinc-400 mt-1">Parámetros operativos globales que dictan el comportamiento de la IA y SLAs.</p>
      </div>
      
      <form onSubmit={handleSave} className="bg-[#121215] border border-white/[0.04] rounded-xl p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-4">
            <h4 className="text-xs text-zinc-300 font-bold uppercase tracking-wider border-b border-white/[0.04] pb-2">Horario de Atención</h4>
            
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-400 mb-1">Hora Inicio</label>
                <input 
                  type="time" 
                  value={settings.working_hours_start}
                  onChange={(e) => handleChange('working_hours_start', e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded px-3 py-2 text-white text-xs outline-none focus:border-[#00a884]/50"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] text-zinc-400 mb-1">Hora Fin</label>
                <input 
                  type="time" 
                  value={settings.working_hours_end}
                  onChange={(e) => handleChange('working_hours_end', e.target.value)}
                  className="w-full bg-white/[0.02] border border-white/10 rounded px-3 py-2 text-white text-xs outline-none focus:border-[#00a884]/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-2">Días Laborables</label>
              <div className="flex gap-2">
                {weekDays.map(day => {
                  const isActive = (settings.working_days || []).includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => toggleDay(day.id)}
                      className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-[#00a884]/15 text-[#00a884] border border-[#00a884]/40' 
                          : 'bg-white/[0.02] text-zinc-500 border border-white/5 hover:border-white/20'
                      }`}
                    >
                      {day.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-zinc-500 mt-2">Fuera de estos horarios, los mensajes entrantes recibirán la plantilla "Fuera de Horario" (OOH).</p>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-xs text-zinc-300 font-bold uppercase tracking-wider border-b border-white/[0.04] pb-2">Motor AI & SLAs</h4>
            
            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">Proveedor LLM por Defecto</label>
              <select 
                value={settings.default_provider}
                onChange={(e) => handleChange('default_provider', e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded px-3 py-2 text-white text-xs outline-none focus:border-[#00a884]/50 [&>option]:bg-[#121215]"
              >
                <option value="langdock">Langdock (Recomendado)</option>
                <option value="openai">OpenAI Fallback</option>
                <option value="anthropic">Anthropic Fallback</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] text-zinc-400 mb-1">SLA Global de Resolución (Horas)</label>
              <input 
                type="number" 
                value={settings.sla_hours}
                onChange={(e) => handleChange('sla_hours', parseInt(e.target.value))}
                min="1" max="72"
                className="w-full bg-white/[0.02] border border-white/10 rounded px-3 py-2 text-white text-xs outline-none focus:border-[#00a884]/50"
              />
              <p className="text-[10px] text-zinc-500 mt-2">Tiempo límite para que un agente resuelva tickets marcados como urgentes o escalados.</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-white/[0.04] pt-4">
          <div className="text-xs text-emerald-400 font-medium">
            {saveMessage}
          </div>
          <button 
            type="submit" 
            disabled={isSaving}
            className="px-6 py-2.5 bg-[#00a884] hover:bg-[#009675] text-white font-bold text-xs rounded transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSaving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </form>
    </div>
  );
}
