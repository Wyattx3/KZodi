import { neon } from "@neondatabase/serverless";

const DATABASE_URL = process.env.DATABASE_URL || "";

function getSql() {
  if (!DATABASE_URL) return null;
  return neon(DATABASE_URL);
}

let _initialized = false;

export async function ensureSchema() {
  const sql = getSql();
  if (!sql || _initialized) return;
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        zodiac_sign TEXT,
        mbti_type TEXT,
        birth_chart JSONB,
        section TEXT,
        accuracy_percent INTEGER,
        feedback_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        birth_chart JSONB,
        ai_response JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    _initialized = true;
  } catch (e) {
    console.error("DB schema init error:", e);
  }
}

export async function insertFeedback(data: {
  sessionId: string;
  zodiacSign: string;
  mbtiType: string;
  birthChart: Record<string, unknown> | null;
  section: string;
  accuracyPercent: number;
  feedbackText: string;
}) {
  const sql = getSql();
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO feedbacks (session_id, zodiac_sign, mbti_type, birth_chart, section, accuracy_percent, feedback_text)
    VALUES (${data.sessionId}, ${data.zodiacSign}, ${data.mbtiType}, ${JSON.stringify(data.birthChart)}, ${data.section}, ${data.accuracyPercent}, ${data.feedbackText})
  `;
}

export async function insertReading(data: {
  sessionId: string;
  birthChart: Record<string, unknown> | null;
  aiResponse: Record<string, unknown>;
}) {
  const sql = getSql();
  if (!sql) return;
  await ensureSchema();
  await sql`
    INSERT INTO readings (session_id, birth_chart, ai_response)
    VALUES (${data.sessionId}, ${JSON.stringify(data.birthChart)}, ${JSON.stringify(data.aiResponse)})
  `;
}

export async function getAggregateFeedback(zodiacSign: string): Promise<string> {
  const sql = getSql();
  if (!sql) return "";
  await ensureSchema();
  try {
    const rows = await sql`
      SELECT section, 
             ROUND(AVG(accuracy_percent)) as avg_accuracy,
             COUNT(*) as count,
             array_agg(feedback_text) FILTER (WHERE feedback_text != '') as feedback_samples
      FROM feedbacks
      WHERE zodiac_sign = ${zodiacSign}
      GROUP BY section
      HAVING COUNT(*) >= 3
    `;
    if (!rows || rows.length === 0) return "";
    return rows.map((r: Record<string, unknown>) => {
      const samples = (r.feedback_samples as string[] || []).slice(0, 3);
      return `Section "${r.section}": avg accuracy ${r.avg_accuracy}% from ${r.count} users. ${samples.length ? `Common feedback: ${samples.join("; ")}` : ""}`;
    }).join("\n");
  } catch {
    return "";
  }
}
