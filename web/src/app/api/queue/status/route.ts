// app/api/queue/status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { campaignQueue, batchProcessingQueue } from '@/lib/messageQueue';
import { auth } from "@/auth";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    // Get queue statistics
    const [campaignWaiting, campaignActive, campaignCompleted, campaignFailed] = await Promise.all([
      campaignQueue.getWaiting(),
      campaignQueue.getActive(),
      campaignQueue.getCompleted(),
      campaignQueue.getFailed(),
    ]);

    const [batchWaiting, batchActive, batchCompleted, batchFailed] = await Promise.all([
      batchProcessingQueue.getWaiting(),
      batchProcessingQueue.getActive(),
      batchProcessingQueue.getCompleted(),
      batchProcessingQueue.getFailed(),
    ]);

    return NextResponse.json({
      campaignQueue: {
        waiting: campaignWaiting.length,
        active: campaignActive.length,
        completed: campaignCompleted.length,
        failed: campaignFailed.length,
        jobs: {
          waiting: campaignWaiting.slice(0, 10).map(job => ({
            id: job.id,
            data: job.data,
            timestamp: job.timestamp,
          })),
          active: campaignActive.slice(0, 10).map(job => ({
            id: job.id,
            data: job.data,
            timestamp: job.timestamp,
          })),
        }
      },
      batchProcessingQueue: {
        waiting: batchWaiting.length,
        active: batchActive.length,
        completed: batchCompleted.length,
        failed: batchFailed.length,
      },
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Queue status error:', error);
    return NextResponse.json(
      { message: "Failed to get queue status", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'clean-completed':
        await campaignQueue.clean(0, 100, 'completed');
        await batchProcessingQueue.clean(0, 100, 'completed');
        return NextResponse.json({ message: "Cleaned completed jobs" });

      case 'clean-failed':
        await campaignQueue.clean(0, 100, 'failed');
        await batchProcessingQueue.clean(0, 100, 'failed');
        return NextResponse.json({ message: "Cleaned failed jobs" });

      case 'drain':
        await campaignQueue.drain();
        await batchProcessingQueue.drain();
        return NextResponse.json({ message: "Drained all queues" });

      default:
        return NextResponse.json({ message: "Invalid action" }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Queue management error:', error);
    return NextResponse.json(
      { message: "Failed to manage queue", error: error.message },
      { status: 500 }
    );
  }
}
