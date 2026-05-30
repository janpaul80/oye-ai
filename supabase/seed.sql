-- Oye AI: Core Seed Data
-- Description: Sets up dummy credentials and conversation logs for local system validation.

-- 1. Create a placeholder test workspace (Organization)
INSERT INTO public.organizations (id, name, slug, status, settings)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  'Café Delicioso',
  'cafe-delicioso',
  'active',
  '{"routing_hours": "08:00-18:00", "default_language": "es"}'::jsonb
)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;

-- 2. Create standard active communication channels
INSERT INTO public.channels (id, organization_id, type, provider_channel_id, status)
VALUES (
  '12121212-1212-1212-1212-121212121212',
  '88888888-8888-8888-8888-888888888888',
  'whatsapp',
  'whatsapp-phone-number-id-mock-123',
  'connected'
)
ON CONFLICT (id) DO NOTHING;

-- 3. Create a placeholder Admin User Profile
-- Matches a mock auth user (e.g. Hartman Oye)
INSERT INTO public.profiles (id, email, full_name, is_platform_admin)
VALUES (
  '99999999-9999-9999-9999-999999999999',
  'hartman@example.com',
  'Hartman Oye',
  true
)
ON CONFLICT (id) DO UPDATE SET 
  full_name = EXCLUDED.full_name,
  is_platform_admin = EXCLUDED.is_platform_admin;

-- 4. Map Admin membership to the organization
INSERT INTO public.memberships (organization_id, user_id, role)
VALUES (
  '88888888-8888-8888-8888-888888888888',
  '99999999-9999-9999-9999-999999999999',
  'owner'
)
ON CONFLICT (organization_id, user_id) DO NOTHING;

-- 5. Create default business AI Employee profile
INSERT INTO public.ai_agents (id, organization_id, name, model_provider, model_name, system_prompt, temperature, is_active)
VALUES (
  '55555555-5555-5555-5555-555555555555',
  '88888888-8888-8888-8888-888888888888',
  'Oye Café Assistant',
  'openai',
  'gpt-4o-mini',
  'Eres el mesero virtual de Café Delicioso. Responde con calidez y amabilidad en español. Promueve la especialidad de la casa (Café Arábiga Ecuatoriano). Si te piden agendar una mesa, ofréceles reservar mesa hoy a las 5:00 PM o a las 7:30 PM. Si solicitan pagar, genera un enlace de Stripe.',
  0.7,
  true
)
ON CONFLICT (id) DO NOTHING;

-- 6. Insert Mock Customers
INSERT INTO public.customers (id, organization_id, name, phone_number, custom_attributes)
VALUES 
  (
    '11111111-caca-caca-caca-111111111111', 
    '88888888-8888-8888-8888-888888888888', 
    'Juan Pérez', 
    '+593998887777', 
    '{"tags": ["Cliente Frecuente"], "notes": "Prefiere café filtrado sin azúcar."}'::jsonb
  ),
  (
    '22222222-caca-caca-caca-222222222222', 
    '88888888-8888-8888-8888-888888888888', 
    'María Souza', 
    '+5511999998888', 
    '{"tags": ["Extranjero", "VIP"], "notes": "Habla portugués."}'::jsonb
  )
ON CONFLICT (id) DO NOTHING;

-- 7. Open Active Conversations
INSERT INTO public.conversations (id, organization_id, customer_id, channel_id, assigned_agent_id, status, mode, summary, language)
VALUES 
  (
    '33333333-3333-3333-3333-333333333333',
    '88888888-8888-8888-8888-888888888888',
    '11111111-caca-caca-caca-111111111111',
    '12121212-1212-1212-1212-121212121212',
    '99999999-9999-9999-9999-999999999999',
    'open',
    'ai',
    'El cliente está preguntando por la disponibilidad de agendamiento y especialidades de café.',
    'es'
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '88888888-8888-8888-8888-888888888888',
    '22222222-caca-caca-caca-222222222222',
    '12121212-1212-1212-1212-121212121212',
    NULL,
    'open',
    'manual',
    'La cliente solicita asistencia manual para verificar el cobro de Stripe.',
    'es'
  )
ON CONFLICT (id) DO NOTHING;

-- 8. Seed Message Logs
INSERT INTO public.messages (id, organization_id, conversation_id, direction, sender_type, sender_id, message_type, body, delivery_status, created_at)
VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    '88888888-8888-8888-8888-888888888888',
    '33333333-3333-3333-3333-333333333333',
    'inbound',
    'customer',
    '11111111-caca-caca-caca-111111111111',
    'text',
    'Hola, buenas tardes.',
    'read',
    NOW() - INTERVAL '15 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    '88888888-8888-8888-8888-888888888888',
    '33333333-3333-3333-3333-333333333333',
    'outbound',
    'ai',
    '55555555-5555-5555-5555-555555555555',
    'text',
    '¡Hola! Bienvenido a Café Delicioso ⚡. Soy tu mesero virtual autónomo. ¿En qué te puedo servir hoy? Te recomiendo nuestra especialidad: el riquísimo Café Arábiga Ecuatoriano.',
    'read',
    NOW() - INTERVAL '14 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    '88888888-8888-8888-8888-888888888888',
    '33333333-3333-3333-3333-333333333333',
    'inbound',
    'customer',
    '11111111-caca-caca-caca-111111111111',
    'text',
    '¿Tienen disponibilidad para reservar mesa hoy?',
    'read',
    NOW() - INTERVAL '2 minutes'
  ),
  
  -- Maria Souza's chat
  (
    '00000000-0000-0000-0000-000000000004',
    '88888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444',
    'inbound',
    'customer',
    '22222222-caca-caca-caca-222222222222',
    'text',
    'Olá, preciso pagar a conta.',
    'read',
    NOW() - INTERVAL '1 hour'
  ),
  (
    '00000000-0000-0000-0000-000000000005',
    '88888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444',
    'outbound',
    'agent',
    '99999999-9999-9999-9999-999999999999',
    'text',
    'Hola María, claro. Aquí tienes tu link seguro generado por Stripe.',
    'read',
    NOW() - INTERVAL '50 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000006',
    '88888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444',
    'outbound',
    'ai',
    '55555555-5555-5555-5555-555555555555',
    'text',
    '💳 Cobro Seguro Stripe: https://checkout.stripe.com/pay/oye_mvp_lnk_seeded_9921',
    'read',
    NOW() - INTERVAL '50 minutes'
  ),
  (
    '00000000-0000-0000-0000-000000000007',
    '88888888-8888-8888-8888-888888888888',
    '44444444-4444-4444-4444-444444444444',
    'inbound',
    'customer',
    '22222222-caca-caca-caca-222222222222',
    'text',
    'Obrigado pelo link, acabei de pagar.',
    'read',
    NOW() - INTERVAL '40 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- 9. Seed the Usage Ledger
INSERT INTO public.usage_ledger (id, organization_id, tokens_used, messages_processed, month_year)
VALUES (
  '12121212-0000-0000-0000-000000000000',
  '88888888-8888-8888-8888-888888888888',
  1250,
  4,
  '2026-05'
)
ON CONFLICT (id) DO NOTHING;
