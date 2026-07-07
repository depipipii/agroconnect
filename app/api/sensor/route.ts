import { NextResponse } from "next/server";
import { addReading } from "@/lib/db";

export async function POST(request: Request) {
  try {
    console.log("[API] POST /api/sensor requested");
    const body = await request.json();
    console.log("[API] Received body:", body);
    const { moisture } = body;

    if (typeof moisture !== "number" || moisture < 0 || moisture > 100) {
      console.error("[API] Invalid moisture value:", moisture);
      return NextResponse.json(
        { error: "Invalid moisture value" },
        { status: 400 }
      );
    }

    await addReading(moisture);
    console.log("[API] Successfully added reading:", moisture);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[API] Error in /api/sensor POST:", error);
    return NextResponse.json(
      { error: "Failed to add reading" },
      { status: 500 }
    );
  }
}
