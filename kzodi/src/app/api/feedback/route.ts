import { NextRequest, NextResponse } from "next/server";
import { insertFeedback } from "@/lib/db";

interface FeedbackRequest {
  sessionId: string;
  zodiacSign: string;
  mbtiType: string;
  birthChart: Record<string, unknown> | null;
  section: string;
  accuracyPercent: number;
  feedbackText: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();
    const {
      sessionId,
      zodiacSign,
      mbtiType,
      birthChart,
      section,
      accuracyPercent,
      feedbackText,
    } = body;

    if (!sessionId || !section || accuracyPercent === undefined) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    await insertFeedback({
      sessionId,
      zodiacSign: zodiacSign || "",
      mbtiType: mbtiType || "",
      birthChart,
      section,
      accuracyPercent,
      feedbackText: feedbackText || "",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Feedback error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save feedback" },
      { status: 500 }
    );
  }
}
