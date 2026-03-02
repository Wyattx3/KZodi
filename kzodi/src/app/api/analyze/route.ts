import { NextRequest, NextResponse } from "next/server";
import { computeBirthChart, chartToPromptText, type BirthChartResult } from "@/lib/birthchart";
import { getAggregateFeedback, insertReading } from "@/lib/db";
import { groq, MODELS } from "@/lib/groq";
import { find as findTimezone } from "geo-tz/dist/find-now";
import { searchExa, searchTavily } from "@/lib/search";

interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  latitude: number;
  longitude: number;
  timezone: number;
}

interface AnalyzeRequest {
  sessionId?: string;
  zodiacSign: string;
  mbtiType: string;
  partnerZodiac?: string;
  partnerMbti?: string;
  relationshipStatus: string;
  rsDuration?: string;
  birthData?: BirthData;
  partnerBirthData?: BirthData | null;
}



/** Robust JSON parser with multiple repair strategies */
function safeParseJson(raw: string): Record<string, string> {
  if (!raw || raw.length < 10) return {};

  // 1. Direct parse
  try {
    const obj = JSON.parse(raw);
    if (typeof obj === "object" && obj !== null) {
      console.log("[JSON] Direct parse OK, keys:", Object.keys(obj));
      return obj;
    }
  } catch { /* continue */ }

  // 2. Extract JSON block from text
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[0]);
      console.log("[JSON] Extracted parse OK, keys:", Object.keys(obj));
      return obj;
    } catch { /* continue */ }

    // 3. Fix common issues: unescaped newlines, quotes
    try {
      let fixed = jsonMatch[0];
      fixed = fixed.replace(/(?<=:\s*")([\s\S]*?)(?="(?:\s*[,}]))/g, (match) =>
        match.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n").replace(/\r/g, "\\r").replace(/\t/g, "\\t")
      );
      const obj = JSON.parse(fixed);
      console.log("[JSON] Repaired parse OK, keys:", Object.keys(obj));
      return obj;
    } catch { /* continue */ }
  }

  // 4. Field-by-field regex extraction
  console.log("[JSON] Falling back to field extraction");
  const fields = ["personality", "love", "compatibility", "likes", "chartReading"];
  const result: Record<string, string> = {};

  for (let i = 0; i < fields.length; i++) {
    const key = fields[i];
    const nextKey = fields[i + 1];
    const pattern = nextKey
      ? new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*,\\s*"${nextKey}"`)
      : new RegExp(`"${key}"\\s*:\\s*"([\\s\\S]*?)"\\s*\\}`);
    const m = raw.match(pattern);
    if (m) {
      result[key] = m[1].replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\\/g, "\\");
    }
  }

  const found = Object.keys(result);
  console.log("[JSON] Field extraction found:", found);
  return found.length > 0 ? result : { personality: raw.slice(0, 2000) };
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    const { sessionId, zodiacSign, mbtiType, partnerZodiac, partnerMbti, relationshipStatus, rsDuration, birthData, partnerBirthData } = body;

    console.log("[Analyze] Request:", { zodiacSign, mbtiType, relationshipStatus, hasBirthData: !!birthData });
    if (birthData) {
      console.log("[Analyze] birthData:", JSON.stringify(birthData));
    }

    // Compute birth chart
    let chart: BirthChartResult | null = null;
    let chartText = "";
    if (birthData && birthData.year && birthData.latitude !== 0) {
      try {
        // Fix timezone using geo-tz (accurate IANA timezone lookup)
        try {
          const tzIds = findTimezone(birthData.latitude, birthData.longitude);
          if (tzIds && tzIds.length > 0) {
            const tzId = tzIds[0]; // e.g. "Asia/Yangon"
            // Get UTC offset for this timezone at the birth date
            const birthDate = new Date(
              birthData.year, birthData.month - 1, birthData.day,
              birthData.hour, birthData.minute, 0
            );
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: tzId,
              timeZoneName: "shortOffset",
            });
            const parts = formatter.formatToParts(birthDate);
            const offsetPart = parts.find(p => p.type === "timeZoneName");
            if (offsetPart) {
              // Parse "GMT+6:30" or "GMT-5" format
              const m = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
              if (m) {
                const sign = m[1] === "-" ? -1 : 1;
                const hours = parseInt(m[2]);
                const minutes = parseInt(m[3] || "0");
                const correctedTz = sign * (hours + minutes / 60);
                console.log(`[Analyze] Timezone corrected: ${birthData.timezone} -> ${correctedTz} (${tzId})`);
                birthData.timezone = correctedTz;
              }
            }
          }
        } catch (tzErr) {
          console.warn("[Analyze] geo-tz lookup failed, using client timezone:", tzErr);
        }

        console.log(`[Analyze] Computing chart: ${birthData.year}-${birthData.month}-${birthData.day} ${birthData.hour}:${birthData.minute} lat=${birthData.latitude} lng=${birthData.longitude} tz=${birthData.timezone}`);
        chart = computeBirthChart(birthData);
        // Log Moon position to verify time sensitivity
        const moon = chart.planets.find(p => p.name === "Moon");
        console.log(`[Analyze] Moon: ${moon?.sign} ${moon?.degree} (lon: ${moon?.longitude})`);
        chartText = chartToPromptText(chart);
        console.log("[Analyze] Birth chart computed");
      } catch (e) {
        console.error("[Analyze] Chart calc error:", e);
      }
    }

    let partnerChart: BirthChartResult | null = null;
    let partnerChartText = "";
    if (partnerBirthData && partnerBirthData.year && partnerBirthData.latitude !== 0) {
      try {
        try {
          const tzIds = findTimezone(partnerBirthData.latitude, partnerBirthData.longitude);
          if (tzIds && tzIds.length > 0) {
            const tzId = tzIds[0];
            const birthDate = new Date(
              partnerBirthData.year, partnerBirthData.month - 1, partnerBirthData.day,
              partnerBirthData.hour, partnerBirthData.minute, 0
            );
            const formatter = new Intl.DateTimeFormat("en-US", {
              timeZone: tzId,
              timeZoneName: "shortOffset",
            });
            const parts = formatter.formatToParts(birthDate);
            const offsetPart = parts.find(p => p.type === "timeZoneName");
            if (offsetPart) {
              const m = offsetPart.value.match(/GMT([+-]?)(\d+)(?::(\d+))?/);
              if (m) {
                const sign = m[1] === "-" ? -1 : 1;
                const hours = parseInt(m[2]);
                const minutes = parseInt(m[3] || "0");
                const correctedTz = sign * (hours + minutes / 60);
                partnerBirthData.timezone = correctedTz;
              }
            }
          }
        } catch (tzErr) {
          console.warn("[Analyze] geo-tz lookup failed for partner, using client timezone:", tzErr);
        }

        partnerChart = computeBirthChart(partnerBirthData);
        partnerChartText = chartToPromptText(partnerChart);
      } catch (e) {
        console.error("[Analyze] Partner Chart calc error:", e);
      }
    }

    // Feedback context + Search (all with 8s overall timeout, non-blocking)
    let feedbackCtx = "";
    let searchCtx = "";
    try {
      const contextTimeout = new Promise<void>((resolve) => setTimeout(resolve, 8000));
      const contextWork = (async () => {
        const [fb, exaRes, tavilyRes] = await Promise.all([
          getAggregateFeedback(zodiacSign).catch(() => ""),
          searchExa(`${zodiacSign} ${mbtiType} personality traits astrology`),
          searchTavily(`${zodiacSign} zodiac compatibility love style ${mbtiType}`),
        ]);
        feedbackCtx = fb;
        searchCtx = [exaRes, tavilyRes].filter(Boolean).join("\n---\n").slice(0, 1500);
      })();
      await Promise.race([contextWork, contextTimeout]);
    } catch { /* skip context gathering on failure */ }
    console.log(`[Analyze] Context gathered: feedback=${feedbackCtx.length}chars, search=${searchCtx.length}chars`);

    // ──── SYSTEM PROMPT (detailed, JSON-first) ────
    const systemPrompt = `You must respond with valid JSON only. Format: {"personality":"...","love":"...","compatibility":"...","likes":"...","chartReading":"..."}

