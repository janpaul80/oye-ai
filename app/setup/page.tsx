'use client';

import { useState, useEffect } from 'react';

export default function SetupPage() {
  const [settings, setSettings] = useState<any>({
    businessName: '',
    niche: '',
    aiInstructions: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch('/api/business');
        if (res.ok) {
          const data = await res.json();
          // Map API fields to UI fields
          setSettings({
            businessName: data.business_name || '',
            niche: data.niche || '',
            aiInstructions: data.instructions || '',
          });
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to load settings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  async function saveSettings() {
    setSaving(true);
    try {
      // Map UI fields to API fields
      const apiData = {
        business_name: settings.businessName,
        niche: settings.niche,
        instructions: settings.aiInstructions,
      };
      const res = await fetch('/api/business', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiData),
      });
      if (res.ok) {
        alert('Settings saved!');
      }
    } catch (err) {
      console.error('Failed to save settings', err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <p className="text-gray-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold">Setup</h1>
          <p className="text-gray-400 text-sm">Configure your business</p>
        </div>
      </div>

      <div className="flex-1 p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">Business Name</label>
            <input
              type="text"
              value={settings.businessName || ''}
              onChange={(e) => setSettings({ ...settings, businessName: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              placeholder="Your business name"
            />
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">Niche</label>
            <select
              value={settings.niche || ''}
              onChange={(e) => setSettings({ ...settings, niche: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
            >
              <option value="">Select niche...</option>
              <option value="Salon">Salon</option>
              <option value="Restaurant">Restaurant</option>
              <option value="Gym">Gym</option>
              <option value="Dentist">Dentist</option>
              <option value="Medical">Medical</option>
              <option value="Retail">Retail</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium mb-2">AI Instructions</label>
            <textarea
              value={settings.aiInstructions || ''}
              onChange={(e) => setSettings({ ...settings, aiInstructions: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white h-32"
              placeholder="Instructions for your AI receptionist..."
            />
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="w-full px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>

          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Demo Mode</h2>
            <p className="text-gray-400 text-sm">
              Currently running in demo mode. To go live, you'll need:
            </p>
            <ul className="mt-2 text-gray-500 text-sm space-y-1">
              <li>• Meta WhatsApp Business API credentials</li>
              <li>• OpenAI API key</li>
              <li>• Stripe account (for payments)</li>
              <li>• Supabase (for production data)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}