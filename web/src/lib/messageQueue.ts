import { Queue, Worker, Job } from 'bullmq';
import redisConnection from './redis-pubsub';
import CommunicationLogModel from '@/models/communicationLog';
import CampaignModel from '@/models/campaign';
import dbConnect from './dbConnect';

// Define job types
export interface CampaignDeliveryJob {
  campaignId: string;
  customerId: string;
  message: string;
  customerEmail: string;
  communicationLogId: string;
}

export interface BatchProcessingJob {
  campaignId: string;
  customerIds: string[];
  batchSize: number;
  batchIndex: number;
}

// Create queues
export const campaignQueue = new Queue('campaign-delivery', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  },
});

export const batchProcessingQueue = new Queue('batch-processing', {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'fixed',
      delay: 5000,
    },
    removeOnComplete: 50,
    removeOnFail: 25,
  },
});

// Publisher functions
export class MessageBroker {
  static async publishSingleMessage(jobData: CampaignDeliveryJob) {
    await campaignQueue.add('send-message', jobData, {
      priority: 1,
      delay: 0,
    });
  }

  static async publishBatchProcess(jobData: BatchProcessingJob) {
    await batchProcessingQueue.add('process-batch', jobData, {
      priority: 2,
      delay: 0,
    });
  }

  static async publishDelayedMessage(jobData: CampaignDeliveryJob, delayMs: number) {
    await campaignQueue.add('send-message', jobData, {
      delay: delayMs,
      priority: 1,
    });
  }

  // Pub/Sub for real-time updates
  static async publishCampaignUpdate(campaignId: string, status: string, data: any) {
    await redisConnection.publish('campaign-updates', JSON.stringify({
      campaignId,
      status,
      data,
      timestamp: new Date().toISOString(),
    }));
  }

  static async publishDeliveryStatus(communicationLogId: string, status: string, data: any) {
    await redisConnection.publish('delivery-status', JSON.stringify({
      communicationLogId,
      status,
      data,
      timestamp: new Date().toISOString(),
    }));
  }
}

// Helper function to send message to vendor
async function sendToVendor(jobData: CampaignDeliveryJob): Promise<boolean> {
  const DUMMY_VENDOR_API_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/dummy-vendor/send`;
  const DELIVERY_RECEIPT_CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/delivery-receipts`;

  const vendorPayload = {
    customerId: jobData.customerId,
    customerEmail: jobData.customerEmail,
    message: jobData.message,
    communicationLogId: jobData.communicationLogId,
    callbackUrl: DELIVERY_RECEIPT_CALLBACK_URL,
  };

  const response = await fetch(DUMMY_VENDOR_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(vendorPayload),
  });

  if (!response.ok) {
    throw new Error(`Vendor API returned ${response.status}`);
  }

  return true;
}

// Worker for single message processing
export const messageWorker = new Worker(
  'campaign-delivery',
  async (job: Job<CampaignDeliveryJob>) => {
    await dbConnect();
    
    try {
      await CommunicationLogModel.findByIdAndUpdate(
        job.data.communicationLogId,
        { status: 'SENDING' }
      );

      await sendToVendor(job.data);

      await MessageBroker.publishDeliveryStatus(
        job.data.communicationLogId,
        'SENT_TO_VENDOR',
        { customerId: job.data.customerId }
      );

      return { success: true, communicationLogId: job.data.communicationLogId };
      
    } catch (error: any) {
      await CommunicationLogModel.findByIdAndUpdate(
        job.data.communicationLogId,
        { 
          status: 'FAILED',
          failureReason: error.message,
          failedAt: new Date()
        }
      );

      await CampaignModel.findByIdAndUpdate(
        job.data.campaignId,
        { $inc: { failedCount: 1 } }
      );

      await MessageBroker.publishDeliveryStatus(
        job.data.communicationLogId,
        'FAILED',
        { error: error.message }
      );

      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,
  }
);

export const batchWorker = new Worker(
  'batch-processing',
  async (job: Job<BatchProcessingJob>) => {
    await dbConnect();
    await MessageBroker.publishCampaignUpdate(
      job.data.campaignId,
      'BATCH_PROCESSED',
      { 
        batchIndex: job.data.batchIndex,
        processedCount: job.data.customerIds.length
      }
    );

    return { 
      success: true, 
      batchIndex: job.data.batchIndex,
      processedCount: job.data.customerIds.length
    };
  },
  {
    connection: redisConnection,
    concurrency: 2,
  }
);

// @ts-ignore
campaignQueue.on('completed', (job, result) => {});

// @ts-ignore
campaignQueue.on('failed', (job, err) => {});

// @ts-ignore
campaignQueue.on('waiting', (job) => {});

// @ts-ignore
campaignQueue.on('error', (err) => {});

// Graceful shutdown
process.on('SIGTERM', async () => {
  await messageWorker.close();
  await batchWorker.close();
  await campaignQueue.close();
  await batchProcessingQueue.close();
});
