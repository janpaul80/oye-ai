'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface Message {
  id: string;
  direction: string;
  content: string;
  created_at: string;
  sender_type: string;
}

interface Customer {
  id: string;
  phone: string;
  name: string;
  niche: string;
  score: number;
  notes: string;
  created_at: string;
}

export default function ConversationPage() {
  const params = useParams();
  const router = useRouter();
  const phone = params?.phone as string || '';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchConversation() {
      try {
        const [customerRes, messagesRes] = await Promise.all([
          fetch(`/api/inbox/leads`),
          fetch(`/api/inbox/messages/${encodeURIComponent(phone)}`),
        ]);
        
        if (customerRes.ok) {
          const leads = await customerRes.json();
          const lead = leads.find((l: any) => l.phone === phone);
          if (lead) setCustomer(lead);
        }
        
        if (messagesRes.ok) {
          const msgs = await messagesRes.json();
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load conversation', err);
      } finally {
        setLoading(false);
      }
    }
    fetchConversation();
  }, [phone]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendReply = async () => {
    if (!reply.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/chat/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: reply, phone }),
      });
      if (res.ok) {
        const newMsg = {
          id: 'msg_' + Date.now(),
          direction: 'outbound',
          content: reply,
          created_at: new Date().toISOString(),
          sender_type: 'operator',
        };
        setMessages([...messages, newMsg]);
        setReply('');
      }
    } catch (err) {
      console.error('Failed to send reply', err);
    } finally {
      setSending(false);
    }
  };

  const markResolved = async () => {
    try {
      await fetch('/api/inbox/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, status: 'resolved' }),
      });
      alert('Marked as resolved');
    } catch (err) {
      console.error('Failed to resolve', err);
    }
  };

  const [newNote, setNewNote] = useState('');
  
  const addNote = async () => {
    if (!newNote.trim()) return;
    try {
      await fetch('/api/inbox/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, note: newNote }),
      });
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note', err);
    }
  };

  const markFollowUp = () => {
    // TODO: Implement follow-up
    alert('Mark for follow-up - coming soon');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white p-6">
        <p className="text-gray-400">Loading conversation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <button onClick={() => router.back()} className="text-gray-400 hover:text-white text-sm mb-2">
              ← Back to Inbox
            </button>
            <h1 className="text-xl font-bold">{customer?.name || phone}</h1>
            <p className="text-gray-400 text-sm">{phone}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={markResolved} className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-sm">
              Resolve
            </button>
            <button onClick={markFollowUp} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-sm">
              Follow-up
            </button>
          </div>
        </div>
      </div>

      {/* Customer Info Bar */}
      {customer && (
        <div className="border-b border-gray-800 bg-gray-900/50 p-2">
          <div className="max-w-4xl mx-auto flex gap-6 text-sm">
            <span>Niche: <span className="text-gray-300">{customer.niche || 'Not set'}</span></span>
            <span>Score: <span className={customer.score >= 70 ? 'text-green-400' : 'text-gray-400'}>{customer.score}</span></span>
            <span>Since: <span className="text-gray-300">{new Date(customer.created_at).toLocaleDateString()}</span></span>
          </div>
        </div>
      )}

      {/* Notes Section */}
      <div className="border-b border-gray-800 p-2 bg-gray-900/30">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addNote()}
            placeholder="Add note..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm text-white placeholder-gray-500"
          />
          <button onClick={addNote} className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-sm">
            Add Note
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No messages yet</div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.direction === 'inbound' ? 'justify-start' : 'justify-end'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-2 ${
                    msg.direction === 'inbound'
                      ? 'bg-gray-800 text-white'
                      : msg.sender_type === 'operator'
                        ? 'bg-green-600 text-white'
                        : 'bg-blue-600 text-white'
                  }`}
                >
                  <p>{msg.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {new Date(msg.created_at).toLocaleString()} • {msg.sender_type === 'operator' ? 'You' : msg.sender_type}
                  </p>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEnd} />
        </div>
      </div>

      {/* Reply Input */}
      <div className="border-t border-gray-800 p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <input
            type="text"
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendReply()}
            placeholder="Type a reply..."
            className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-green-500"
            disabled={sending}
          />
          <button
            onClick={sendReply}
            disabled={!reply.trim() || sending}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 rounded-lg font-medium"
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}