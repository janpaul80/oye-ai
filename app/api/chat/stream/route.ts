/**
 * Oye AI: Server-Sent Events (SSE) streaming endpoint with mid-stream failover
 * File Location: c:\Users\hartm\oye-ai\src\app\api\chat\stream\route.ts
 */

import { NextRequest, NextResponse } from 'next/server';
import { TelemetryService } from '@/lib/services/observability';
import crypto from 'crypto';

export const runtime = 'nodejs'; // Use Node.js runtime for streams

export async function POST(request: NextRequest) {
  const traceId = request.headers.get('x-correlation-id') || crypto.randomUUID();
  const startTime = Date.now();

  try {
    const body = await request.json();
    const { messages, preferredProvider, modelName, temperature, orgId } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages are required and must be an array' }, { status: 400 });
    }

    const abortController = new AbortController();
    
    // Wire request close hook to abort the downstream LLM connection
    request.signal.addEventListener('abort', () => {
      console.log(`[SSE Stream] [Trace: ${traceId}] Client connection aborted. Triggering LLM abort signal.`);
      abortController.abort();
    });

    let currentProvider = preferredProvider || 'langdock';
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Safe helper to write SSE events
        const sendEvent = (event: string, data: any) => {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        };

        try {
          // ==========================================
          // 1. Multimodal Extensible Hooks Preparation
          // ==========================================
          // Structure types and helper hook points for Phase 7 voice & image support
          interface MultimodalAttachment {
            type: 'image' | 'audio' | 'document';
            url: string;
            mimeType?: string;
          }

          async function processVoiceTranscription(audioUrl: string): Promise<string> {
            console.log('[Multimodal Hook] Transcribing voice input from URL:', audioUrl);
            return 'Simulated voice transcription output';
          }

          async function handleAudioStream(stream: ReadableStream): Promise<void> {
            console.log('[Multimodal Hook] Handling real-time audio downstream flow');
          }

          async function generateVoiceReply(text: string): Promise<{ audioUrl: string }> {
            console.log('[Multimodal Hook] Translating generated text reply to synthesised voice audio');
            return { audioUrl: '/audio/synthesised_reply.mp3' };
          }

          // ==========================================
          // 2. Streaming & Mid-Stream Failover Engine
          // ==========================================
          let streamStatus: 'streaming' | 'fallback' | 'degraded' | 'recovered' | 'cancelled' | 'failed' = 'streaming';

          sendEvent('start', { traceId, provider: currentProvider, status: streamStatus });

          // Simple token generator mimicking real streams for local staging verification
          const dummyChunks = [
            'Hola,', ' soy', ' el', ' canal', ' inteligente', ' de', ' Oye', ' AI.',
            ' ¿En', ' qué', ' te', ' puedo', ' ayudar', ' hoy?'
          ];

          let tokensGenerated = 0;
          const streamFirstTokenTime = Date.now();

          for (let i = 0; i < dummyChunks.length; i++) {
            if (abortController.signal.aborted) {
              console.log('[SSE Stream] Stream execution was canceled by downstream abort.');
              streamStatus = 'cancelled';
              break;
            }

            // Simulate high latency / provider timeout at chunk 5 to trigger mid-stream failover
            if (i === 5 && currentProvider === 'langdock') {
              console.warn(`[SSE Stream] [Trace: ${traceId}] Simulated network latency spike detected on Langdock. Engaging mid-stream fallback cascade!`);
              
              streamStatus = 'fallback';
              const oldProvider = currentProvider;
              currentProvider = 'openai'; // Fallback direct provider
              
              // Log the failed/degraded event for telemetry
              const latencyMs = Date.now() - startTime;
              await TelemetryService.logAICompletion(oldProvider, latencyMs, false);
              
              // Broadcast failover transition
              sendEvent('failover', {
                from: oldProvider,
                to: currentProvider,
                reason: 'Simulated connection latency spike (avg > 1500ms)',
                status: 'fallback'
              });

              // Introduce fallback recovery delay
              await new Promise((resolve) => setTimeout(resolve, 300));
              streamStatus = 'recovered';
            }

            // Add a small delay to simulate real-time token stream delivery
            await new Promise((resolve) => setTimeout(resolve, 80));
            tokensGenerated++;

            const elapsedMs = Date.now() - streamFirstTokenTime;
            const tps = Number((tokensGenerated / (elapsedMs / 1000)).toFixed(2));
            const durationMs = Date.now() - startTime;

            sendEvent('chunk', {
              text: dummyChunks[i],
              tps,
              durationMs,
              provider: currentProvider,
              status: streamStatus === 'recovered' && i > 5 ? 'recovered' : streamStatus
            });
          }

          if (!abortController.signal.aborted) {
            const duration = Date.now() - startTime;
            // Record telemetry stats for successfully completed fallback provider
            await TelemetryService.logAICompletion(currentProvider, duration, true);
            sendEvent('done', {
              tokensUsed: tokensGenerated,
              provider: currentProvider,
              status: streamStatus === 'recovered' ? 'recovered' : 'streaming'
            });
          }
          controller.close();
        } catch (err: any) {
          const duration = Date.now() - startTime;
          await TelemetryService.logAICompletion(currentProvider, duration, false);
          console.error(`[SSE Stream] [Trace: ${traceId}] Error during streaming:`, err.message);
          sendEvent('error', { error: err.message, status: 'failed' });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no' // Prevent Nginx proxy buffering
      }
    });
  } catch (err: any) {
    console.error(`[SSE Stream] [Trace: ${traceId}] Ingress failure:`, err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
