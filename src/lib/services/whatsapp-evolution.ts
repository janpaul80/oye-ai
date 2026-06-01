import { createAdminClient } from '../supabase/server';

/**
 * Evolution API Client
 * Connects OYE AI to self-hosted Evolution API for WhatsApp messaging
 */

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';

export interface EvolutionInstance {
  name: string;
  phone?: string;
  status: 'pending' | 'connected' | 'disconnected';
  qrCode?: string;
}

export interface EvolutionMessage {
  phone: string;
  message: string;
}

/**
 * Create a new WhatsApp instance for an organization
 */
export async function createInstance(orgId: string): Promise<EvolutionInstance> {
  const instanceName = `oye-${orgId}`;
  
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        instanceName,
        qrCode: true
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create instance: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      name: instanceName,
      status: 'pending',
      qrCode: data.qrCode?.code
    };
  } catch (error) {
    console.error('[Evolution] Create instance error:', error);
    throw error;
  }
}

/**
 * Get instance status
 */
export async function getInstanceStatus(instanceName: string): Promise<EvolutionInstance> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (response.status === 404) {
      return { name: instanceName, status: 'disconnected' };
    }
    
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      name: instanceName,
      phone: data.phoneNumber,
      status: data.state === 'open' ? 'connected' : 'disconnected'
    };
  } catch (error) {
    console.error('[Evolution] Get status error:', error);
    return { name: instanceName, status: 'disconnected' };
  }
}

/**
 * Connect to existing instance (get QR for pairing)
 */
export async function connectInstance(instanceName: string): Promise<EvolutionInstance> {
  try {
    // Generate new pairing QR code
    const response = await fetch(`${EVOLUTION_API_URL}/instance/connect/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to connect: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return {
      name: instanceName,
      status: 'pending',
      qrCode: data.qrCode?.code
    };
  } catch (error) {
    console.error('[Evolution] Connect error:', error);
    throw error;
  }
}

/**
 * Logout/disconnect instance
 */
export async function logoutInstance(instanceName: string): Promise<void> {
  try {
    await fetch(`${EVOLUTION_API_URL}/instance/logout/${instanceName}`, {
      method: 'DELETE',
      headers: {
        'apikey': EVOLUTION_API_KEY
      }
    });
  } catch (error) {
    console.error('[Evolution] Logout error:', error);
  }
}

/**
 * Send a WhatsApp message
 */
export async function sendMessage(instanceName: string, phone: string, message: string): Promise<void> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendText/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: phone,
        text: message
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Evolution] Send error:', error);
    throw error;
  }
}

/**
 * Send a media message (image, audio, document)
 */
export async function sendMediaMessage(
  instanceName: string, 
  phone: string, 
  mediaUrl: string, 
  caption?: string
): Promise<void> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/message/sendMedia/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: JSON.stringify({
        number: phone,
        mediaUrl,
        caption
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to send media: ${response.statusText}`);
    }
  } catch (error) {
    console.error('[Evolution] Send media error:', error);
    throw error;
  }
}

/**
 * Health check
 */
export async function checkEvolutionHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${EVOLUTION_API_URL}/health`, {
      headers: { 'apikey': EVOLUTION_API_KEY }
    });
    return response.ok;
  } catch {
    return false;
  }
}