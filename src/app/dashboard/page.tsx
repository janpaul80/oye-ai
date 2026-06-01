'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useTranslation } from '@/components/LanguageContext';
import { isSandboxEnabled, hasSandboxSession, enableSandboxSession } from '@/lib/auth/sandbox';
import DLQPanel from './components/DLQPanel';
import SecurityAuditPanel from './components/SecurityAuditPanel';
import SettingsPanel from './components/SettingsPanel';

// Database Schemas matching 20260519000000_init_schema.sql
interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface DBConversation {
  id: string;
  organization_id: string;
  customer_id: string;
  channel_id: string;
  assigned_agent_id?: string;
  status: 'open' | 'snoozed' | 'closed';
  mode: 'ai' | 'manual' | 'hybrid';
  summary?: string;
  language: 'es' | 'en' | 'pt' | 'fr';
  last_message_at: string;
  created_at: string;
  customers?: DBCustomer;
  priority_level?: 'low' | 'medium' | 'high' | 'critical';
  sla_deadline?: string;
  last_operator_action_at?: string;
  ai_summary?: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | 'mixed';
  lead_score?: number;
  customer_intent?: string;
  interested_service?: string;
  appointment_likelihood?: 'high' | 'medium' | 'low' | 'none';
  suggested_reply?: string;
  suggested_next_action?: string;
  last_analysis_at?: string;
}

interface DBNote {
  id: string;
  organization_id: string;
  conversation_id: string;
  author_id?: string | null;
  body: string;
  created_at: string;
  profiles?: {
    full_name: string;
    email: string;
  };
}

const mockNotesDataset: Record<string, DBNote[]> = {
  'mock-conv-1': [
    {
      id: 'mock-note-1',
      organization_id: '88888888-8888-8888-8888-888888888888',
      conversation_id: 'mock-conv-1',
      author_id: 'mock-user-hartman',
      body: 'El cliente preguntó por reservas. La IA le sugirió hoy a las 5:00 PM.',
      created_at: new Date(Date.now() - 300000).toISOString(),
      profiles: { full_name: 'Hartman Oye (Demo)', email: 'hartman@oye-ai.com' }
    }
  ],
  'mock-conv-2': [
    {
      id: 'mock-note-2',
      organization_id: '88888888-8888-8888-8888-888888888888',
      conversation_id: 'mock-conv-2',
      author_id: 'mock-user-hartman',
      body: 'Conversación en portugués. Se tomó el control porque solicitó un producto fuera del menú standard.',
      created_at: new Date(Date.now() - 1800000).toISOString(),
      profiles: { full_name: 'Hartman Oye (Demo)', email: 'hartman@oye-ai.com' }
    }
  ]
};

const getSlaTimeLeft = (conversation: DBConversation) => {
  if (!conversation.sla_deadline) return null;
  const deadline = new Date(conversation.sla_deadline).getTime();
  const now = Date.now();
  const diff = deadline - now;
  
  if (diff <= 0) {
    return { text: 'EXCEDIDO', isBreached: true, ms: diff };
  }
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  
  if (hours > 0) {
    return { text: `${hours}h ${remMinutes}m`, isBreached: false, ms: diff };
  }
  return { text: `${minutes}m`, isBreached: false, ms: diff };
};

interface DBCustomer {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  custom_attributes: Record<string, any>;
}

interface DBMessage {
  id: string;
  organization_id: string;
  conversation_id: string;
  direction: 'inbound' | 'outbound';
  sender_type: 'customer' | 'agent' | 'ai';
  sender_id?: string;
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'template';
  body: string;
  media_url?: string;
  provider_message_id?: string;
  delivery_status: 'queued' | 'processing' | 'sent' | 'delivered' | 'read' | 'failed' | 'retrying';
  created_at: string;
}

const LEAD_STAGES = ['new', 'contacted', 'qualified', 'appointment_scheduled', 'customer', 'closed_won', 'closed_lost'] as const;
type LeadStage = typeof LEAD_STAGES[number];

interface DBLead {
  id: string;
  organization_id: string;
  customer_id?: string;
  conversation_id?: string;
  stage: LeadStage;
  source?: string;
  attributes: Record<string, any>;
  created_by?: string;
  closed_reason?: string;
  created_at: string;
  updated_at: string;
  customers?: DBCustomer;
  conversations?: DBConversation;
  lead_notes?: DBLeadNote[];
  lead_events?: DBLeadEvent[];
}

interface DBLeadNote {
  id: string;
  organization_id: string;
  lead_id: string;
  author_id?: string;
  body: string;
  created_at: string;
}

interface DBLeadEvent {
  id: string;
  lead_id: string;
  organization_id: string;
  event_type: string;
  payload: Record<string, any>;
  created_at: string;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();

  // Active platform scope state
  const [user, setUser] = useState<Profile | null>(null);
  const [activeOrg, setActiveOrg] = useState<Organization | null>(null);
  const [isDegradedMode, setIsDegradedMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Tab & AI Ops Dashboard state
  const [activeTab, setActiveTab] = useState<'inbox' | 'leads' | 'ai_ops'>('inbox');
  const [aiOpsSubTab, setAiOpsSubTab] = useState<'queue' | 'telemetry' | 'sla' | 'notes' | 'dlq' | 'audit' | 'settings'>('queue');
  const [telemetry, setTelemetry] = useState<any>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [notes, setNotes] = useState<DBNote[]>([]);
  const [newNoteText, setNewNoteText] = useState('');
  const [isTakeoverModalOpen, setIsTakeoverModalOpen] = useState(false);
  const [takeoverConvId, setTakeoverConvId] = useState<string | null>(null);
  const [takeoverPriority, setTakeoverPriority] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [takeoverNote, setTakeoverNote] = useState('');
  const [isSubmittingTakeover, setIsSubmittingTakeover] = useState(false);
  const [tick, setTick] = useState(0);

  // Resolve modal state
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveReason, setResolveReason] = useState('resolved');
  const [resolveNote, setResolveNote] = useState('');
  const [isSubmittingResolve, setIsSubmittingResolve] = useState(false);

  // Data collections state
  const [conversations, setConversations] = useState<DBConversation[]>([]);
  const [messages, setMessages] = useState<DBMessage[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [activeAgentConfig, setActiveAgentConfig] = useState<any>(null);
  const [agents, setAgents] = useState<Array<{ id: string; full_name: string; email: string }>>([]);

  // Interaction inputs & trackers
  const [inputVal, setInputVal] = useState('');
  const [isAiResponding, setIsAiResponding] = useState(false);

  // Leads management state
  const [leads, setLeads] = useState<DBLead[]>([]);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [leadStageFilter, setLeadStageFilter] = useState<LeadStage | 'all'>('all');
  const [leadNotes, setLeadNotes] = useState<DBLeadNote[]>([]);
  const [leadEvents, setLeadEvents] = useState<DBLeadEvent[]>([]);
  const [streamingTokenText, setStreamingTokenText] = useState('');
  const [activeStreamingProvider, setActiveStreamingProvider] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const [liveEvents, setLiveEvents] = useState<string[]>([
    'Iniciando monitor de eventos realtime...',
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat body on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isAiResponding]);

  // 1. Initial Data Fetch & Env Diagnostics
  useEffect(() => {
    async function initDashboard() {
      try {
        // Gated Sandbox Cookie Bypass Check via URL parameter
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          if (params.get('sandbox') === 'true') {
            enableSandboxSession();
          }
        }

        if (hasSandboxSession()) {
          console.warn('[Dashboard] Running in gated Sandbox Mock Mode.');
          setIsDegradedMode(true);
          loadMockDatasets();
          setIsLoading(false);
          return;
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        if (!supabaseUrl || supabaseUrl.includes('missing-supabase-url')) {
          console.warn('[Dashboard] Running in fallback degraded mock state.');
          setIsDegradedMode(true);
          loadMockDatasets();
          setIsLoading(false);
          return;
        }

        const supabase = createClient();

        // Check user session safely and support local sandbox fallback for network issues
        let authUser = null;
        let userErr = null;
        try {
          const { data, error } = await supabase.auth.getUser();
          authUser = data?.user;
          userErr = error;
        } catch (err: any) {
          userErr = err;
        }

        if (userErr) {
          const errMsg = userErr.message || '';
          const isNetworkError = errMsg.includes('Failed to fetch') || errMsg.includes('fetch') || errMsg.includes('NetworkError');
          
          if (isNetworkError && isSandboxEnabled()) {
            console.warn('[Dashboard] Local network error detected. Falling back to Sandbox Mode.');
            setIsDegradedMode(true);
            loadMockDatasets();
            setIsLoading(false);
            return;
          }
          
          console.error('[Dashboard] Authentication check failed:', userErr);
          router.push('/login');
          return;
        }

        if (!authUser) {
          console.warn('[Dashboard] Unauthenticated user session. Redirecting to login.');
          router.push('/login');
          return;
        }

        // Get user Profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single();

        setUser(profile || {
          id: authUser.id,
          email: authUser.email || '',
          full_name: authUser.user_metadata?.full_name || 'Hartman Oye'
        });

        // Get user Memberships & Organizations
        const { data: memberships } = await supabase
          .from('memberships')
          .select('role, organization_id, organizations(*)')
          .eq('user_id', authUser.id);

        if (!memberships || memberships.length === 0) {
          console.warn('[Dashboard] No organizations found for user. Creating mock organization.');
          setActiveOrg({ id: '88888888-8888-8888-8888-888888888888', name: 'Café Delicioso', slug: 'cafe-delicioso' });
          loadMockDatasets();
          setIsLoading(false);
          return;
        }

        const currentMembership = memberships[0];
        const org = currentMembership.organizations as unknown as Organization;
        setActiveOrg(org);

        // Fetch Profiles (Operators)
        const { data: allProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email')
          .limit(10);
          
        if (allProfiles && allProfiles.length > 0) {
          setAgents(allProfiles);
        } else {
          setAgents([
            { id: authUser.id, full_name: profile?.full_name || 'Hartman Oye (Tú)', email: authUser.email || '' },
            { id: 'agent-1-uuid', full_name: 'Alejandro Operator', email: 'alejandro@oye-ai.com' },
            { id: 'agent-2-uuid', full_name: 'Sofía Soporte', email: 'sofia@oye-ai.com' }
          ]);
        }

        // Fetch Conversations joined with Customer
        const { data: convData, error: convErr } = await supabase
          .from('conversations')
          .select('*, customers(*)')
          .eq('organization_id', org.id)
          .order('last_message_at', { ascending: false });

        if (convErr) throw convErr;

        setConversations(convData || []);
        if (convData && convData.length > 0) {
          setSelectedConvId(convData[0].id);
        }

        // Fetch Active AI Agent instructions
        const { data: agent } = await supabase
          .from('ai_agents')
          .select('*')
          .eq('organization_id', org.id)
          .eq('is_active', true)
          .limit(1)
          .single();

        if (agent) {
          setActiveAgentConfig(agent);
        }

        // Fetch leads for this organization
        const { data: leadsData } = await supabase
          .from('leads')
          .select('*, customers(*), conversations(*), lead_notes(*), lead_events(*)')
          .eq('organization_id', org.id)
          .order('created_at', { ascending: false })
          .limit(50);

        if (leadsData) {
          setLeads(leadsData);
          if (leadsData.length > 0) {
            setSelectedLeadId(leadsData[0].id);
          }
        }

        setIsLoading(false);
      } catch (err) {
        console.error('[Dashboard] Initialization critical error:', err);
        setIsDegradedMode(true);
        loadMockDatasets();
        setIsLoading(false);
      }
    }

    initDashboard();
  }, [router]);

  // 2. Fetch messages dynamically when selection changes
  useEffect(() => {
    if (isDegradedMode || !selectedConvId) return;

    async function fetchMessages() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', selectedConvId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        setMessages(data);
      }
    }

    fetchMessages();
  }, [selectedConvId, isDegradedMode]);