Each value should be rich and detailed — write 3-5 substantial paragraphs per section, separated by \\n\\n. Each paragraph should be 3-5 sentences. Be thorough, insightful, and specific. Do NOT be brief — the user wants an in-depth, comprehensive reading.

You are a master astrologer and personality analyst. Speak directly to the person in second person ("you"). Reference their specific planet positions, signs, houses, and degrees from the chart data. Make it feel personal and uniquely theirs.

- personality: Start with their Rising sign (how they appear to others, first impressions, physical mannerisms). Then explore their Moon sign (emotional world, inner needs, what makes them feel secure, how they process feelings). Cover their Sun sign purpose and life direction. Discuss Mercury (communication style, how they think and learn). Mention their dominant element balance and what it means. End with how their MBTI type interweaves with their astrological profile to create their unique personality blend.

- love: Begin with Venus placement (love language, what they find beautiful, how they show affection, their romantic ideals). Explore Mars (passion style, sexual energy, what ignites desire, how they pursue or attract). Analyze their 7th house (what kind of partner they need, relationship dynamics). Discuss their 5th house (dating style, romance, flirtation). Include how their Moon sign affects emotional intimacy. Mention any significant Venus/Mars aspects.

- compatibility: Discuss their best zodiac matches based on element harmony (fire-air, earth-water). Explain WHY certain signs work well with them based on their specific chart. Cover challenging matches and what makes them difficult. Discuss their Venus-Mars dynamic and what it attracts. If a partner's sign is provided, give detailed analysis of that specific pairing.

