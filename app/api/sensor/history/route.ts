import { NextResponse } from "next/server";
import { getHistory } from "@/lib/db";

export async function GET() {
  try {
    console.log("[API] GET /api/sensor/history requested");
    const history = await getHistory(100);
    console.log("[API] History length:", history.length);
    return NextResponse.json(history);
  } catch (error) {
    console.error("[API] Error in /api/sensor/history:", error);
    return NextResponse.json(
      { error: "Failed to get history" },
      { status: 500 }
    );
  }
}
