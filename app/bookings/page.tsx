'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Booking {
  id: string;
  phone: string;
  date: string;
  time: string;
  service?: string;
  status?: string;
  created_at: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ phone: '', date: '', time: '', service: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchBookings() {
      try {
        const res = await fetch('/api/bookings');
        if (res.ok) {
          const data = await res.json();
          setBookings(data);
        }
      } catch (err) {
        console.error('Failed to load bookings', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBookings();
  }, []);

  const createBooking = async () => {
    if (!form.phone || !form.date || !form.time) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const newBooking = await res.json();
        setBookings([...bookings, newBooking]);
        setShowForm(false);
        setForm({ phone: '', date: '', time: '', service: '' });
      }
    } catch (err) {
      console.error('Failed to create booking', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <p className="text-gray-400">Loading bookings...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/" className="text-gray-400 hover:text-white text-sm mb-2 block">
              ← Back
            </Link>
            <h1 className="text-xl font-bold">Bookings</h1>
            <p className="text-gray-400 text-sm">{bookings.length} appointment{bookings.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg font-medium"
          >
            {showForm ? 'Cancel' : '+ New Booking'}
          </button>
        </div>
      </div>

      {/* New Booking Form */}
      {showForm && (
        <div className="border-b border-gray-800 p-4 bg-gray-900/50">
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="Phone (e.g. +1234567890)"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
              />
              <input
                type="text"
                value={form.service}
                onChange={(e) => setForm({ ...form, service: e.target.value })}
                placeholder="Service (optional)"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500"
              />
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
              <input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
              />
            </div>
            <button
              onClick={createBooking}
              disabled={submitting || !form.phone || !form.date || !form.time}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium"
            >
              {submitting ? 'Creating...' : 'Create Booking'}
            </button>
          </div>
        </div>
      )}

      {/* Bookings List */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto">
          {bookings.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No bookings yet
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((booking) => (
                <div
                  key={booking.id}
                  className="bg-gray-900 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium">{booking.phone}</p>
                    <p className="text-gray-400 text-sm">
                      {booking.date} at {booking.time}
                      {booking.service && ` • ${booking.service}`}
                    </p>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    booking.status === 'confirmed' ? 'bg-green-900 text-green-300' :
                    booking.status === 'pending' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-gray-700 text-gray-300'
                  }`}>
                    {booking.status || 'pending'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}