- likes: Explore career paths suggested by their 10th house and Midheaven sign. Discuss creative interests from 5th house placements. Cover hobbies and leisure from their element and modality. Mention intellectual interests from Mercury placement. Discuss social preferences based on their 11th house. Include lifestyle preferences that align with their chart energy.

- chartReading: Give a comprehensive planet-by-planet breakdown. For each major planet (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn), state the sign, house, and degree, then explain what it means for this person. Mention any notable aspects (conjunctions, oppositions, trines, squares). Discuss any retrograde planets and their significance. Note the Ascendant and Midheaven. Highlight any stelliums or patterns.${feedbackCtx ? `\nPrevious user feedback to incorporate: ${feedbackCtx}` : ""}`;

    // ──── USER PROMPT ────
    let userPrompt = `Person: ${zodiacSign} Sun, ${mbtiType || "unknown"} MBTI, ${relationshipStatus}`;
    if (partnerZodiac) userPrompt += `, partner: ${partnerZodiac}${partnerMbti ? ` / ${partnerMbti}` : ""}`;
    if (rsDuration) userPrompt += `, together: ${rsDuration}`;
    if (chartText) userPrompt += `\n\nBIRTH CHART:\n${chartText}`;
    if (partnerChartText) userPrompt += `\n\nPARTNER BIRTH CHART:\n${partnerChartText}`;
    if (searchCtx) userPrompt += `\n\nContext:\n${searchCtx}`;

    console.log("[Analyze] Prompt lengths - system:", systemPrompt.length, "user:", userPrompt.length);
    console.log("[Analyze] Sending to Groq...");

    const aiCalls = [
      groq.chat(
        {
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          model: MODELS.ANALYZE,
          temperature: 0.7,
          max_tokens: 8000,
          response_format: { type: "json_object" },
        },
        { cachePrefix: "analyze_v2", useCache: true, maxRetries: 2 }
      )
    ];

    if (relationshipStatus === "rs" && partnerZodiac) {
      const partnerSystemPrompt = `You must respond with valid JSON only. Format: {"personality":"...","love":"...","compatibility":"...","likes":"...","chartReading":"..."}

