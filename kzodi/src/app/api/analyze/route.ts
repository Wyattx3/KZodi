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
  name?: string;
  partnerName?: string;
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
    const { sessionId, zodiacSign, mbtiType, partnerZodiac, partnerMbti, relationshipStatus, rsDuration, name, partnerName, birthData, partnerBirthData } = body;

    console.log("[Analyze] Request:", { zodiacSign, mbtiType, name, relationshipStatus, hasBirthData: !!birthData });
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

    // ──── SYSTEM PROMPT (detailed, JSON-first, static for caching) ────
    const systemPrompt = `You must respond with valid JSON only. Format: {"personality":"...","love":"...","compatibility":"...","likes":"...","chartReading":"..."}

You are Kakoei Oracle — a warm, insightful astrologer. Speak directly to the person using "you / your". Use their exact planet positions and signs from the chart data to make the reading feel deeply personal.

FORMAT RULES (strictly follow this for every field):
- Use "## Label" for section headings (no asterisks around them)
- Use "• item" for short bullet points (max 5 words each)
- Use "**word**" for highlighting one key word or phrase per paragraph
- Write 1–3 short sentences per paragraph. Never more.
- Separate each paragraph with a blank line (double newline)
- Do NOT use numbered lists, colons at end of lines, or markdown asterisks for bullet points

CONTENT RULES:
- Always mention the actual sign name, not just the planet (e.g. "your Moon in Scorpio" not "your Moon sign")
- Skip degrees unless they are exceptionally relevant (e.g. exact degree conjunctions)
- Avoid technical jargon like "stellium", "orb", "deviation" unless you briefly explain it
- Sound like a wise, warm friend — not an encyclopedia
- Be specific: what it means for THIS person's daily life, relationships, career

FIELD INSTRUCTIONS:
personality: 
  ## Your First Impression — Rising sign + how others see you
  ## Your Inner World — Moon sign emotional nature
  ## Your Purpose — Sun sign core identity
  ## Your Mind — Mercury sign communication style
  ## ${mbtiType ? `${mbtiType} + The Stars` : "Your Element Balance"} — how MBTI meets the chart

love:
  ## How You Love — Venus sign + love language
  ## What Lights You Up — Mars sign + attraction style
  ## The Partner You Need — 7th house reading
  ## Your Dating Energy — 5th house flirtation/romance style

compatibility:
  ## Your Best Matches — top 2-3 compatible signs and WHY
  ${partnerZodiac ? `## You + ${partnerZodiac} — deep analysis of this specific pairing` : "## Signs to Approach Carefully — and what to watch for"}
  ## What You Offer in Love — your chart's gift to a relationship

likes:
  ## Your Career Path — 10th house / Midheaven career direction
  ## Creative Side — 5th house hobbies and passion projects
  ## Social Life — 11th house friends, community, causes
  ## Hidden Strengths — Mercury sign intellectual interests and communication gifts

