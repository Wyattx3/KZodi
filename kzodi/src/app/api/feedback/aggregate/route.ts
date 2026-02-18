import { NextRequest, NextResponse } from "next/server";
import { getAggregateFeedback } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const zodiacSign = searchParams.get("zodiacSign") || "";

    if (!zodiacSign) {
      return NextResponse.json(
        { success: false, error: "zodiacSign parameter required" },
        { status: 400 }
      );
    }

    const aggregated = await getAggregateFeedback(zodiacSign);

    return NextResponse.json({
      success: true,
      data: aggregated,
    });
  } catch (error) {
    console.error("Aggregate feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to aggregate feedback" },
      { status: 500 }
    );
  }
}
