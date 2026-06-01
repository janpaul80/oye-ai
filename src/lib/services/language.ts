import { createAdminClient } from '@/lib/supabase/server';

export type SupportedLocale = 'es' | 'en' | 'pt' | 'fr';

const LANGUAGE_PATTERNS = {
  es: /\b(hola|gracias|buenos|buenas|como|qué|cuándo|dónde|por qué| quiero| necesito| tienes|tienen|para|con|sin|ser|estar|hacer|tengo|nombre|contacto|reservar|agendar|cita|precio|costo|atención|horario|abierto|cerrado|día|noche|mañana|tarde|noche|pregunta|respuesta|ayuda|soporte|problema|solución|cuenta|pagar|pago|tarjeta|transferencia|ubicación|dirección|teléfono|correo|email|whatsapp|mensaje|ventas|comprar|compro)\b/i,
  en: /\b(hello|thanks|thank|good|morning|afternoon|evening|how|what|when|where|why| want| need| have|does|do|can|could|should|make|get|take|give|tell|ask|say|think|know|see|come|go|look|use|work|try|call|need|want|book|reserve|schedule|appointment|price|cost|pay|payment|card|transfer|location|address|phone|email|contact|sales|buy|purchase|help|support|question|answer|problem|solution)\b/i,
  pt: /\b(olá|obrigado|obrigada|bom|boa|como|o que|quando|onde|por que| preciso|quer|tenho|tem|para|com|ser|estar|fazer|tenho|falar|perguntar|responder|ajuda|problema|solução|conta|pagar|pagamentocartão|transferência|localização|endereço|telefone|email|contato|vendas|comprar|reservar|agendar|marcar|horário|atendimento)\b/i,
  fr: /\b(bonjour|merci|comment|quoi|quand|où|pourquoi| veux| ai| avoir|devrait|faire|peut|être|sans|avec|parler|demander|répondre|aider|problème|solution|compte|payer|paiement|carte|virement|adresse|téléphone|email|contact|acheter|réserver|prendre|rendezvous|prix|coût|horaire)\b/i
};

export async function detectLanguage(text: string): Promise<SupportedLocale> {
  const lowerText = text.toLowerCase();
  
  // Check against patterns for each language
  for (const [lang, pattern] of Object.entries(LANGUAGE_PATTERNS)) {
    if (pattern.test(lowerText)) {
      return lang as SupportedLocale;
    }
  }
  
  // Default to Spanish for Latin American market
  return 'es';
}

export function isSupportedLanguage(locale: string): locale is SupportedLocale {
  return ['es', 'en', 'pt', 'fr'].includes(locale);
}

export async function getConversationLanguage(
  orgId: string,
  conversationId: string
): Promise<SupportedLocale> {
  try {
    const admin = await createAdminClient();
    
    // First check if language is stored in conversation
    const { data: conv } = await admin
      .from('conversations')
      .select('language')
      .eq('id', conversationId)
      .single();
    
    if (conv?.language && isSupportedLanguage(conv.language)) {
      return conv.language;
    }
    
    // Otherwise detect from recent messages
    const { data: recentMessages } = await admin
      .from('messages')
      .select('body')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (recentMessages && recentMessages.length > 0) {
      const combinedText = recentMessages.map(m => m.body).join(' ');
      return detectLanguage(combinedText);
    }
    
    // Check organization's default language
    const { data: org } = await admin
      .from('organizations')
      .select('language')
      .eq('id', orgId)
      .single();
    
    if (org?.language && isSupportedLanguage(org.language)) {
      return org.language;
    }
    
  } catch (error) {
    console.error('[Language Detection] Error:', error);
  }
  
  return 'es'; // Default to Spanish
}

export function getLanguageName(locale: SupportedLocale): string {
  const names: Record<SupportedLocale, string> = {
    es: 'Español',
    en: 'English',
    pt: 'Português',
    fr: 'Français'
  };
  return names[locale] || 'Español';
}