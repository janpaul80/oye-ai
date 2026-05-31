'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Lead {
  id: string;
  phone: string;
  name: string;
  niche: string;
  score: number;
  created_at: string;
  last_message_at: string;
  notes: string;
  unread?: number;
}

export default function InboxPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'new' | 'qualified'>('all');

  useEffect(() => {
    async function fetchLeads() {
      try {
        const res = await fetch('/api/inbox/leads');
        if (res.ok) {
          const data = await res.json();
          setLeads(data);
        }
      } catch (err) {
        console.error('Failed to load leads', err);
      } finally {
        setLoading(false);
      }
    }
    fetchLeads();
    const interval = setInterval(fetchLeads, 30000);
    return () => clearInterval(interval);
  }, []);

  const filtered = leads.filter(l => {
    const matchSearch = !search || 
      l.name?.toLowerCase().includes(search.toLowerCase()) ||
      l.phone?.includes(search) ||
      l.niche?.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === 'all' || 
      (filter === 'new' && new Date(l.created_at) > new Date(Date.now() - 86400000)) ||
      (filter === 'qualified' && l.score >= 70);
    return matchSearch && matchFilter;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading inbox...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Inbox</h1>
          <p className="text-gray-400">{leads.length} conversations</p>
        </div>

        {/* Search & Filter */}
        <div className="flex gap-4 mb-6">
          <input
            type="text"
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
          />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white focus:outline-none"
          >
            <option value="all">All</option>
            <option value="new">New Today</option>
            <option value="qualified">Qualified (70+)</option>
          </select>
        </div>

        {/* Leads List */}
        <div className="space-y-2">
          {filtered.length === 0 ? (
            <div className="bg-gray-900 rounded-lg p-8 text-center text-gray-400">
              No conversations. Send a message to test.
            </div>
          ) : (
            filtered.map((lead) => (
              <Link
                key={lead.id}
                href={`/inbox/${encodeURIComponent(lead.phone)}`}
                className="block bg-gray-900 hover:bg-gray-800 rounded-lg p-4 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-white">{lead.name || lead.phone}</span>
                      {lead.score >= 70 && (
                        <span className="text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">Qualified</span>
                      )}
                      {lead.unread ? (
                        <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded-full">{lead.unread}</span>
                      ) : null}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">
                      {lead.niche} • {lead.phone}
                    </p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    {new Date(lead.created_at).toLocaleDateString()}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </div>
  );
}