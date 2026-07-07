import { NextResponse } from "next/server";
import { getLatestReading, getTotalReadings } from "@/lib/db";

export async function GET() {
  try {
    console.log("[API] GET /api/sensor/latest requested");
    const latest = await getLatestReading();
    const total = await getTotalReadings();
    console.log("[API] Latest data:", { latest, total });

    return NextResponse.json({
      moisture: latest?.moisture || 0,
      totalReadings: total,
      createdAt: latest?.created_at || new Date().toISOString(),
    });
  } catch (error) {
    console.error("[API] Error in /api/sensor/latest:", error);
    return NextResponse.json(
      { error: "Failed to get latest reading" },
      { status: 500 }
    );
  }
}
