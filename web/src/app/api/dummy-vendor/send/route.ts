// app/api/dummy-vendor/send/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";

function randomStatus(): 'SENT' | 'FAILED' {
  return Math.random() < 0.9 ? "SENT" : "FAILED";
}

export async function POST(req: NextRequest) {
  try {
    const { customerId, message, communicationLogId, callbackUrl, customerEmail } = await req.json();

    if (!customerId || !message || !communicationLogId || !callbackUrl) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    const delay = 1000 + Math.random() * 1000;
    await new Promise((resolve) => setTimeout(resolve, delay));

    const status = randomStatus();
    const vendorMessageId = `vendor_${communicationLogId}_${Date.now()}`;
    const timestamp = new Date().toISOString();

    const payload: any = {
      communicationLogId,
      status,
      vendorMessageId,
      timestamp,
    };

    if (status === "FAILED") {
      payload.failureReason = "Simulated delivery failure by vendor";
    }

    try {
        const callbackResponse = await fetch(callbackUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
        });
    } catch (callbackError: any) {
        // Continue processing
    }

    return NextResponse.json({ message: "Message processing simulated by vendor", status, vendorMessageId }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ message: "Internal server error in dummy vendor", error: error.message }, { status: 500 });
  }
}
