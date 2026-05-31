'use client';

import { useState, useEffect } from 'react';

export default function AnalyticsPage() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const [statsRes, bookingsRes] = await Promise.all([
          fetch('/api/inbox/stats'),
          fetch('/api/bookings'),
        ]);
        
        if (statsRes.ok && bookingsRes.ok) {
          const statsData = await statsRes.json();
          const bookingsData = await bookingsRes.json();
          
          setStats({
            ...statsData,
            totalBookings: bookingsData.length,
            confirmedBookings: bookingsData.filter((b: any) => b.status === 'confirmed').length,
          });
        }
      } catch (err) {
        console.error('Failed to load analytics', err);
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <p className="text-gray-400">Loading analytics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className="text-gray-400 text-sm">30-day metrics</p>
        </div>
      </div>

      {/* Metrics */}
      <div className="flex-1 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Total Leads</p>
              <p className="text-3xl font-bold">{stats?.totalLeads || 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">New Today</p>
              <p className="text-3xl font-bold text-green-400">{stats?.newToday || 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Qualified</p>
              <p className="text-3xl font-bold text-blue-400">{stats?.qualified || 0}</p>
            </div>
            <div className="bg-gray-900 rounded-lg p-4">
              <p className="text-gray-400 text-sm">Bookings</p>
              <p className="text-3xl font-bold">{stats?.totalBookings || 0}</p>
            </div>
          </div>

          {/* Charts placeholder */}
          <div className="bg-gray-900 rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Performance</h2>
            <div className="h-48 flex items-center justify-center text-gray-500">
              <p>Charts coming soon</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}