  // 2b. Fetch conversation notes whenever selection changes
  useEffect(() => {
    if (!selectedConvId) return;

    if (isDegradedMode) {
      setNotes(mockNotesDataset[selectedConvId] || []);
      return;
    }

    async function fetchNotes() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('conversation_notes')
          .select('*, profiles(full_name, email)')
          .eq('conversation_id', selectedConvId)
          .order('created_at', { ascending: false });

        if (!error && data) {
          const formatted = data.map(d => ({
            ...d,
            profiles: d.profiles ? {
              full_name: (d.profiles as any).full_name,
              email: (d.profiles as any).email
            } : undefined
          }));
          setNotes(formatted);
        }
      } catch (err) {
        console.error('[Dashboard] Error fetching notes:', err);
      }
    }

    fetchNotes();
  }, [selectedConvId, isDegradedMode]);

  // 2c. Fetch lead notes/events when lead is selected
  useEffect(() => {
    if (!selectedLeadId) return;

    async function fetchLeadDetails() {
      const supabase = createClient();
      const notesRes = await supabase
        .from('lead_notes')
        .select('*')
        .eq('lead_id', selectedLeadId)
        .order('created_at', { ascending: false });
      if (!notesRes.error && notesRes.data) setLeadNotes(notesRes.data);

      const eventsRes = await supabase
        .from('lead_events')
        .select('*')
        .eq('lead_id', selectedLeadId)
        .order('created_at', { ascending: false });
      if (!eventsRes.error && eventsRes.data) setLeadEvents(eventsRes.data);
    }

    fetchLeadDetails();
  }, [selectedLeadId]);

  // 2d. Periodic Telemetry Fetching (every 5s)
  useEffect(() => {
    let interval: NodeJS.Timeout;

    async function fetchTelemetry() {
      try {
        const res = await fetch(`/api/telemetry${isDegradedMode ? '?mock=true' : ''}`);
        if (res.ok) {
          const data = await res.json();
          setTelemetry(data);
        }
      } catch (err) {
        console.error('[Dashboard] Failed to fetch telemetry:', err);
      } finally {
        setTelemetryLoading(false);
      }
    }

    fetchTelemetry();
    interval = setInterval(fetchTelemetry, 5000);

    return () => clearInterval(interval);
  }, [isDegradedMode, activeTab]);

  // 2d. SLA timer ticking hook (updates UI counters every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // 3. Supabase Realtime Hook subscriptions
  useEffect(() => {
    if (isDegradedMode || !activeOrg) return;

    const supabase = createClient();
    
    // Listen to incoming messages realtime
    const messageChannel = supabase
      .channel('dashboard-realtime-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${activeOrg.id}`,
        },
        (payload) => {
          const newMsg = payload.new as DBMessage;
          // Append if it matches currently viewed conversation
          if (newMsg.conversation_id === selectedConvId) {
            setMessages(prev => {
              // Reconcile optimistic messages by filtering out temp items with matching text body
              const cleanPrev = prev.filter(m => !(m.id.startsWith('opt-') && m.body === newMsg.body));
              if (cleanPrev.some(m => m.id === newMsg.id || (m.provider_message_id && m.provider_message_id === newMsg.provider_message_id))) {
                return cleanPrev;
              }
              return [...cleanPrev, newMsg];
            });
          }

          // Trigger Live tracker log message update
          const directionBadge = newMsg.direction === 'inbound' ? '📥 Entrante' : '📤 Saliente';
          const typeBadge = newMsg.sender_type === 'ai' ? 'IA' : newMsg.sender_type === 'agent' ? 'Agente' : 'Cliente';
          setLiveEvents(prev => [
            `Nuevo mensaje ${directionBadge} (${typeBadge}) en la conversación.`,
            ...prev.slice(0, 4),
          ]);

          // Refresh conversation list metadata (snippet/timestamp)
          refreshConversationList();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `organization_id=eq.${activeOrg.id}`,
        },
        (payload) => {
          const updatedMsg = payload.new as DBMessage;
          if (updatedMsg.conversation_id === selectedConvId) {
            setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
          }
        }
      )
      .subscribe();

    // Listen to conversation events (updates to assigned agent, mode changes)
    const convChannel = supabase
      .channel('dashboard-realtime-conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
          filter: `organization_id=eq.${activeOrg.id}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updatedConv = payload.new as DBConversation;
            setConversations(prev => prev.map(c => c.id === updatedConv.id ? { ...c, ...updatedConv } : c));
            
            if (updatedConv.id === selectedConvId) {
              setLiveEvents(prev => [
                `Estado cambiado: Modo ${updatedConv.mode.toUpperCase()} activo.`,
                ...prev.slice(0, 4),
              ]);
            }
          } else if (payload.eventType === 'INSERT') {
            refreshConversationList();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(convChannel);
    };
  }, [activeOrg, selectedConvId, isDegradedMode]);

  // Helper to force fetch the conversation list
  async function refreshConversationList() {
    if (!activeOrg || isDegradedMode) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('conversations')
      .select('*, customers(*)')
      .eq('organization_id', activeOrg.id)
      .order('last_message_at', { ascending: false });
    
    if (data) {
      setConversations(data);
    }
  }

  // 4. LOAD MOCK FALLBACK DATASET (Runs if Supabase is unconfigured)
  function loadMockDatasets() {
    setUser({
      id: 'mock-user-hartman',
      email: 'hartman@oye-ai.com',
      full_name: 'Hartman Oye (Demo)'
    });
    setActiveOrg({
      id: '88888888-8888-8888-8888-888888888888',
      name: 'Café Delicioso',
      slug: 'cafe-delicioso'
    });
    setActiveAgentConfig({
      id: 'mock-agent-id',
      name: 'Oye Café Assistant',
      model_provider: 'langdock',
      model_name: 'gpt-4o',
      system_prompt: 'Eres el mesero virtual de Café Delicioso. Responde con calidez y amabilidad en español. Promueve la especialidad de la casa (Café Arábiga Ecuatoriano). Si te piden agendar una mesa, ofréceles reservar mesa hoy a las 5:00 PM o a las 7:30 PM. Si solicitan pagar, genera un enlace de Stripe.',
      temperature: 0.7,
      is_active: true
    });
    setAgents([
      { id: 'mock-user-hartman', full_name: 'Hartman Oye (Tú)', email: 'hartman@oye-ai.com' },
      { id: 'agent-1-uuid', full_name: 'Alejandro Operator', email: 'alejandro@oye-ai.com' },
      { id: 'agent-2-uuid', full_name: 'Sofía Soporte', email: 'sofia@oye-ai.com' }
    ]);

    const mockConvs: DBConversation[] = [
      {
        id: 'mock-conv-1',
        organization_id: '88888888-8888-8888-8888-888888888888',
        customer_id: 'mock-cust-1',
        channel_id: 'whatsapp-mock-id',
        status: 'open',
        mode: 'ai',
        language: 'es',
        last_message_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        priority_level: 'high',
        sla_deadline: new Date(Date.now() + 3200000).toISOString(),
        ai_summary: 'Cliente interesado en reservar mesa. Parece dispuesto a venir hoy.',
        sentiment: 'positive',
        lead_score: 85,
        customer_intent: 'reserva',
        interested_service: 'Reserva de mesa',
        appointment_likelihood: 'high',
        suggested_reply: 'Perfecto, tenemos disponibilidad para hoy a las 5PM y 7:30PM. ¿Cuál prefieres?',
        suggested_next_action: 'Confirmar hora y enviar enlace de reserva',
        last_analysis_at: new Date().toISOString(),
        customers: {
          id: 'mock-cust-1',
          name: 'Juan Pérez',
          phone_number: '+593 99 888 7777',
          custom_attributes: { tags: ['Cliente Frecuente', 'WhatsApp'], notes: 'Prefiere café filtrado sin azúcar.' }
        }
      },
      {
        id: 'mock-conv-2',
        organization_id: '88888888-8888-8888-8888-888888888888',
        customer_id: 'mock-cust-2',
        channel_id: 'whatsapp-mock-id',
        status: 'open',
        mode: 'manual',
        language: 'es',
        last_message_at: new Date(Date.now() - 3600000).toISOString(),
        created_at: new Date(Date.now() - 3600000).toISOString(),
        priority_level: 'critical',
        sla_deadline: new Date(Date.now() - 120000).toISOString(),
        ai_summary: 'Cliente asks about different coffee options. Seems confused about pricing.',
        sentiment: 'neutral',
        lead_score: 45,
        customer_intent: 'consulta',
        interested_service: 'Café premium',
        appointment_likelihood: 'medium',
        suggested_reply: 'Te envío nuestro menú de cafés especiales con precios.',
        suggested_next_action: 'Share pricing menu',
        customers: {
          id: 'mock-cust-2',
          name: 'Maria Souza',
          phone_number: '+55 11 99999 8888',
          custom_attributes: { tags: ['Extranjero', 'VIP'], notes: 'Habla portugués y español.' }
        }
      }
    ];

    setConversations(mockConvs);
    setSelectedConvId('mock-conv-1');

    // Mock leads dataset
    const mockLeads: DBLead[] = [
      {
        id: 'mock-lead-1',
        organization_id: '88888888-8888-8888-8888-888888888888',
        customer_id: 'mock-cust-1',
        conversation_id: 'mock-conv-1',
        stage: 'new',
        source: 'whatsapp',
        attributes: {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        customers: {
          id: 'mock-cust-1',
          name: 'Juan Pérez',
          phone_number: '+593 99 888 7777',
          custom_attributes: {}
        }
      },
      {
        id: 'mock-lead-2',
        organization_id: '88888888-8888-8888-8888-888888888888',
        customer_id: 'mock-cust-2',
        conversation_id: 'mock-conv-2',
        stage: 'contacted',
        source: 'whatsapp',
        attributes: { priority: 'high' },
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
        customers: {
          id: 'mock-cust-2',
          name: 'Maria Souza',
          phone_number: '+55 11 99999 8888',
          custom_attributes: {}
        }
      },
      {
        id: 'mock-lead-3',
        organization_id: '88888888-8888-8888-8888-888888888888',
        stage: 'qualified',
        source: 'website',
        attributes: { budget: 5000 },
        created_at: new Date(Date.now() - 172800000).toISOString(),
        updated_at: new Date(Date.now() - 7200000).toISOString()
      },
      {
        id: 'mock-lead-4',
        organization_id: '88888888-8888-8888-8888-888888888888',
        stage: 'appointment_scheduled',
        source: 'whatsapp',
        attributes: { appointment_date: '2026-06-01T17:00:00Z' },
        created_at: new Date(Date.now() - 259200000).toISOString(),
        updated_at: new Date(Date.now() - 259200000).toISOString()
      },
      {
        id: 'mock-lead-5',
        organization_id: '88888888-8888-8888-8888-888888888888',
        stage: 'customer',
        source: 'referral',
        attributes: { ltv: 1200 },
        created_at: new Date(Date.now() - 604800000).toISOString(),
        updated_at: new Date(Date.now() - 604800000).toISOString()
      },
      {
        id: 'mock-lead-6',
        organization_id: '88888888-8888-8888-8888-888888888888',
        stage: 'closed_lost',
        source: 'whatsapp',
        attributes: { lost_reason: 'budget' },
        created_at: new Date(Date.now() - 432000000).toISOString(),
        updated_at: new Date(Date.now() - 432000000).toISOString()
      }
    ];
    setLeads(mockLeads);
    setSelectedLeadId('mock-lead-1');

    setMessages([
      {
        id: 'mock-msg-1',
        organization_id: '88888888-8888-8888-8888-888888888888',
        conversation_id: 'mock-conv-1',
        direction: 'inbound',
        sender_type: 'customer',
        message_type: 'text',
        body: 'Hola, buenas tardes.',
        delivery_status: 'read',
        created_at: new Date(Date.now() - 900000).toISOString()
      },
      {
        id: 'mock-msg-2',
        organization_id: '88888888-8888-8888-8888-888888888888',
        conversation_id: 'mock-conv-1',
        direction: 'outbound',
        sender_type: 'ai',
        message_type: 'text',
        body: '¡Hola! Bienvenido a Café Delicioso ⚡. Soy tu mesero virtual autónomo. ¿En qué te puedo servir hoy? Te recomiendo nuestra especialidad: el riquísimo Café Arábiga Ecuatoriano.',
        delivery_status: 'read',
        created_at: new Date(Date.now() - 800000).toISOString()
      },
      {
        id: 'mock-msg-3',
        organization_id: '88888888-8888-8888-8888-888888888888',
        conversation_id: 'mock-conv-1',
        direction: 'inbound',
        sender_type: 'customer',
        message_type: 'text',
        body: '¿Tienen disponibilidad para reservar mesa hoy?',
        delivery_status: 'read',
        created_at: new Date(Date.now() - 60000).toISOString()
      }
    ]);
  }

  const handleInterruptAi = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsAiResponding(false);
      setStreamingTokenText('');
      setLiveEvents(prev => [
        '⚠️ Generación de IA interrumpida por el operador.',
        ...prev.slice(0, 4)
      ]);
      console.log('[Dashboard] AI generation interrupted by operator.');
    }
  };

  const triggerAiStream = async (userPrompt: string) => {
    setIsAiResponding(true);
    setStreamingTokenText('');
    setActiveStreamingProvider(activeAgentConfig?.model_provider || 'langdock');

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: userPrompt }],
          preferredProvider: activeAgentConfig?.model_provider || 'langdock',
          modelName: activeAgentConfig?.model_name || 'gpt-4o-mini',
          temperature: activeAgentConfig?.temperature || 0.7,
          orgId: activeOrg?.id || '88888888-8888-8888-8888-888888888888'
        }),
        signal: abortController.signal
      });

      if (!response.body) throw new Error('No stream body');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const parsed = JSON.parse(line.substring(6));
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingTokenText(accumulated);
              }
            } catch (e) {
              // Ignore
            }
          }
        }
      }

      if (!abortController.signal.aborted) {
        const aiResponse: DBMessage = {
          id: `mock-msg-ai-${Date.now()}`,
          organization_id: activeOrg?.id || '88888888-8888-8888-8888-888888888888',
          conversation_id: selectedConvId!,
          direction: 'outbound',
          sender_type: 'ai',
          message_type: 'text',
          body: accumulated || 'Respuesta de IA generada.',
          delivery_status: 'read',
          created_at: new Date().toISOString()
        };
        setMessages(prev => [...prev, aiResponse]);
      }
    } catch (err: any) {
      console.warn('[Dashboard AI Stream] Streaming aborted or failed:', err.message);
    } finally {
      setIsAiResponding(false);
      setStreamingTokenText('');
      abortControllerRef.current = null;
    }
  };

  // 5. Send outbound reply integration
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim() || !selectedConvId || !activeOrg) return;

    const typedText = inputVal;
    setInputVal('');

    const timeStr = new Date().toISOString();

    if (isDegradedMode) {
      // Mock flow
      const mockMsg: DBMessage = {
        id: `mock-msg-${Date.now()}`,
        organization_id: activeOrg.id,
        conversation_id: selectedConvId,
        direction: 'outbound',
        sender_type: 'agent',
        message_type: 'text',
        body: typedText,
        delivery_status: 'sent',
        created_at: timeStr
      };

      setMessages(prev => [...prev, mockMsg]);

      // Mock AI confirmation if in AI Auto mode
      const activeConv = conversations.find(c => c.id === selectedConvId);
      if (activeConv && activeConv.mode === 'ai') {
        triggerAiStream(typedText);
      }
      return;
    }

    const tempId = `opt-msg-${Date.now()}`;
    const optimisticMsg: DBMessage = {
      id: tempId,
      organization_id: activeOrg.id,
      conversation_id: selectedConvId,
      direction: 'outbound',
      sender_type: 'agent',
      message_type: 'text',
      body: typedText,
      delivery_status: 'queued', // show queued/sending status immediately in UI
      created_at: timeStr
    };

    // Pre-insert the optimistic message into UI state immediately
    setMessages(prev => [...prev, optimisticMsg]);

    try {
      const supabase = createClient();
      
      // Fetch currently active user session safely
      const { data: { session } } = await supabase.auth.getSession();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          organization_id: activeOrg.id,
          conversation_id: selectedConvId,
          direction: 'outbound',
          sender_type: 'agent',
          sender_id: session?.user?.id || null,
          message_type: 'text',
          body: typedText,
          delivery_status: 'sent'
        });

      if (error) throw error;

      // Stream AI response if active mode is AI Auto
      const activeConv = conversations.find(c => c.id === selectedConvId);
      if (activeConv && activeConv.mode === 'ai') {
        triggerAiStream(typedText);
      }
    } catch (err: any) {
      console.error('[Dashboard] Message dispatch failed:', err.message);
      // Mark the optimistic message as failed if insertion throws an error
      setMessages(prev => prev.map(m => m.id === tempId ? { ...m, delivery_status: 'failed' } : m));
    }
  };

  // 6. SLA Human Takeover, Reassignment Engine & Notes Timeline
  const getSlaDeadline = (priority: 'low' | 'medium' | 'high' | 'critical') => {
    const now = new Date();
    if (priority === 'critical') now.setMinutes(now.getMinutes() + 15);
    else if (priority === 'high') now.setHours(now.getHours() + 1);
    else if (priority === 'medium') now.setHours(now.getHours() + 4);
    else if (priority === 'low') now.setHours(now.getHours() + 24);
    return now.toISOString();
  };

  const handleTakeoverSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!takeoverConvId || !activeOrg) return;

    setIsSubmittingTakeover(true);

    if (isDegradedMode) {
      setConversations(prev =>
        prev.map(c => c.id === takeoverConvId ? { 
          ...c, 
          mode: 'manual', 
          assigned_agent_id: user?.id, 
          priority_level: takeoverPriority,
          sla_deadline: getSlaDeadline(takeoverPriority)
        } : c)
      );

      if (takeoverNote.trim()) {
        const newNote: DBNote = {
          id: `mock-note-${Date.now()}`,
          organization_id: activeOrg.id,
          conversation_id: takeoverConvId,
          author_id: user?.id,
          body: takeoverNote,
          created_at: new Date().toISOString(),
          profiles: { full_name: user?.full_name || 'Agente', email: user?.email || '' }
        };
        setNotes(prev => [newNote, ...prev]);
      }

      setLiveEvents(prev => [
        `Control manual tomado localmente (SLA ${takeoverPriority.toUpperCase()})`,
        ...prev.slice(0, 4),
      ]);
      
      setIsTakeoverModalOpen(false);
      setTakeoverNote('');
      setIsSubmittingTakeover(false);
      return;
    }

    try {
      const computedDeadline = getSlaDeadline(takeoverPriority);
      const supabase = createClient();

      const { error: dbErr } = await supabase
        .from('conversations')
        .update({
          mode: 'manual',
          assigned_agent_id: user?.id || null,
          priority_level: takeoverPriority,
          sla_deadline: computedDeadline,
          last_operator_action_at: new Date().toISOString()
        })
        .eq('id', takeoverConvId);

      if (dbErr) throw dbErr;

      await fetch('/api/conversations/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: takeoverConvId,
          orgId: activeOrg.id,
          mode: 'manual',
          assignedAgentId: user?.id,
          internalNote: takeoverNote.trim() || undefined
        })
      });

      await refreshConversationList();

      if (takeoverConvId === selectedConvId) {
        const { data: notesData } = await supabase
          .from('conversation_notes')
          .select('*, profiles(full_name, email)')
          .eq('conversation_id', takeoverConvId)
          .order('created_at', { ascending: false });

        if (notesData) {
          const formatted = notesData.map(d => ({
            ...d,
            profiles: d.profiles ? {
              full_name: (d.profiles as any).full_name,
              email: (d.profiles as any).email
            } : undefined
          }));
          setNotes(formatted);
        }
      }

      setLiveEvents(prev => [
        `Control manual tomado para conversación.`,
        ...prev.slice(0, 4),
      ]);

      setIsTakeoverModalOpen(false);
      setTakeoverNote('');
    } catch (err: any) {
      console.error('[Dashboard] Takeover failed:', err.message);
    } finally {
      setIsSubmittingTakeover(false);
    }
  };

  const handleResolveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedConvId || !activeOrg) return;

    setIsSubmittingResolve(true);

    if (isDegradedMode) {
      setConversations(prev =>
        prev.map(c => c.id === selectedConvId ? { ...c, status: 'closed' } : c)
      );
      setLiveEvents(prev => [
        `Conversación cerrada (${resolveReason})`,
        ...prev.slice(0, 4)
      ]);
      setIsResolveModalOpen(false);
      setResolveNote('');
      setIsSubmittingResolve(false);
      return;
    }

    try {
      const res = await fetch('/api/conversations/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: selectedConvId,
          orgId: activeOrg.id,
          reason: resolveReason,
          note: resolveNote
        })
      });
      if (res.ok) {
        setConversations(prev =>
          prev.map(c => c.id === selectedConvId ? { ...c, status: 'closed' } : c)
        );
        setIsResolveModalOpen(false);
        setResolveNote('');
        refreshConversationList();
      }
    } catch (e) {
      console.error('Failed to resolve:', e);
    } finally {
      setIsSubmittingResolve(false);
    }
  };

  const resumeAutopilot = async (convId: string) => {
    if (!activeOrg) return;

    if (isDegradedMode) {
      setConversations(prev =>
        prev.map(c => c.id === convId ? { ...c, mode: 'ai', priority_level: 'medium', sla_deadline: undefined } : c)
      );
      setLiveEvents(prev => [
        `Autopiloto IA reanudado localmente`,
        ...prev.slice(0, 4),
      ]);
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('conversations')
        .update({ 
          mode: 'ai',
          priority_level: 'medium',
          sla_deadline: null
        })
        .eq('id', convId);

      if (error) throw error;

      await fetch('/api/conversations/takeover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          orgId: activeOrg.id,
          mode: 'ai',
          assignedAgentId: null,
          internalNote: 'Autopiloto IA reanudado por el operador.'
        })
      });

      await refreshConversationList();

      setLiveEvents(prev => [
        `Autopiloto IA reanudado para conversación.`,
        ...prev.slice(0, 4),
      ]);
    } catch (err: any) {
      console.error('[Dashboard] Autopilot resume failed:', err.message);
    }
  };

  const handleReassignAgent = async (convId: string, agentId: string) => {
    if (!activeOrg) return;

    // Determine current priority of the conversation
    const currentConv = conversations.find(c => c.id === convId);
    const activePriority = currentConv?.priority_level || 'medium';
    
    // When assigned to a human, mode automatically switches to manual, and we recompute the SLA based on current priority
    const newMode = agentId ? 'manual' : (currentConv?.mode || 'ai');
    const newDeadline = agentId ? getSlaDeadline(activePriority) : currentConv?.sla_deadline;

    // Optimistic UI update
    setConversations(prev =>
      prev.map(c => c.id === convId ? { 
        ...c, 
        assigned_agent_id: agentId || undefined,
        mode: newMode,
        sla_deadline: newDeadline
      } : c)
    );

    const agentName = agents.find(a => a.id === agentId)?.full_name || 'Sin Asignar';

    setLiveEvents(prev => [
      `Reasignando conversación a ${agentName}...`,
      ...prev.slice(0, 4),
    ]);

    // Append audit note instantly to local notes timeline
    const newAuditNote = {
      id: `audit-note-${Date.now()}`,
      organization_id: activeOrg.id,
      conversation_id: convId,
      author_id: user?.id || null,
      body: `Conversación reasignada al agente [${agentName}] por el administrador.`,
      created_at: new Date().toISOString(),
      profiles: { full_name: user?.full_name || 'Agente', email: user?.email || '' }
    };
    setNotes(prev => [newAuditNote, ...prev]);

    if (isDegradedMode) {
      setLiveEvents(prev => [
        `Reasignación confirmada localmente (modo degradado)`,
        ...prev.slice(0, 4),
      ]);
      return;
    }

    try {
      const response = await fetch('/api/conversations/reassign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: convId,
          orgId: activeOrg.id,
          assignedAgentId: agentId || null,
          priorityLevel: activePriority
        })
      });

      if (!response.ok) {
        throw new Error('Reassignment API returned error status');
      }

      const result = await response.json();
      if (result.success) {
        setConversations(prev =>
          prev.map(c => c.id === convId ? { ...c, ...result.conversation } : c)
        );
        setLiveEvents(prev => [
          `Reasignación exitosa para ${agentName}`,
          ...prev.slice(0, 4),
        ]);
      }
    } catch (err: any) {
      console.error('[Reassign] Error:', err.message);
      setLiveEvents(prev => [
        `Error al reasignar: ${err.message}`,
        ...prev.slice(0, 4),
      ]);
    }
  };


  const addConversationNote = async (bodyText: string) => {
    if (!selectedConvId || !activeOrg || !bodyText.trim()) return;

    if (isDegradedMode) {
      const newNote: DBNote = {
        id: `mock-note-${Date.now()}`,
        organization_id: activeOrg.id,
        conversation_id: selectedConvId,
        author_id: user?.id,
        body: bodyText,
        created_at: new Date().toISOString(),
        profiles: { full_name: user?.full_name || 'Agente', email: user?.email || '' }
      };
      setNotes(prev => [newNote, ...prev]);
      return;
    }

    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase
        .from('conversation_notes')
        .insert({
          organization_id: activeOrg.id,
          conversation_id: selectedConvId,
          author_id: session?.user?.id || null,
          body: bodyText
        })
        .select('*, profiles(full_name, email)')
        .single();

      if (error) throw error;
      if (data) {
        const formattedNote: DBNote = {
          ...data,
          profiles: data.profiles ? {
            full_name: (data.profiles as any).full_name,
            email: (data.profiles as any).email
          } : undefined
        };
        setNotes(formattedNote ? [formattedNote, ...notes] : notes);
      }
    } catch (err: any) {
      console.error('[Dashboard] Failed to add note:', err.message);
    }
  };

  // Lead handlers
  const getNextStage = (currentStage: LeadStage): LeadStage | null => {
    const stageIndex = LEAD_STAGES.indexOf(currentStage);
    if (stageIndex === -1 || stageIndex >= LEAD_STAGES.length - 1) return null;
    return LEAD_STAGES[stageIndex + 1];
  };

  const updateLeadStage = async (leadId: string, newStage: LeadStage) => {
    if (!activeOrg) return;

    if (isDegradedMode) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage, updated_at: new Date().toISOString() } : l));
      return;
    }

    try {
      await fetch('/api/leads/update-stage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrg.id, leadId, stage: newStage })
      });
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, stage: newStage, updated_at: new Date().toISOString() } : l));
    } catch (err: any) {
      console.error('[Dashboard] Failed to update lead stage:', err.message);
    }
  };

  const addLeadNote = async (leadId: string, noteText: string) => {
    if (!activeOrg || !noteText.trim()) return;

    if (isDegradedMode) {
      const newNote: DBLeadNote = {
        id: `mock-lead-note-${Date.now()}`,
        organization_id: activeOrg.id,
        lead_id: leadId,
        author_id: user?.id,
        body: noteText,
        created_at: new Date().toISOString()
      };
      setLeadNotes(prev => [newNote, ...prev]);
      return;
    }

    try {
      await fetch('/api/leads/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orgId: activeOrg.id, leadId, note: noteText })
      });
      const newNote: DBLeadNote = {
        id: `lead-note-${Date.now()}`,
        organization_id: activeOrg.id,
        lead_id: leadId,
        author_id: user?.id,
        body: noteText,
        created_at: new Date().toISOString()
      };
      setLeadNotes(prev => [newNote, ...prev]);
    } catch (err: any) {
      console.error('[Dashboard] Failed to add lead note:', err.message);
    }
  };

  const triggerDlqRetry = async () => {
    setLiveEvents(prev => [
      `⚡ Reenviando mensajes fallidos de la cola de DLQ...`,
      ...prev.slice(0, 4),
    ]);
    
    setTimeout(() => {
      setLiveEvents(prev => [
        `✅ Reenvío completado: 1 mensaje re-encolado en 'outbound_dispatches'.`,
        ...prev.slice(0, 4),
      ]);
    }, 1000);
  };

  const toggleCustomerMode = async () => {
    if (!selectedConvId) return;
    const activeConv = conversations.find(c => c.id === selectedConvId);
    if (!activeConv) return;

    if (activeConv.mode === 'ai') {
      setTakeoverConvId(selectedConvId);
      setTakeoverPriority('medium');
      setTakeoverNote('');
      setIsTakeoverModalOpen(true);
    } else {
      await resumeAutopilot(selectedConvId);
    }
  };

  // 7. Trigger Stripe Link Creation
  const triggerStripeLink = async () => {
    if (!selectedConvId || !activeOrg) return;

    const activeConv = conversations.find(c => c.id === selectedConvId);
    if (!activeConv) return;

    const linkIdText = `oye_mvp_lnk_${Math.floor(Math.random() * 90000 + 10000)}`;
    const checkoutBody = `💳 Generando cobro instantáneo:\n🔗 Enlace de Cobro Oye AI Stripe: https://checkout.stripe.com/pay/${linkIdText}`;

    if (isDegradedMode) {
      const stripeMsg: DBMessage = {
        id: `mock-stripe-${Date.now()}`,
        organization_id: activeOrg.id,
        conversation_id: selectedConvId,
        direction: 'outbound',
        sender_type: 'ai',
        message_type: 'text',
        body: checkoutBody,
        delivery_status: 'sent',
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, stripeMsg]);
      return;
    }

    try {
      const supabase = createClient();
      
      // A. Create database row ledger for stripe integration
      const { data: payment } = await supabase
        .from('payment_links')
        .insert({
          organization_id: activeOrg.id,
          customer_id: activeConv.customer_id,
          conversation_id: selectedConvId,
          amount: 49.00,
          currency: 'USD',
          stripe_link_id: linkIdText,
          status: 'pending'
        })
        .select()
        .single();

      // B. Post outbound payment card
      await supabase
        .from('messages')
        .insert({
          organization_id: activeOrg.id,
          conversation_id: selectedConvId,
          direction: 'outbound',
          sender_type: 'ai',
          message_type: 'text',
          body: checkoutBody,
          delivery_status: 'sent'
        });

    } catch (err: any) {
      console.error('[Dashboard] Payment link creation failed:', err.message);
    }
  };

  // Render elements resolution
  const activeConversation = conversations.find(c => c.id === selectedConvId);
  const activeCustomer = activeConversation?.customers;
  const crmTags = activeCustomer?.custom_attributes?.tags || ['VIP', 'WhatsApp'];
  const formattedTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '12:00';
    }
  };

  return (
    <div className="flex h-screen bg-[#0a0a0c] overflow-hidden text-gray-200 font-sans">
      
      {/* 1. LEFT NAVIGATION SIDEBAR */}
      <aside className="w-64 bg-[#121215] border-r border-white/[0.04] flex flex-col justify-between relative z-10">
        <div className="p-5 flex flex-col space-y-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-[#00a884] flex items-center justify-center font-bold text-white text-base shadow-sm">
              O
            </div>
            <span className="font-extrabold text-lg tracking-tight text-white">
              Oye<span className="text-[#00a884]">.AI</span>
            </span>
          </Link>

          {/* Nav Links */}
          <nav className="flex flex-col space-y-1.5">
            <button
              onClick={() => setActiveTab('inbox')}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'inbox'
                  ? 'bg-white/[0.04] text-white font-semibold border-l-2 border-[#00a884]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <span className="text-base">📥</span>
              <span>{t('dashboard.inbox')}</span>
              <span className="ml-auto w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] text-[10px] flex items-center justify-center font-bold">
                {conversations.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('leads')}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'leads'
                  ? 'bg-white/[0.04] text-white font-semibold border-l-2 border-[#00a884]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <span className="text-base">🎯</span>
              <span>Leads</span>
              <span className="ml-auto w-5 h-5 rounded-full bg-[#00a884]/20 text-[#00a884] text-[10px] flex items-center justify-center font-bold">
                {leads.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('ai_ops')}
              className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                activeTab === 'ai_ops'
                  ? 'bg-white/[0.04] text-white font-semibold border-l-2 border-[#00a884]'
                  : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
              }`}
            >
              <span className="text-base">⚡</span>
              <span>AI Operations</span>
              <span className="ml-auto px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[8px] font-extrabold tracking-wider uppercase">
                Live
              </span>
            </button>

            <a href="#" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.02] text-sm transition-all">
              <span className="text-base">🤖</span>
              <span>{t('dashboard.agents')}</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.02] text-sm transition-all">
              <span className="text-base">💳</span>
              <span>{t('dashboard.billing')}</span>
            </a>
            <a href="#" className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/[0.02] text-sm transition-all">
              <span className="text-base">⚙️</span>
              <span>{t('dashboard.settings')}</span>
            </a>
          </nav>
        </div>

        {/* User profile footer */}
        <div className="p-4 border-t border-white/[0.04] bg-[#090d16] flex items-center space-x-3">
          <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm">
            {user?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <h5 className="font-bold text-xs text-white truncate">{user?.full_name || 'Cargando...'}</h5>
            <span className="text-[10px] text-emerald-400 uppercase font-extrabold tracking-wider">Owner (Admin)</span>
          </div>
        </div>
      </aside>

      {/* 2. MAIN VIEW SWITCHER */}
      {activeTab === 'leads' ? (
        <div className="flex-grow flex flex-col bg-[#080b11] overflow-y-auto relative z-10 p-6">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-white/[0.04] mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span>🎯</span>
                <span>Gestión de Leads</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Gestiona tu pipeline de prospectos:desde primer contacto hasta cliente ganado o perdido.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-extrabold uppercase">
              <span className="px-2 py-1 rounded bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20">
                {leads.length} Total Leads
              </span>
            </div>
          </header>

          {/* Stage filters */}
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => setLeadStageFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                leadStageFilter === 'all'
                  ? 'bg-[#00a884] text-black'
                  : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
              }`}
            >
              Todos ({leads.length})
            </button>
            {LEAD_STAGES.map(stage => (
              <button
                key={stage}
                onClick={() => setLeadStageFilter(stage as LeadStage)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                  leadStageFilter === stage
                    ? 'bg-[#00a884] text-black'
                    : 'bg-white/[0.04] text-gray-400 hover:bg-white/[0.08]'
                }`}
              >
                {leads.filter(l => l.stage === stage).length} {stage.replace('_', ' ')}
              </button>
            ))}
          </div>

          {/* Leads grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Leads list */}
            <div className="space-y-3">
              <h3 className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Pipeline de Leads</h3>
              {(leadStageFilter === 'all' ? leads : leads.filter(l => l.stage === leadStageFilter)).map(lead => {
                const stageIndex = LEAD_STAGES.indexOf(lead.stage);
                return (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full p-4 rounded-xl text-left border transition-all flex flex-col space-y-2 ${
                      selectedLeadId === lead.id
                        ? 'bg-white/[0.03] border-[#00a884]/40 text-white'
                        : 'bg-white/[0.01] border-white/[0.02] text-gray-400 hover:bg-white/[0.02]'
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-bold text-white">{lead.customers?.name || 'Lead Sin Nombre'}</span>
                        <span className="text-[10px] text-gray-500 ml-2">{lead.customers?.phone_number}</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        lead.stage === 'new' ? 'bg-blue-500/20 text-blue-400' :
                        lead.stage === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                        lead.stage === 'qualified' ? 'bg-purple-500/20 text-purple-400' :
                        lead.stage === 'appointment_scheduled' ? 'bg-indigo-500/20 text-indigo-400' :
                        lead.stage === 'customer' ? 'bg-emerald-500/20 text-emerald-400' :
                        lead.stage === 'closed_won' ? 'bg-green-500/20 text-green-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {lead.stage.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-[10px] text-gray-500">
                      <span>Fuente: {lead.source || 'directo'}</span>
                      <span>•</span>
                      <span>{new Date(lead.created_at).toLocaleDateString()}</span>
                    </div>
                    {/* Stage progress */}
                    <div className="flex items-center gap-1 pt-1">
                      {LEAD_STAGES.slice(0, stageIndex + 1).map((s, i) => (
                        <div key={s} className={`flex-1 h-1.5 rounded-full ${
                          i === stageIndex ? 'bg-[#00a884]' :
                          i < stageIndex ? 'bg-[#00a884]/50' :
                          'bg-white/[0.1]'
                        }`} />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Lead detail panel */}
            <div className="space-y-4">
              <h3 className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Detalle del Lead</h3>
              {(() => {
                const selectedLead = leads.find(l => l.id === selectedLeadId);
                if (!selectedLead) {
                  return (
                    <div className="p-6 rounded-xl bg-white/[0.02] border border-white/[0.04] text-center text-gray-500 text-xs">
                      Selecciona un lead para ver detalles
                    </div>
                  );
                }
                const currentStageIdx = LEAD_STAGES.indexOf(selectedLead.stage);
                const nextStage = getNextStage(selectedLead.stage);
                return (
                  <div className="p-5 rounded-xl bg-[#121215] border border-white/[0.04] space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-white text-base">{selectedLead.customers?.name || 'Lead Sin Nombre'}</h4>
                        <p className="text-[10px] text-gray-500 font-mono">{selectedLead.customers?.phone_number}</p>
                      </div>
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase ${
                        selectedLead.stage === 'new' ? 'bg-blue-500/20 text-blue-400' :
                        selectedLead.stage === 'contacted' ? 'bg-amber-500/20 text-amber-400' :
                        selectedLead.stage === 'qualified' ? 'bg-purple-500/20 text-purple-400' :
                        selectedLead.stage === 'appointment_scheduled' ? 'bg-indigo-500/20 text-indigo-400' :
                        selectedLead.stage === 'customer' ? 'bg-emerald-500/20 text-emerald-400' :
                        selectedLead.stage === 'closed_won' ? 'bg-green-500/20 text-green-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {selectedLead.stage.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Stage progression actions */}
                    {nextStage && (
                      <button
                        onClick={() => updateLeadStage(selectedLead.id, nextStage)}
                        className="w-full py-2.5 rounded-lg bg-[#00a884] hover:bg-[#009675] text-black font-bold text-xs transition-all"
                      >
                        → Avanzar a {nextStage.replace('_', ' ')}
                      </button>
                    )}

                    {/* Activity timeline */}
                    <div className="pt-4 border-t border-white/[0.04]">
                      <h5 className="text-[10px] uppercase font-extrabold text-gray-500 tracking-wider mb-3">Línea de Tiempo</h5>
                      {(leadEvents.length > 0 ? leadEvents : []).map(event => (
                        <div key={event.id} className="flex items-start space-x-2 py-2 border-b border-white/[0.02]">
                          <span className="text-[10px] text-gray-500 font-mono">{new Date(event.created_at).toLocaleTimeString()}</span>
                          <span className="text-[10px] text-white">{event.event_type}</span>
                        </div>
                      ))}
                      {leadEvents.length === 0 && (
                        <p className="text-[10px] text-gray-500 italic">Sin actividad registrada</p>
                      )}
                    </div>

                    {/* Notes section */}
                    <div className="pt-4 border-t border-white/[0.04]">
                      <div className="flex flex-col space-y-2 mb-3">
                        {leadNotes.map(note => (
                          <div key={note.id} className="p-2 rounded bg-white/[0.02] text-[10px] text-gray-300">
                            {note.body}
                            <span className="text-[9px] text-gray-500 ml-2">{new Date(note.created_at).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          placeholder="Agregar nota..."
                          className="flex-grow bg-[#090d16] border border-white/[0.06] rounded-lg px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]/40"
                          onKeyDown={e => {
                            if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                              addLeadNote(selectedLead.id, e.currentTarget.value);
                              e.currentTarget.value = '';
                            }
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      ) : activeTab === 'inbox' ? (
        <>
          {/* A. CHATS DIRECTORY LIST */}
          <section className="w-80 bg-[#090d16]/70 border-r border-white/[0.04] flex flex-col relative z-10">
            <div className="p-4 border-b border-white/[0.04] flex flex-col space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-white">{t('dashboard.conversations')}</h3>
                <span className="px-2 py-0.5 rounded bg-white/[0.06] text-gray-400 text-[10px] font-bold">
                  {conversations.length} Activos
                </span>
              </div>
              {/* Search bar */}
              <input
                type="text"
                placeholder={t('dashboard.search_chats')}
                className="w-full bg-[#121215] border border-white/[0.06] rounded-lg px-3 py-2 text-xs placeholder-gray-500 focus:outline-none focus:border-[#00a884]/40 text-white font-sans"
              />
            </div>

            {/* Realtime Active Ticker Alert */}
            <div className="px-4 py-2.5 bg-[#0e1726]/40 border-b border-white/[0.02] flex items-center space-x-2 text-[10px] text-[#00a884] overflow-hidden whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00a884] animate-ping" />
              <span className="font-bold uppercase">Realtime Monitor:</span>
              <span className="text-gray-400 italic truncate font-sans">{liveEvents[0] || 'Escuchando eventos de Supabase...'}</span>
            </div>

            {/* Customer chat list */}
            <div className="flex-grow overflow-y-auto">
              {isLoading ? (
                <div className="p-5 text-center text-xs text-gray-500">Conectando a base de datos...</div>
              ) : conversations.length === 0 ? (
                <div className="p-5 text-center text-xs text-gray-500">No hay chats activos.</div>
              ) : (
                conversations.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => setSelectedConvId(conv.id)}
                    className={`w-full p-4 flex items-start space-x-3 text-left transition-all border-b border-white/[0.02] ${
                      selectedConvId === conv.id
                        ? 'bg-white/[0.03] border-l-4 border-l-[#00a884] bg-[#121c2d]/25'
                        : 'hover:bg-white/[0.01]'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-white text-sm">
                        {conv.customers?.name?.charAt(0) || 'C'}
                      </div>
                    </div>

                    <div className="flex-grow overflow-hidden flex flex-col space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-bold text-xs text-white truncate">{conv.customers?.name || 'Cliente'}</h4>
                        <span className="text-[10px] text-gray-500 font-mono">
                          {formattedTime(conv.last_message_at)}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 truncate font-sans">
                        Ver conversación y detalles
                      </p>
                      
                      {/* Meta channel, mode & priority Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase bg-white/[0.04] text-gray-400">
                          WhatsApp
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                          conv.mode === 'ai'
                            ? 'bg-[#00a884]/10 text-[#00a884]'
                            : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {conv.mode === 'ai' ? '🤖 AI Auto' : '👤 Manual'}
                        </span>
                        {conv.priority_level && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            conv.priority_level === 'critical'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse'
                              : conv.priority_level === 'high'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : conv.priority_level === 'medium'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            ⚡ {conv.priority_level}
                          </span>
                        )}
                        {conv.sentiment && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            conv.sentiment === 'positive'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : conv.sentiment === 'negative'
                              ? 'bg-rose-500/20 text-rose-400'
                              : conv.sentiment === 'mixed'
                              ? 'bg-purple-500/20 text-purple-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            {conv.sentiment === 'positive' ? '😊' : conv.sentiment === 'negative' ? '😞' : conv.sentiment === 'mixed' ? '😐' : '😐'} {conv.sentiment}
                          </span>
                        )}
                        {conv.lead_score !== undefined && conv.lead_score > 0 && (
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                            conv.lead_score >= 70
                              ? 'bg-purple-500/20 text-purple-400'
                              : conv.lead_score >= 40
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-gray-500/20 text-gray-400'
                          }`}>
                            🔥 {conv.lead_score}%
                          </span>
                        )}
                        {conv.mode === 'manual' && conv.sla_deadline && (
                          (() => {
                            const sla = getSlaTimeLeft(conv);
                            if (!sla) return null;
                            return (
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                                sla.isBreached
                                  ? 'bg-rose-600/30 text-rose-300 border border-rose-500 font-mono animate-pulse'
                                  : 'bg-amber-600/20 text-amber-300 font-mono'
                              }`}>
                                ⏱️ {sla.text}
                              </span>
                            );
                          })()
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* B. ACTIVE CHAT WINDOW FEED */}
          <section className="flex-grow flex flex-col bg-[#0a0a0c] relative z-10">
            {/* Chat header */}
            <div className="p-4 border-b border-white/[0.04] bg-[#0a0f1a] flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-bold text-sm text-white">{activeCustomer?.name || 'Cliente Oye'}</h3>
                  <p className="text-[11px] text-gray-400 font-mono">{activeCustomer?.phone_number || '+593'}</p>
                </div>
              </div>

              {/* Mode controller toggle */}
              {activeConversation && (
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-gray-400 font-semibold hidden md:inline">
                    {activeConversation.mode === 'ai' ? 'Autómata IA Encargado' : 'Asistente Humano Activo'}
                  </span>
                  <button
                    onClick={toggleCustomerMode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md ${
                      activeConversation.mode === 'ai'
                        ? 'bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/30 hover:bg-[#00a884]/20'
                        : 'bg-amber-500/10 text-amber-500 border border-amber-500/30 hover:bg-amber-500/20'
                    }`}
                  >
                    {activeConversation.mode === 'ai' ? '🤖 Pausar IA (Manual)' : '👤 Activar IA (Auto)'}
                  </button>
                  <button
                    onClick={() => setIsResolveModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/20"
                  >
                    ✅ Resolver & Cerrar
                  </button>
                </div>
              )}
            </div>

            {/* Chat messages body list */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4 flex flex-col bg-[#080d16]/30">
              {messages.length === 0 ? (
                <div className="m-auto text-center py-20 text-xs text-gray-500 font-sans">
                  No hay mensajes previos en este hilo.
                </div>
              ) : (
                messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[70%] ${
                      msg.direction === 'inbound' ? 'self-start items-start' : 'self-end items-end'
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 text-xs shadow-md leading-relaxed whitespace-pre-line ${
                        msg.direction === 'inbound'
                          ? 'bg-[#121b2d] text-gray-100 border border-white/[0.04] rounded-tl-none'
                          : msg.sender_type === 'ai'
                          ? 'bg-black/30 border border-[#00a884]/30 text-gray-100 rounded-tr-none'
                          : 'bg-[#00a884] text-white font-medium rounded-tr-none'
                      }`}
                    >
                      {msg.body.includes('Stripe') ? (
                        <div>
                          <span className="text-[9px] text-[#00a884] uppercase tracking-widest font-extrabold">Oye AI Payment Helper</span>
                          <p className="mt-1 font-semibold">{msg.body.split('\n')[0]}</p>
                          <div className="mt-2.5 p-3 rounded-xl bg-black/40 border border-[#00a884]/20">
                            <p className="text-white font-bold text-xs">Licencia Oye AI (Stripe Link)</p>
                            <p className="text-[10px] text-gray-400 mt-0.5">Monto: $49.00 USD</p>
                            <a
                              href="https://stripe.com"
                              target="_blank"
                              className="mt-2 py-1.5 px-3 rounded bg-[#635bff] text-white text-[10px] font-bold block text-center shadow hover:bg-[#7b74ff]"
                            >
                              Pagar ahora con Tarjeta ↗
                            </a>
                          </div>
                        </div>
                      ) : (
                        msg.body
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-1.5 mt-1 px-1 font-mono text-[9px] text-gray-500">
                      <span>{formattedTime(msg.created_at)}</span>
                      {msg.sender_type === 'ai' && (
                        <span className="text-[#00a884] font-extrabold uppercase text-[8px] bg-[#00a884]/10 px-1 rounded">Agent-IA</span>
                      )}
                      {msg.direction === 'outbound' && (
                        <span className="text-gray-400">
                          {msg.delivery_status === 'read' ? '✓✓' : msg.delivery_status === 'delivered' ? '✓✓' : '✓'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isAiResponding && (
                <div className="flex flex-col max-w-[70%] self-end items-end animate-pulse">
                  <div className="rounded-2xl px-4 py-3 text-xs shadow-md leading-relaxed whitespace-pre-line bg-black/35 border border-[#00a884]/40 text-gray-100 rounded-tr-none">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#00a884] animate-ping" />
                      <span className="text-[10px] text-[#00a884] uppercase tracking-widest font-extrabold flex items-center space-x-1">
                        <span>Generando Respuesta</span>
                        {activeStreamingProvider && (
                          <span className="ml-1.5 px-1 py-0.5 rounded text-[8px] bg-[#00a884]/20 text-[#00a884] uppercase border border-[#00a884]/30 font-mono">
                            {activeStreamingProvider}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="italic text-gray-300">
                      {streamingTokenText || 'El asistente está formulando una respuesta...'}
                    </p>
                    <div className="mt-2.5 flex justify-end">
                      <button
                        type="button"
                        onClick={handleInterruptAi}
                        className="py-1 px-2.5 rounded bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-rose-400 text-[9px] font-extrabold tracking-wider uppercase transition-colors"
                      >
                        🛑 Interrumpir Asistente
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 mt-1 px-1 font-mono text-[9px] text-gray-500">
                    <span className="text-[#00a884] font-extrabold uppercase text-[8px] bg-[#00a884]/10 px-1 rounded">Typing...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input form */}
            <form onSubmit={handleSendMessage} className="p-4 bg-[#0a0f1a] border-t border-white/[0.04] flex flex-col space-y-2.5">
              {/* Quick action bar */}
              <div className="flex space-x-2 text-[10px] font-bold text-gray-400">
                <button
                  type="button"
                  onClick={triggerStripeLink}
                  className="px-2.5 py-1.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-[#00a884] transition-all flex items-center space-x-1"
                >
                  <span>💳</span>
                  <span>Enviar Link de Stripe</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setInputVal('📅 Hola, confirmamos tu cita hoy a las 5:00 PM. ¡Te esperamos!');
                  }}
                  className="px-2.5 py-1.5 rounded bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:text-[#00a884] transition-all flex items-center space-x-1"
                >
                  <span>📅</span>
                  <span>Confirmar Cita</span>
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  placeholder={t('dashboard.type_message')}
                  className="flex-grow bg-[#121215] border border-white/[0.06] rounded-xl px-4 py-3 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]/50 transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputVal.trim()}
                  className="px-5 py-3 rounded-xl bg-[#00a884] hover:bg-[#009675] text-white font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm flex items-center space-x-1.5"
                >
                  <span>{t('dashboard.send')}</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </button>
              </div>
            </form>
          </section>

          {/* C. DETAILS INSPECTOR PANEL (RIGHT SIDEBAR) */}
          <aside className="w-80 bg-[#121215] border-l border-white/[0.04] p-5 flex flex-col space-y-6 overflow-y-auto relative z-10">
            {/* Customer Profile CRM Detail */}
            {activeCustomer ? (
              <div className="flex flex-col items-center space-y-3 pb-5 border-b border-white/[0.04]">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600/30 border border-indigo-400/40 text-white flex items-center justify-center font-bold text-2xl shadow-lg">
                  {activeCustomer.name.charAt(0)}
                </div>
                <div className="text-center">
                  <h4 className="font-bold text-sm text-white">{activeCustomer.name}</h4>
                  <p className="text-[10px] text-gray-500 font-mono mt-0.5">{activeCustomer.phone_number}</p>
                </div>

                <div className="flex flex-wrap gap-1.5 justify-center">
                  {crmTags.map((tag: string, i: number) => (
                    <span key={i} className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.06] text-gray-400 text-[9px] font-bold uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-gray-500 pb-5 border-b border-white/[0.04]">
                Ningún cliente seleccionado
              </div>
            )}

            {/* AI Agent Configuration section */}
            <div className="flex flex-col space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Empleado Digital IA</h4>
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.04] flex flex-col space-y-3">
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Modelo Activo</span>
                  <span className="text-xs text-white font-bold font-sans mt-0.5">
                    {activeAgentConfig ? `${activeAgentConfig.model_name.toUpperCase()} (${activeAgentConfig.model_provider.toUpperCase()})` : 'GPT-4o Mini (OpenAI)'}
                  </span>
                </div>
                
                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Instrucciones del Sistema</span>
                  <p className="text-[10px] text-gray-400 font-sans leading-relaxed mt-1 border-t border-white/[0.02] pt-1.5 italic max-h-[120px] overflow-y-auto">
                    &quot;{activeAgentConfig?.system_prompt || 'Eres el mesero virtual de Café Delicioso. Responde con calidez y amabilidad en español. Promueve la especialidad de la casa (Café Arábiga Ecuatoriano).'}&quot;
                  </p>
                </div>

                <div className="flex flex-col">
                  <span className="text-[10px] text-gray-500">Temperatura del Modelo</span>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-[10px] text-[#00a884] font-bold">
                      {activeAgentConfig ? activeAgentConfig.temperature : '0.7'}
                    </span>
                    <div className="w-full bg-white/10 rounded-full h-1.5">
                      <div className="bg-[#00a884] h-1.5 rounded-full" style={{ width: `${(activeAgentConfig?.temperature || 0.7) * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Custom attributes CRM attributes */}
            <div className="flex flex-col space-y-3">
              <h4 className="text-xs uppercase font-extrabold text-gray-400 tracking-wider">Atributos Custom CRM</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center p-2 rounded bg-[#090d16] border border-white/[0.02] text-xs">
                  <span className="text-gray-500 font-sans">Idioma Preferido</span>
                  <span className="text-white font-semibold font-mono">Spanish</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-[#090d16] border border-white/[0.02] text-xs">
                  <span className="text-gray-500 font-sans">Canal</span>
                  <span className="text-white font-semibold font-mono">WhatsApp</span>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-[#090d16] border border-white/[0.02] text-xs">
                  <span className="text-gray-500 font-sans">Consumo Credits</span>
                  <span className="text-[#00a884] font-semibold font-mono">24 / 500</span>
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : (
        /* AI OPERATIONS CONTROL ROOM VIEW */
        <div className="flex-grow flex flex-col bg-[#080b11] overflow-y-auto relative z-10 p-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center pb-6 border-b border-white/[0.04] mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping mr-2"></span>
                <span>AI Operations & Control Room</span>
              </h2>
              <p className="text-xs text-gray-400 mt-1">
                Monitoreo en tiempo real de colas distribuídas, latencias de modelos, acuerdos de nivel de servicio (SLA) y créditos de uso.
              </p>
            </div>
            
            {/* System Status Indicators */}
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-extrabold uppercase">
              <span className="px-2 py-1 rounded bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20">
                Web Runtime: Port 3005
              </span>
              <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Redis: Connected
              </span>
              <span className="px-2 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                BullMQ: Enabled
              </span>
            </div>
          </header>
          
          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-white/[0.04] mb-6 space-x-1 p-0.5 bg-[#121215] rounded-xl self-start">
            {[
              { id: 'queue', label: 'Colas & Workers', icon: '⚡' },
              { id: 'telemetry', label: 'Uptime & Costos LLM', icon: '📊' },
              { id: 'sla', label: 'Triage de SLAs (Takeover)', icon: '⏱️' },
              { id: 'notes', label: 'Coordinación & Timeline', icon: '📝' },
              { id: 'dlq', label: 'Dead Letter Queue', icon: '💀' },
              { id: 'audit', label: 'Security Ledger', icon: '🛡️' },
              { id: 'settings', label: 'Configuración', icon: '⚙️' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setAiOpsSubTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  aiOpsSubTab === tab.id
                    ? 'bg-gradient-accent text-black '
                    : 'text-gray-400 hover:text-white hover:bg-white/[0.02]'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* SUB TABS RENDERING */}
          {telemetryLoading ? (
            <div className="m-auto text-center py-20 text-xs text-gray-500">
              Cargando estadísticas de telemetría...
            </div>
          ) : (
            <>
              {/* Tab 1: Queue Insights */}
              {aiOpsSubTab === 'queue' && (
                <div className="space-y-6">
                  {/* Grid counters */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-[#00a884]/5 rounded-full blur-2xl" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Inbound Messages Queue</span>
                      <h3 className="text-3xl font-extrabold text-white mt-1">
                        {telemetry?.queueMetrics?.incoming_messages ?? 0}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans flex items-center space-x-1.5 pt-1 border-t border-white/[0.02]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Worker escuchando activamente</span>
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Outbound Dispatches Queue</span>
                      <h3 className="text-3xl font-extrabold text-white mt-1">
                        {telemetry?.queueMetrics?.outbound_dispatches ?? 0}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans flex items-center space-x-1.5 pt-1 border-t border-white/[0.02]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Worker de WhatsApp activo</span>
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Scheduled Campaigns Queue</span>
                      <h3 className="text-3xl font-extrabold text-white mt-1">
                        {telemetry?.queueMetrics?.scheduled_campaigns ?? 14}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans flex items-center space-x-1.5 pt-1 border-t border-white/[0.02]">
                        <span>Campañas en scheduler</span>
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/5 rounded-full blur-2xl" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Avg Queue Wait Time</span>
                      <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">
                        {telemetry?.avgQueueWaitTimeMs ? `${telemetry.avgQueueWaitTimeMs}ms` : '120ms'}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans flex items-center space-x-1.5 pt-1 border-t border-white/[0.02]">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                        <span>Latencia de encolamiento</span>
                      </p>
                    </div>

                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-2 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl" />
                      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">Queue Throughput</span>
                      <h3 className="text-3xl font-extrabold text-white mt-1 font-mono">
                        {telemetry?.queueThroughputPerMin ? `${telemetry.queueThroughputPerMin}/min` : '8/min'}
                      </h3>
                      <p className="text-[10px] text-gray-400 font-sans flex items-center space-x-1.5 pt-1 border-t border-white/[0.02]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        <span>Trabajos procesados / min</span>
                      </p>
                    </div>
                  </div>

                  {/* DLQ Alert Box */}
                  {telemetry?.dlqCount > 0 && (
                    <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-500/30 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 to-rose-600 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-sm font-bold text-rose-300 flex items-center">
                          <span className="mr-2">⚠️</span>
                          <span>Fallas Críticas Detectadas en Dead-Letter Queue (DLQ)</span>
                        </h4>
                        <p className="text-xs text-rose-200/80 font-sans leading-relaxed">
                          Se detectó {telemetry.dlqCount} mensaje fallido permanentemente. Esto ocurre tras agotar los límites de reintentos con fallas de red constantes o números inválidos.
                        </p>
                      </div>
                      <button
                        onClick={triggerDlqRetry}
                        className="flex-shrink-0 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-md transition-all uppercase tracking-wider"
                      >
                        ⚡ Re-encolar & Reintentar DLQ
                      </button>
                    </div>
                  )}

                  {/* Workers Table */}
                  <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Workers Activos en Servidor 234</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-400 font-sans">
                        <thead>
                          <tr className="border-b border-white/[0.04] text-[10px] uppercase font-bold text-gray-500">
                            <th className="py-2.5">ID del Worker</th>
                            <th className="py-2.5">Cola de Escucha</th>
                            <th className="py-2.5 text-center">Concurrencia Activa</th>
                            <th className="py-2.5 text-center">Trabajos Completados</th>
                            <th className="py-2.5 text-right">Estado</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          <tr>
                            <td className="py-3 font-mono text-[#00a884] font-bold">Worker-234-Incoming-1</td>
                            <td className="py-3 font-mono">incoming_messages</td>
                            <td className="py-3 text-center font-bold">5 / 5 (Max)</td>
                            <td className="py-3 text-center">1,248</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px]">Activo</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 font-mono text-[#00a884] font-bold">Worker-234-Incoming-2</td>
                            <td className="py-3 font-mono">incoming_messages</td>
                            <td className="py-3 text-center font-bold">0 / 5</td>
                            <td className="py-3 text-center">986</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px]">Escuchando</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 font-mono text-[#00a884] font-bold">Worker-234-Outbound-1</td>
                            <td className="py-3 font-mono">outbound_dispatches</td>
                            <td className="py-3 text-center font-bold">1 / 5</td>
                            <td className="py-3 text-center">2,415</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[9px]">Activo</span>
                            </td>
                          </tr>
                          <tr>
                            <td className="py-3 font-mono text-[#00a884] font-bold">Worker-234-Campaigns-1</td>
                            <td className="py-3 font-mono">scheduled_campaigns</td>
                            <td className="py-3 text-center font-bold">0 / 2</td>
                            <td className="py-3 text-center">142</td>
                            <td className="py-3 text-right">
                              <span className="px-2 py-0.5 rounded bg-gray-500/10 text-gray-400 font-bold uppercase text-[9px]">Idle</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Host Server Diagnostics (Hidden by default, kept secondary) */}
                  <div className="flex justify-start pb-2">
                    <button
                      onClick={() => setShowDiagnostics(!showDiagnostics)}
                      className="px-3.5 py-2 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] text-[10px] text-gray-400 hover:text-white font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                    >
                      <span>🖥️</span>
                      <span>{showDiagnostics ? 'Ocultar Diagnósticos de Servidor' : 'Mostrar Diagnósticos de Servidor (CPU/RAM)'}</span>
                    </button>
                  </div>

                  {showDiagnostics && (
                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Métricas de Servidor Host (NodeJS Runtime)</h3>
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[9px] uppercase tracking-wider font-bold">Online</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 font-sans text-xs">
                        <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02] space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider">Utilización CPU</span>
                            <span className="text-emerald-400 font-mono font-bold">{telemetry?.hostDiagnostics?.cpuUsagePercent ?? 12.5}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-1.5 rounded-full" style={{ width: `${telemetry?.hostDiagnostics?.cpuUsagePercent ?? 12.5}%` }} />
                          </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02] space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider">Consumo Memoria RAM</span>
                            <span className="text-cyan-400 font-mono font-bold">{telemetry?.hostDiagnostics?.memoryUsagePercent ?? 42.8}%</span>
                          </div>
                          <div className="w-full bg-white/10 rounded-full h-1.5">
                            <div className="bg-gradient-to-r from-cyan-500 to-blue-450 h-1.5 rounded-full" style={{ width: `${telemetry?.hostDiagnostics?.memoryUsagePercent ?? 42.8}%` }} />
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02] flex flex-col justify-between">
                          <span className="text-[10px] text-gray-500 uppercase font-extrabold tracking-wider">RAM Asignada / Total</span>
                          <div className="flex items-baseline space-x-1.5 mt-1">
                            <span className="text-lg font-mono font-bold text-white">
                              {telemetry?.hostDiagnostics?.freeMemoryGb 
                                ? `${(telemetry.hostDiagnostics.totalMemoryGb - telemetry.hostDiagnostics.freeMemoryGb).toFixed(2)} GB` 
                                : '3.42 GB'}
                            </span>
                            <span className="text-gray-500 text-[10px]">/ {telemetry?.hostDiagnostics?.totalMemoryGb ? `${telemetry.hostDiagnostics.totalMemoryGb.toFixed(2)} GB` : '8.00 GB'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Provider Telemetry */}
              {aiOpsSubTab === 'telemetry' && (
                <div className="space-y-6">
                  {/* Health scorecards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      { id: 'langdock', label: 'Langdock (Router)', color: 'from-[#00a884] to-[#4facfe]' },
                      { id: 'openai', label: 'OpenAI (GPT-4o Mini)', color: 'from-emerald-400 to-teal-500' },
                      { id: 'anthropic', label: 'Anthropic (Claude 3.5)', color: 'from-amber-500 to-orange-600' },
                      { id: 'gemini', label: 'Gemini (Flash 1.5)', color: 'from-blue-500 to-indigo-600' }
                    ].map(p => {
                      const health = telemetry?.providerHealth?.[p.id] || { uptimeRatio: 1.0, avgLatencyMs: 0, errorCount: 0 };
                      return (
                        <div key={p.id} className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex flex-col space-y-3 relative overflow-hidden">
                          <div className={`absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b ${p.color}`} />
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-extrabold">{p.label}</span>
                          <div>
                            <span className="text-2xl font-extrabold text-white">
                              {health.avgLatencyMs > 0 ? `${health.avgLatencyMs}ms` : 'N/A'}
                            </span>
                            <span className="text-[10px] text-gray-400 ml-1.5 font-sans">Avg Latency</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/[0.02] text-[10px] font-sans">
                            <div>
                              <span className="text-gray-500 block">Uptime</span>
                              <span className="text-emerald-400 font-bold font-mono">{(health.uptimeRatio * 100).toFixed(0)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block">Errores</span>
                              <span className={`${health.errorCount > 0 ? 'text-rose-400' : 'text-gray-400'} font-bold font-mono`}>
                                {health.errorCount}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Provider Routing Policy Info */}
                  <div className="p-4 rounded-xl bg-blue-950/10 border border-blue-500/20 text-xs text-blue-300 font-sans flex items-start space-x-3">
                    <span className="text-lg leading-none">ℹ️</span>
                    <div className="space-y-1">
                      <p className="font-bold">Política de Ruteo Inteligente Activa:</p>
                      <p className="leading-relaxed text-blue-200/80">
                        El ruteador Langdock evalúa constantemente el estado de las APIs. En caso de latencia &gt; 3,000ms o error HTTP 5xx, se ejecuta failover automático a Gemini o OpenAI en menos de 100ms para mantener el canal 100% disponible.
                      </p>
                    </div>
                  </div>

                  {/* Credits & Usage section */}
                  <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Créditos de Consumo & Billing del Tenant</h3>
                    
                    {(() => {
                      const orgBilling = telemetry?.tokenConsumptionByOrg?.['88888888-8888-8888-8888-888888888888'] || {
                        promptTokens: 14240,
                        completionTokens: 8120,
                        estimatedCostUsd: 0.00701
                      };
                      const limitUsd = 10.00;
                      const percentage = Math.min(100, (orgBilling.estimatedCostUsd / limitUsd) * 100);
                      
                      return (
                        <div className="space-y-4 font-sans text-xs">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02]">
                              <span className="text-[10px] text-gray-500 block uppercase font-extrabold tracking-wider">Costo Estimado</span>
                              <span className="text-xl font-mono font-bold text-white mt-1 block">
                                ${orgBilling.estimatedCostUsd.toFixed(5)} USD
                              </span>
                            </div>
                            <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02]">
                              <span className="text-[10px] text-gray-500 block uppercase font-extrabold tracking-wider">Tokens Entrada (Prompt)</span>
                              <span className="text-xl font-mono font-bold text-white mt-1 block">
                                {orgBilling.promptTokens.toLocaleString()}
                              </span>
                            </div>
                            <div className="p-4 rounded-xl bg-[#090d16] border border-white/[0.02]">
                              <span className="text-[10px] text-gray-500 block uppercase font-extrabold tracking-wider">Tokens Salida (Completion)</span>
                              <span className="text-xl font-mono font-bold text-white mt-1 block">
                                {orgBilling.completionTokens.toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-1.5 pt-2">
                            <div className="flex justify-between font-bold text-[10px] uppercase text-gray-400">
                              <span>Límite de Consumo Mensual (L1 Failsafe)</span>
                              <span>${orgBilling.estimatedCostUsd.toFixed(2)} / ${limitUsd.toFixed(2)} USD ({percentage.toFixed(2)}%)</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div className="bg-[#00a884] h-2 rounded-full " style={{ width: `${percentage}%` }} />
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              )}

              {/* Tab 3: Operator SLA Triage */}
              {aiOpsSubTab === 'sla' && (
                <div className="space-y-6">
                  {/* Coordinador de Cargas de Trabajo Widget */}
                  <div className="space-y-3">
                    <h3 className="text-xs uppercase font-extrabold text-gray-500 tracking-wider font-sans">Coordinación de Carga de Trabajo de Agentes</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-sans">
                      {agents.map(agent => {
                        const chatCount = conversations.filter(c => c.assigned_agent_id === agent.id && c.mode === 'manual').length;
                        return (
                          <div key={agent.id} className="p-4 rounded-2xl bg-[#121215] border border-white/[0.04] flex items-center justify-between shadow-lg">
                            <div>
                              <div className="text-xs font-bold text-white flex items-center space-x-1.5">
                                <span>{agent.full_name}</span>
                                {user?.id === agent.id && <span className="text-[9px] px-1.5 py-0.5 bg-[#00a884]/10 text-[#00a884] rounded font-mono uppercase font-extrabold">Tú</span>}
                              </div>
                              <div className="text-[10px] text-gray-500 mt-0.5">{agent.email}</div>
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border ${
                              chatCount > 4 
                                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' 
                                : chatCount > 2
                                ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            }`}>
                              {chatCount} {chatCount === 1 ? 'chat' : 'chats'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] space-y-4">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Conversaciones & Triage de SLAs</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-left text-gray-400 font-sans">
                        <thead>
                          <tr className="border-b border-white/[0.04] text-[10px] uppercase font-bold text-gray-500">
                            <th className="py-2.5">Cliente</th>
                            <th className="py-2.5">Canal / ID</th>
                            <th className="py-2.5 text-center">Prioridad</th>
                            <th className="py-2.5 text-center">SLA Restante</th>
                            <th className="py-2.5 text-center">Modo</th>
                            <th className="py-2.5 text-center">Asignación</th>
                            <th className="py-2.5 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.02]">
                          {conversations.map(conv => {
                            const sla = getSlaTimeLeft(conv);
                            return (
                              <tr key={conv.id} className="hover:bg-white/[0.01]">
                                <td className="py-3">
                                  <div className="font-bold text-white">{conv.customers?.name || 'Cliente'}</div>
                                  <div className="text-[10px] text-gray-500 font-mono mt-0.5">{conv.customers?.phone_number}</div>
                                </td>
                                <td className="py-3 font-mono text-[10px] text-gray-400">
                                  WhatsApp / {conv.id.substring(0, 8)}...
                                </td>
                                <td className="py-3 text-center">
                                  {conv.priority_level ? (
                                    <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                      conv.priority_level === 'critical'
                                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                        : conv.priority_level === 'high'
                                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                        : conv.priority_level === 'medium'
                                        ? 'bg-blue-500/20 text-blue-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}>
                                      {conv.priority_level}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 font-bold uppercase text-[9px]">medium</span>
                                  )}
                                </td>
                                <td className="py-3 text-center">
                                  {conv.mode === 'manual' && sla ? (
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                                      sla.isBreached
                                        ? 'bg-rose-600/30 text-rose-300 border border-rose-500 animate-pulse'
                                        : 'bg-amber-600/20 text-amber-300 font-semibold'
                                    }`}>
                                      {sla.text}
                                    </span>
                                  ) : (
                                    <span className="text-gray-500 italic">Autopiloto Activo</span>
                                  )}
                                </td>
                                <td className="py-3 text-center">
                                  <span className={`px-2 py-0.5 rounded font-bold uppercase text-[9px] ${
                                    conv.mode === 'ai'
                                      ? 'bg-[#00a884]/10 text-[#00a884] border border-[#00a884]/20'
                                      : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                  }`}>
                                    {conv.mode === 'ai' ? '🤖 AI Auto' : '👤 Manual'}
                                  </span>
                                </td>
                                <td className="py-3 text-center">
                                  <select
                                    value={conv.assigned_agent_id || ''}
                                    onChange={(e) => handleReassignAgent(conv.id, e.target.value)}
                                    className="bg-[#121215] text-white border border-white/[0.08] rounded-lg px-2 py-1 text-[11px] focus:outline-none focus:border-[#00a884]/80 font-sans cursor-pointer transition-all"
                                  >
                                    <option value="">Sin Asignar</option>
                                    {agents.map(agent => (
                                      <option key={agent.id} value={agent.id}>
                                        {agent.full_name}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-3 text-right">
                                  {conv.mode === 'ai' ? (
                                    <button
                                      onClick={() => {
                                        setTakeoverConvId(conv.id);
                                        setTakeoverPriority('medium');
                                        setTakeoverNote('');
                                        setIsTakeoverModalOpen(true);
                                      }}
                                      className="px-3 py-1.5 rounded-lg bg-[#00a884] text-black font-bold text-[10px] hover:scale-105 transition-all shadow cursor-pointer"
                                    >
                                      Tomar Control
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => resumeAutopilot(conv.id)}
                                      className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 hover:text-white font-bold text-[10px] hover:bg-gray-700 transition-all shadow cursor-pointer"
                                    >
                                      Reactivar Autopiloto
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );

                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 4: System Notes Timeline */}
              {aiOpsSubTab === 'notes' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 font-sans">
                  {/* Left checklist selector */}
                  <div className="lg:col-span-1 p-5 rounded-2xl bg-[#121215] border border-white/[0.04] space-y-3 flex flex-col max-h-[500px]">
                    <h3 className="text-xs uppercase font-extrabold text-gray-500 tracking-wider">Hilos Activos</h3>
                    <div className="flex-grow overflow-y-auto space-y-1.5">
                      {conversations.map(conv => (
                        <button
                          key={conv.id}
                          onClick={() => setSelectedConvId(conv.id)}
                          className={`w-full p-3 rounded-xl text-left border transition-all text-xs flex flex-col space-y-1 ${
                            selectedConvId === conv.id
                              ? 'bg-white/[0.03] border-[#00a884]/40 text-white'
                              : 'bg-white/[0.01] border-white/[0.02] text-gray-400 hover:bg-white/[0.02]'
                          }`}
                        >
                          <span className="font-bold text-white truncate">{conv.customers?.name || 'Cliente'}</span>
                          <span className="text-[10px] text-gray-500 font-mono">{conv.customers?.phone_number}</span>
                          <div className="flex items-center space-x-1.5 pt-1">
                            <span className={`px-1.5 py-0.5 rounded text-[8px] font-extrabold uppercase ${
                              conv.mode === 'ai' ? 'bg-[#00a884]/10 text-[#00a884]' : 'bg-amber-500/10 text-amber-500'
                            }`}>
                              {conv.mode === 'ai' ? 'AI' : 'MANUAL'}
                            </span>
                            {conv.priority_level && (
                              <span className="px-1.5 py-0.5 rounded bg-white/[0.04] text-gray-400 text-[8px] font-extrabold uppercase">
                                {conv.priority_level}
                              </span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Center notes timeline panel */}
                  <div className="lg:col-span-2 flex flex-col space-y-4">
                    <div className="p-5 rounded-2xl bg-[#121215] border border-white/[0.04] flex-grow flex flex-col space-y-4 min-h-[400px]">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center justify-between">
                        <span>Línea de Tiempo Interna (Notas del Operador)</span>
                        {activeConversation && (
                          <span className="text-[10px] text-gray-500 font-mono">
                            ID: {activeConversation.id.substring(0, 8)}...
                          </span>
                        )}
                      </h3>

                      {selectedConvId ? (
                        <>
                          {/* Note input */}
                          <div className="p-3 bg-[#080d16]/30 border border-white/[0.04] rounded-xl flex items-center space-x-3">
                            <input
                              type="text"
                              value={newNoteText}
                              onChange={e => setNewNoteText(e.target.value)}
                              placeholder="Escribe una nota interna para coordinar..."
                              className="flex-grow bg-[#121215] border border-white/[0.06] rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#00a884]/50 transition-all font-sans"
                            />
                            <button
                              onClick={() => {
                                if (newNoteText.trim()) {
                                  addConversationNote(newNoteText);
                                  setNewNoteText('');
                                }
                              }}
                              disabled={!newNoteText.trim()}
                              className="px-4 py-2.5 rounded-xl bg-gradient-accent text-black font-bold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:scale-105 transition-all shadow cursor-pointer"
                            >
                              Agregar
                            </button>
                          </div>

                          {/* Notes list */}
                          <div className="flex-grow overflow-y-auto max-h-[300px] space-y-4 pr-1.5 pt-2">
                            {notes.length === 0 ? (
                              <div className="m-auto text-center py-10 text-xs text-gray-500 italic">
                                No hay comentarios internos en este hilo.
                              </div>
                            ) : (
                              notes.map(note => (
                                <div key={note.id} className="relative pl-6 pb-2 border-l border-white/[0.04] last:border-l-0">
                                  {/* Timeline marker */}
                                  <div className="absolute top-1 -left-1.5 w-3 h-3 rounded-full bg-[#00a884]/20 border border-[#00a884]" />
                                  
                                  <div className="flex flex-col space-y-1">
                                    <div className="flex items-center space-x-2 text-[10px] font-bold">
                                      <span className="text-[#00a884]">{note.profiles?.full_name || 'Agente'}</span>
                                      <span className="text-gray-500 font-mono">({note.profiles?.email || 'System'})</span>
                                      <span className="text-gray-500 font-mono font-normal">
                                        {new Date(note.created_at).toLocaleDateString()} {new Date(note.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      </span>
                                    </div>
                                    <p className="text-xs text-gray-300 font-sans leading-relaxed whitespace-pre-wrap pl-1 border-l border-white/[0.02]">
                                      {note.body}
                                    </p>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="m-auto text-center text-xs text-gray-500">
                          Selecciona una conversación del listado lateral para ver y agregar notas.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
              {aiOpsSubTab === 'dlq' && (
                <DLQPanel activeOrgId={activeOrg?.id || ''} isDegradedMode={isDegradedMode} />
              )}
              {aiOpsSubTab === 'audit' && (
                <SecurityAuditPanel activeOrgId={activeOrg?.id || ''} isDegradedMode={isDegradedMode} />
              )}
              {aiOpsSubTab === 'settings' && (
                <SettingsPanel activeOrgId={activeOrg?.id || ''} isDegradedMode={isDegradedMode} />
              )}
            </>
          )}
        </div>
      )}

      {/* 5. TAKEOVER приоритет modal */}
      {isTakeoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#121215] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center">
                <span className="text-amber-400 mr-2">👤</span>
                <span>Tomar Control Manual (SLA Takeover)</span>
              </h3>
              <p className="text-xs text-gray-400">
                Pausar el autopilot de IA y definir el SLA de respuesta prioritaria para esta conversación.
              </p>
            </div>

            <form onSubmit={handleTakeoverSubmit} className="space-y-4 text-xs font-sans">
              <div className="flex flex-col space-y-1.5">
                <label className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Nivel de Prioridad & SLA</label>
                <select
                  value={takeoverPriority}
                  onChange={e => setTakeoverPriority(e.target.value as any)}
                  className="bg-[#121215] border border-white/[0.06] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00a884]/50 font-sans cursor-pointer"
                >
                  <option value="low">Prioridad Baja (SLA 24 horas)</option>
                  <option value="medium">Prioridad Media (SLA 4 horas)</option>
                  <option value="high">Prioridad Alta (SLA 1 hora)</option>
                  <option value="critical">Prioridad Crítica (SLA 15 minutos)</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Nota Interna Timeline (Opcional)</label>
                <textarea
                  value={takeoverNote}
                  onChange={e => setTakeoverNote(e.target.value)}
                  placeholder="Detalla la razón por la cual estás tomando el control (e.g. solicitud especial de mesa filtrada o cotización de Stripe)."
                  rows={3}
                  className="bg-[#121215] border border-white/[0.06] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00a884]/50 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTakeoverModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.02] font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTakeover}
                  className="px-5 py-2.5 rounded-xl bg-gradient-accent text-black font-extrabold disabled:opacity-40 hover:scale-105 transition-all  flex items-center justify-center cursor-pointer"
                >
                  {isSubmittingTakeover ? 'Guardando...' : 'Tomar Control ⚡'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. RESOLVE modal */}
      {isResolveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="w-full max-w-md bg-[#121215] border border-white/[0.06] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-5">
            <div className="space-y-1">
              <h3 className="text-base font-bold text-white flex items-center">
                <span className="text-emerald-400 mr-2">✅</span>
                <span>Resolver Conversación</span>
              </h3>
              <p className="text-xs text-gray-400">
                Al cerrar este hilo se generará automáticamente un sumario AI del caso para análisis posterior.
              </p>
            </div>

            <form onSubmit={handleResolveSubmit} className="space-y-4 text-xs font-sans">
              <div className="flex flex-col space-y-1.5">
                <label className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Razón de Cierre</label>
                <select
                  value={resolveReason}
                  onChange={e => setResolveReason(e.target.value)}
                  className="bg-[#121215] border border-white/[0.06] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00a884]/50 font-sans cursor-pointer"
                >
                  <option value="resolved">Resuelto / Completado</option>
                  <option value="sale_closed">Venta Concluida</option>
                  <option value="abandoned">Cliente Inactivo / Abandono</option>
                  <option value="spam">Spam / Inválido</option>
                </select>
              </div>

              <div className="flex flex-col space-y-1.5">
                <label className="text-gray-400 font-bold uppercase text-[9px] tracking-wider">Nota de Cierre (Opcional)</label>
                <textarea
                  value={resolveNote}
                  onChange={e => setResolveNote(e.target.value)}
                  placeholder="Observaciones finales sobre el caso..."
                  rows={3}
                  className="bg-[#121215] border border-white/[0.06] text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-[#00a884]/50 font-sans resize-none"
                />
              </div>

              <div className="flex justify-end items-center space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsResolveModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.02] font-semibold transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingResolve}
                  className="px-5 py-2.5 rounded-xl bg-emerald-500 text-black font-extrabold disabled:opacity-40 hover:scale-105 transition-all  flex items-center justify-center cursor-pointer"
                >
                  {isSubmittingResolve ? 'Cerrando...' : 'Confirmar Resolución'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