chartReading:
  ## The Big Three — Sun, Moon, Rising summary
  ## Inner Planets — Mercury, Venus, Mars (brief, one paragraph each)
  ## Outer Planets — Jupiter, Saturn, Uranus, Neptune (only if notable)
  ${chart?.summary?.retrograde && chart.summary.retrograde.length > 0 ? `## Retrograde Planets — ${chart.summary.retrograde.join(", ")} and what they mean for you` : ""}
  ## Overall Chart Theme — dominant element/modality and the life lesson it points to`;

    // ──── USER PROMPT (Dynamic data) ────
    let userPrompt = `Person: ${zodiacSign} Sun, ${mbtiType || "unknown"} MBTI, ${relationshipStatus}`;
    if (partnerZodiac) userPrompt += `, partner: ${partnerZodiac}${partnerMbti ? ` / ${partnerMbti}` : ""}`;
    if (rsDuration) userPrompt += `, together: ${rsDuration}`;
    if (chartText) userPrompt += `\n\nBIRTH CHART:\n${chartText}`;
    if (partnerChartText) userPrompt += `\n\nPARTNER BIRTH CHART:\n${partnerChartText}`;
    if (searchCtx) userPrompt += `\n\nResearch Context:\n${searchCtx}`;
    if (feedbackCtx) userPrompt += `\n\nPrevious user feedback to incorporate:\n${feedbackCtx}`;

    console.log("[Analyze] Prompt lengths - system:", systemPrompt.length, "user:", userPrompt.length);
    console.log("[Analyze] Sending request...");

    // ─── 2-Step Verified AI Call ──────────────────────────────────────
    // Step 1: Generate results
    // Step 2: Verify all 5 fields are present and substantive (>100 chars)
    // If verification fails → retry (up to 2 retries)

    const REQUIRED_FIELDS = ["personality", "love", "compatibility", "likes", "chartReading"];
    const MIN_FIELD_LENGTH = 100; // minimum chars per field for quality check
    const MAX_VERIFY_RETRIES = 2;

    async function verifiedAnalyzeCall(
      sysPrompt: string,
      usrPrompt: string,
      cachePrefix: string,
      label: string
    ): Promise<Record<string, string>> {
      for (let attempt = 0; attempt <= MAX_VERIFY_RETRIES; attempt++) {
        console.log(`[Analyze][${label}] Attempt ${attempt + 1}/${MAX_VERIFY_RETRIES + 1}`);

        try {
          const result = await groq.chat(
            {
              messages: [
                { role: "system", content: sysPrompt },
                { role: "user", content: usrPrompt },
              ],
              model: MODELS.ANALYZE,
              temperature: 0.7,
              max_tokens: 8000,
              response_format: { type: "json_object" },
            },
            {
              cachePrefix: attempt === 0 ? cachePrefix : `${cachePrefix}_retry${attempt}`,
              useCache: true, // Enable full caching
              maxRetries: 3
            }
          );

          // ─── Step 2: Verification ─────────────────────────────────
          if (!result.content || result.content.length < 50) {
            console.warn(`[Analyze][${label}] ❌ Verification FAILED: Empty/too-short response (${result.content?.length || 0} chars, reason=${result.finish_reason})`);
            if (attempt < MAX_VERIFY_RETRIES) {
              console.log(`[Analyze][${label}] Retrying...`);
              continue;
            }
          }

          const parsed = safeParseJson(result.content);

          // Check each required field
          const missingFields: string[] = [];
          const shortFields: string[] = [];
          for (const field of REQUIRED_FIELDS) {
            if (!parsed[field]) {
              missingFields.push(field);
            } else if (parsed[field].length < MIN_FIELD_LENGTH) {
              shortFields.push(`${field}(${parsed[field].length})`);
            }
          }

          if (missingFields.length === 0 && shortFields.length === 0) {
            console.log(`[Analyze][${label}] ✅ Verification PASSED: All ${REQUIRED_FIELDS.length} fields present and substantive`);
            return parsed;
          }

          // Verification failed
          console.warn(`[Analyze][${label}] ❌ Verification FAILED (attempt ${attempt + 1}): missing=[${missingFields.join(",")}], short=[${shortFields.join(",")}]`);

          if (attempt < MAX_VERIFY_RETRIES) {
            // If only some fields are short but present, we might still accept
            if (missingFields.length === 0 && shortFields.length <= 1) {
              console.log(`[Analyze][${label}] ⚠️ Accepting with minor shortness (${shortFields.join(",")})`);
              return parsed;
            }
            console.log(`[Analyze][${label}] Retrying with fresh call...`);
            continue;
          }

          // Last attempt — return whatever we have
          console.warn(`[Analyze][${label}] ⚠️ Max retries reached, returning best available result`);
          return parsed;

        } catch (err) {
          console.error(`[Analyze][${label}] Exception on attempt ${attempt + 1}:`, err);
          if (attempt < MAX_VERIFY_RETRIES) {
            // Wait a bit before retry (exponential backoff)
            await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
            continue;
          }
          return {};
        }
      }
      return {};
    }

    // ─── Execute Verified Calls ───────────────────────────────────────

    const mainPromise = verifiedAnalyzeCall(systemPrompt, userPrompt, "analyze_v3", "Main");

    let partnerPromise: Promise<Record<string, string>> | null = null;
    if (relationshipStatus === "rs" && partnerZodiac) {
      const partnerSystemPrompt = `You must respond with valid JSON only. Format: {"personality":"...","love":"...","compatibility":"...","likes":"...","chartReading":"..."}

You are Kakoei Oracle. Describe the PARTNER to the user. Use "your partner", "they", "their" — never "you" for the partner.

FORMAT RULES (same as always):
- Use "## Label" for section headings
- Use "• item" for short bullet points (max 5 words each)
- Use "**word**" for highlighting one key word or phrase per paragraph
- Write 1–3 short sentences per paragraph. Separate paragraphs with blank lines.
- No numbered lists. No technical jargon without explanation.

FIELD INSTRUCTIONS:
personality:
  ## First Impressions — their Rising sign energy
  ## Their Inner World — Moon sign + emotional style
  ## Their Core Self — Sun sign purpose and drive
  ## How They Think — Mercury sign and communication

love:
  ## How They Love — Venus sign + their love language
  ## Their Passion — Mars sign + what drives them
  ## The Partner They Need — their 7th house
  ## Their Romantic Side — 5th house flirtation style

compatibility:
  ## Their Best Matches — top 2-3 signs and why
  ## What They Bring to Love — their chart's gift in relationships

likes:
  ## Their Career — 10th house direction
  ## Their Hobbies — 5th house and Mercury interests
  ## Their Social World — 11th house

chartReading:
  ## Their Big Three — Sun, Moon, Rising
  ## Inner Planets — Mercury, Venus, Mars highlights
  ## Chart Themes — dominant element/modality and life lesson`;

      let partnerUserPrompt = `Partner: ${partnerZodiac} Sun, ${partnerMbti || "unknown"} MBTI`;
      if (partnerChartText) partnerUserPrompt += `\n\nPARTNER BIRTH CHART:\n${partnerChartText}`;

      partnerPromise = verifiedAnalyzeCall(partnerSystemPrompt, partnerUserPrompt, "analyze_partner_v3", "Partner");
    }

    // Run both in parallel
    const [parsed, partnerParsed] = await Promise.all([
      mainPromise,
      partnerPromise || Promise.resolve({} as Record<string, string>)
    ]);

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
      console.warn("[Analyze] ⚠️ Final result still has missing fields:", nullFields);
    } else {
      console.log("[Analyze] ✅ All fields verified and complete!");
    }

    // Store reading (fire-and-forget, truly non-blocking)
    if (sessionId) {
      insertReading({
        sessionId,
        birthChart: chart as unknown as Record<string, unknown>,
        aiResponse: responseData,
        zodiacSign,
        mbtiType,
        name,
      }).catch(() => { /* non-blocking */ });
    }

    return NextResponse.json({ success: true, data: responseData, birthChart: chart, partnerBirthChart: partnerChart });
  } catch (error) {
    console.error("Analyze error:", error);
    return NextResponse.json({ success: false, error: "Analysis failed" }, { status: 500 });
  }
}
