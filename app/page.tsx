'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import ActivityFeed from './components/ActivityFeed';

interface Stats {
  totalLeads: number;
  newToday: number;
  qualified: number;
  conversations: number;
  messages: number;
  appointments: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/inbox/stats');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold">OYE AI Dashboard</h1>
          <p className="text-gray-400">Business overview</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Link href="/inbox" className="block bg-gray-900 hover:bg-gray-800 rounded-lg p-4 transition-colors">
            <p className="text-gray-400 text-sm">Total Leads</p>
            <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
          </Link>
          <Link href="/inbox" className="block bg-gray-900 hover:bg-gray-800 rounded-lg p-4 transition-colors">
            <p className="text-gray-400 text-sm">New Today</p>
            <p className="text-3xl font-bold text-green-400">{stats?.newToday || 0}</p>
          </Link>
          <Link href="/inbox" className="block bg-gray-900 hover:bg-gray-800 rounded-lg p-4 transition-colors">
            <p className="text-gray-400 text-sm">Qualified</p>
            <p className="text-3xl font-bold text-blue-400">{stats?.qualified || 0}</p>
          </Link>
          <div className="bg-gray-900 rounded-lg p-4">
            <p className="text-gray-400 text-sm">Conversations</p>
            <p className="text-3xl font-bold">{stats?.conversations || 0}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
          <div className="flex gap-4">
            <Link href="/inbox" className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium">
              Open Inbox
            </Link>
          </div>
        </div>

        {/* Activity Feed */}
        <div className="bg-gray-900 rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}