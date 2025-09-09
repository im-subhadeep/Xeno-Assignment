
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import CampaignModel, { ICampaign } from '@/models/campaign';
import CustomerModel, { ICustomer } from '@/models/customer';
import CommunicationLogModel from '@/models/communicationLog';
import mongoose from 'mongoose';
import buildMongoQuery from '@/lib/queryBuilder';
import { auth } from "@/auth";

function personalizeMessage(template: string, customer: ICustomer): string {
    return template
        .replace(/{{name}}/gi, customer.name)
        .replace(/{{email}}/gi, customer.email)
        .replace(/{{totalSpends}}/gi, String(customer.totalSpends ?? 0))
        .replace(/{{visitCount}}/gi, String(customer.visitCount ?? 0));
}

const DUMMY_VENDOR_API_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/dummy-vendor/send`;
const DELIVERY_RECEIPT_CALLBACK_URL = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/delivery-receipts`;

export async function POST(
  request: NextRequest,
  { params }: { params: { campaignId: string } }
) {
  const { campaignId } = params;

  if (!process.env.NEXT_PUBLIC_APP_URL) {
    return NextResponse.json({ message: "Server configuration error: App URL not set." }, { status: 500 });
  }

  if (!mongoose.Types.ObjectId.isValid(campaignId)) {
    return NextResponse.json({ message: "Invalid Campaign ID format" }, { status: 400 });
  }

  try {
    await dbConnect();

    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const campaign = await CampaignModel.findById(campaignId);
    if (!campaign) {
      return NextResponse.json({ message: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === 'SENDING' || campaign.status === 'COMPLETED') {
      return NextResponse.json(
        { message: `Campaign is already ${campaign.status.toLowerCase()} or has been completed.` },
        { status: 409 }
      );
    }

    campaign.status = 'SENDING';
    campaign.sentCount = 0;
    campaign.failedCount = 0;
    campaign.audienceSize = 0;
    await campaign.save();

    let mongoQuery;
    try {
        mongoQuery = buildMongoQuery(campaign.audienceRules);
    } catch (queryBuilderError: any) {
        campaign.status = 'FAILED';
        campaign.failureReason = "Error processing audience rules.";
        await campaign.save();
        return NextResponse.json({ message: "Error processing audience rules.", error: queryBuilderError.message }, { status: 500 });
    }

    let customersInSegment: ICustomer[] = [];
    if (Object.keys(mongoQuery).length > 0) {
        customersInSegment = await CustomerModel.find(mongoQuery).lean();
    } else if (campaign.audienceRules && campaign.audienceRules.conditions.length === 0 && (!campaign.audienceRules.groups || campaign.audienceRules.groups.length === 0)) {
        customersInSegment = await CustomerModel.find({}).lean();
    }

    if (customersInSegment.length === 0) {
      campaign.status = 'COMPLETED';
      campaign.audienceSize = 0;
      await campaign.save();
      return NextResponse.json({ message: "No customers found in the audience. Campaign marked as completed.", campaign }, { status: 200 });
    }
    
    campaign.audienceSize = customersInSegment.length;
    await campaign.save();


    const { MessageBroker } = await import('@/lib/messageQueue');

    let successfullyInitiatedSends = 0;
    const BATCH_SIZE = 100;
    const batches = [];
    
    for (let i = 0; i < customersInSegment.length; i += BATCH_SIZE) {
      batches.push(customersInSegment.slice(i, i + BATCH_SIZE));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const customerIds: string[] = [];

      for (const customer of batch) {
        const personalizedMessageContent = personalizeMessage(campaign.messageTemplate, customer);

        let logEntry;
        try {
          logEntry = await CommunicationLogModel.findOneAndUpdate(
            { campaignId: campaign._id, customerId: customer._id },
            {
              $set: {
                message: personalizedMessageContent,
                status: 'PENDING',
                sentAt: undefined,
                failedAt: undefined,
                failureReason: undefined,
                deliveredAt: undefined,
                vendorMessageId: undefined,
                createdBy: campaign.createdBy ? (campaign.createdBy as any)._id || campaign.createdBy : undefined,
              },
              $setOnInsert: {
                campaignId: campaign._id,
                customerId: customer._id,
                createdAt: new Date(),
              }
            },
            { upsert: true, new: true, runValidators: true }
          );
        } catch (logError: any) {
          continue;
        }


        try {
          await MessageBroker.publishSingleMessage({
            campaignId: campaignId,
            customerId: customer._id?.toString() || '',
            customerEmail: customer.email,
            message: personalizedMessageContent,
            communicationLogId: logEntry._id?.toString() || '',
          });

          customerIds.push(customer._id?.toString() || '');
          successfullyInitiatedSends++;
        } catch (queueError: any) {
          logEntry.status = 'FAILED';
          logEntry.failureReason = `Queue error: ${queueError.message}`;
          logEntry.failedAt = new Date();
          await logEntry.save();
          await CampaignModel.updateOne({ _id: campaign._id }, { $inc: { failedCount: 1 } });
        }
      }

      if (customerIds.length > 0) {
        try {
          await MessageBroker.publishBatchProcess({
            campaignId: campaignId,
            customerIds: customerIds,
            batchSize: BATCH_SIZE,
            batchIndex: batchIndex,
          });
        } catch (batchError: any) {
          // Continue processing other batches
        }
      }
    }

    await MessageBroker.publishCampaignUpdate(campaignId, 'QUEUED', {
      totalCustomers: customersInSegment.length,
      queuedMessages: successfullyInitiatedSends,
      batches: batches.length,
    });

    return NextResponse.json(
      {
        message: `Campaign delivery process initiated for ${successfullyInitiatedSends} of ${customersInSegment.length} customers. Check logs for status.`,
        campaignId: campaign.id.toString(),
        initiatedSends: successfullyInitiatedSends,
        audienceSize: customersInSegment.length,
      },
      { status: 200 }
    );

  } catch (error: any) {
    const campaignToRevert = await CampaignModel.findById(campaignId);
    if (campaignToRevert && campaignToRevert.status === 'SENDING') {
        campaignToRevert.status = 'FAILED';
        campaignToRevert.failureReason = "Critical error during delivery initiation.";
        await campaignToRevert.save();
    }
    return NextResponse.json({ message: "Failed to trigger campaign delivery", error: error.message }, { status: 500 });
  }
}
