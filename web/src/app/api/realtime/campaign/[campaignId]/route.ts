// app/api/realtime/campaign/[campaignId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { realtimeSubscriber } from '@/lib/realtimeSubscriber';

export async function GET(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { campaignId } = params;

  // Create a ReadableStream for Server-Sent Events
  const stream = new ReadableStream({
    start(controller) {
      // Subscribe to campaign updates
      const unsubscribe = realtimeSubscriber.subscribeToCampaignUpdates(
        campaignId,
        (data) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(new TextEncoder().encode(message));
        }
      );

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        unsubscribe();
        controller.close();
      });

      // Send initial connection message
      const initialMessage = `data: ${JSON.stringify({
        type: 'connected',
        campaignId,
        timestamp: new Date().toISOString(),
      })}\n\n`;
      controller.enqueue(new TextEncoder().encode(initialMessage));
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}
