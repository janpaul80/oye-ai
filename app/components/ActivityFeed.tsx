'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  type: string;
  description: string;
  phone?: string;
  created_at: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const [leadsRes, bookingsRes] = await Promise.all([
          fetch('/api/inbox/leads'),
          fetch('/api/bookings'),
        ]);
        
        if (leadsRes.ok && bookingsRes.ok) {
          const leads = await leadsRes.json();
          const bookings = await bookingsRes.json();
          
          const feed: Activity[] = [];
          
          leads.forEach((lead: any) => {
            feed.push({
              id: `lead-${lead.id}`,
              type: 'lead',
              description: `New lead: ${lead.name || lead.phone}`,
              created_at: lead.created_at,
            });
          });
          
          bookings.forEach((apt: any) => {
            feed.push({
              id: `apt-${apt.id}`,
              type: 'booking',
              description: `Booking: ${apt.date} at ${apt.time}`,
              created_at: apt.created_at,
            });
          });
          
          feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
          setActivities(feed.slice(0, 20));
        }
      } catch (err) {
        console.error('Failed to load activity', err);
      } finally {
        setLoading(false);
      }
    }
    fetchActivity();
  }, []);

  if (loading) {
    return <p className="text-gray-500 text-sm">Loading activity...</p>;
  }

  return (
    <div className="space-y-2">
      {activities.length === 0 ? (
        <p className="text-gray-500 text-sm">No recent activity</p>
      ) : (
        activities.map((activity) => (
          <div key={activity.id} className="flex items-start gap-2 text-sm">
            <span className={`w-2 h-2 rounded-full mt-1.5 ${
              activity.type === 'lead' ? 'bg-green-500' : 'bg-blue-500'
            }`} />
            <div>
              <p>{activity.description}</p>
              <p className="text-gray-500 text-xs">
                {new Date(activity.created_at).toLocaleString()}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}