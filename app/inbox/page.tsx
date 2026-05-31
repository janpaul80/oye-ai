'use client';

import { useState, useEffect } from 'react';

interface Lead {
  id: string;
  phone: string;
  name: string;
  niche: string;
  score: number;
  created_at: string;
  last_message_at: string;
  notes: string;
}

interface Stats {
  totalLeads: number;
  newToday: number;
  qualified: number;
  conversations: number;
  messages: number;
  appointments: number;
}

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [leadsRes, statsRes] = await Promise.all([
          fetch('/api/inbox/leads'),
          fetch('/api/inbox/stats'),
        ]);
        
        if (leadsRes.ok) {
          const data = await leadsRes.json();
          setLeads(data);
        }
        if (statsRes.ok) {
          const data = await statsRes.json();
          setStats(data);
        }
      } catch (err) {
        setError('Failed to load inbox');
      } finally {
        setLoading(false);
      }
    }
    
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Inbox</h1>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl font-bold mb-6">Inbox</h1>
          <p className="text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-gray-400">Business messaging & leads</p>
        </header>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Leads</p>
              <p className="text-2xl font-bold">{stats.totalLeads}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">New Today</p>
              <p className="text-2xl font-bold text-green-400">{stats.newToday}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Qualified</p>
              <p className="text-2xl font-bold text-blue-400">{stats.qualified}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Conversations</p>
              <p className="text-2xl font-bold">{stats.conversations}</p>
            </div>
          </div>
        )}

        {/* Leads List */}
        <div className="bg-gray-900 rounded-lg overflow-hidden">
          <div className="p-4 border-b border-gray-800">
            <h2 className="font-semibold">Recent Leads</h2>
          </div>
          {leads.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              No leads yet. Send a message to /api/demo/webhook to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-800">
              {leads.map((lead) => (
                <div key={lead.id} className="p-4 flex items-center justify-between hover:bg-gray-800/50">
                  <div>
                    <p className="font-medium">{lead.name || lead.phone}</p>
                    <p className="text-gray-400 text-sm">{lead.niche} • {lead.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${lead.score >= 70 ? 'text-green-400' : 'text-gray-400'}`}>
                      {lead.score}
                    </p>
                    <p className="text-gray-500 text-xs">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Demo Instruction */}
        <div className="mt-8 p-4 bg-gray-900 rounded-lg">
          <p className="text-gray-400 text-sm">
            <span className="text-green-400">Demo Mode:</span> Send POST to{' '}
            <code className="text-gray-300">/api/demo/webhook</code> with{' '}
            <code className="text-gray-300">{"{ from, body }"}</code> to create leads.
          </p>
        </div>
      </div>
    </div>
  );
}