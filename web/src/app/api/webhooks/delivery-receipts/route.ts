// app/api/webhooks/delivery-receipts/route.ts
import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect"; 
import CommunicationLogModel from "@/models/communicationLog"; 
import CampaignModel from "@/models/campaign"; 
import mongoose from "mongoose";

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    const body = await req.json();

    const { communicationLogId, status, vendorMessageId, timestamp, failureReason } = body;

    if (!communicationLogId || !status || !vendorMessageId || !timestamp) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    if (!mongoose.Types.ObjectId.isValid(communicationLogId)) {
        return NextResponse.json({ message: "Invalid communicationLogId format" }, { status: 400 });
    }

    const log = await CommunicationLogModel.findById(communicationLogId);
    if (!log) {
      return NextResponse.json({ message: "Log not found" }, { status: 404 });
    }

    log.status = status;
    log.vendorMessageId = vendorMessageId;

    const parsedTimestamp = new Date(timestamp);

    if (status === "SENT" || status === "DELIVERED") {
      log.sentAt = parsedTimestamp;
      log.failedAt = undefined;
      log.failureReason = undefined;
    } else if (status === "FAILED") {
      log.failedAt = parsedTimestamp;
      log.failureReason = failureReason || "Unknown failure from vendor";
      log.sentAt = undefined;
    }
    await log.save();

    const { MessageBroker } = await import('@/lib/messageQueue');
    await MessageBroker.publishDeliveryStatus(communicationLogId, status, {
      vendorMessageId,
      timestamp: parsedTimestamp,
      failureReason: status === "FAILED" ? failureReason : undefined,
    });

    if (log.campaignId && (status === "SENT" || status === "DELIVERED" || status === "FAILED")) {
        const update = (status === "SENT" || status === "DELIVERED")
        ? { $inc: { sentCount: 1 } }
        : { $inc: { failedCount: 1 } };
        
        await CampaignModel.updateOne({ _id: log.campaignId }, update);

        const campaign = await CampaignModel.findById(log.campaignId);
        if (campaign && campaign.audienceSize > 0) {
            if (campaign.audienceSize === (campaign.sentCount + campaign.failedCount)) {
                if (campaign.status !== "COMPLETED") {
                    await CampaignModel.updateOne({ _id: log.campaignId }, { status: "COMPLETED" });
                }
            }
        }
    }

    return NextResponse.json({ message: "Log updated successfully via webhook" }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error in webhook", error: error.message }, { status: 500 });
  }
}