Each value should be rich and detailed — write 3-5 substantial paragraphs per section, separated by \\n\\n. Each paragraph should be 3-5 sentences. Be thorough, insightful, and specific. Do NOT be brief.

You are a master astrologer. Speak to the user about their PARTNER. Use third-person pronouns ("they", "your partner") to describe the partner's traits, love style, likes, and chart. Do NOT say "you".

- personality: Analyze the partner's Rising, Moon, Sun, and Mercury. Discuss their element balance and MBTI mix. Explain how they appear to others and their inner emotional world.
- love: Analyze the partner's Venus, Mars, 5th, and 7th houses. Explain how they show affection, what they find beautiful, and their dating style.
- compatibility: Discuss the partner's best matches generally and explain why they align with certain signs.
- likes: Explore their career paths, hobbies, intellectual interests, and social preferences based on their chart.
- chartReading: Give a comprehensive planet-by-planet breakdown of the partner's chart. Mention any notable aspects or stelliums.`;

      let partnerUserPrompt = `Partner: ${partnerZodiac} Sun, ${partnerMbti || "unknown"} MBTI`;
      if (partnerChartText) partnerUserPrompt += `\n\nPARTNER BIRTH CHART:\n${partnerChartText}`;

      aiCalls.push(
        groq.chat(
          {
            messages: [
              { role: "system", content: partnerSystemPrompt },
              { role: "user", content: partnerUserPrompt },
            ],
            model: MODELS.ANALYZE,
            temperature: 0.7,
            max_tokens: 8000,
            response_format: { type: "json_object" },
          },
          { cachePrefix: "analyze_partner_v2", useCache: true, maxRetries: 2 }
        )
      );
    }

    const results = await Promise.all(aiCalls);
    const result = results[0];
    const partnerResult = results[1] || null;

    console.log(`[Analyze] Response: ${result.content.length} chars, reason=${result.finish_reason}, cached=${result.cached}`);

    let parsed: Record<string, string> = {};
    if (result.content) {
      parsed = safeParseJson(result.content);
    } else {
      console.error("[Analyze] Empty response from Groq!");
    }

    let partnerParsed: Record<string, string> = {};
    if (partnerResult && partnerResult.content) {
      partnerParsed = safeParseJson(partnerResult.content);
      console.log(`[Analyze] Partner Response: ${partnerResult.content.length} chars`);
    }

    const responseData = {
      personality: parsed.personality || null,
      love: parsed.love || null,
      compatibility: parsed.compatibility || null,
      likes: parsed.likes || null,
      chartReading: parsed.chartReading || null,
      partnerPersonality: partnerParsed.personality || null,
      partnerLove: partnerParsed.love || null,
      partnerCompatibility: partnerParsed.compatibility || null,
      partnerLikes: partnerParsed.likes || null,
      partnerChartReading: partnerParsed.chartReading || null,
    };

    const nullFields = Object.entries(responseData).filter(([, v]) => !v).map(([k]) => k);
    if (nullFields.length > 0) {
      console.warn("[Analyze] Missing fields:", nullFields);
    }

    // Store reading (fire-and-forget, truly non-blocking)
    if (sessionId) {
      insertReading({
        sessionId,
        birthChart: chart as unknown as Record<string, unknown>,
        aiResponse: responseData,
        zodiacSign,
        mbtiType
      }).catch(() => { /* non-blocking */ });
    }

    return NextResponse.json({ success: true, data: responseData, birthChart: chart, partnerBirthChart: partnerChart });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ success: false, error: "Analysis failed" }, { status: 500 });
  }
}
