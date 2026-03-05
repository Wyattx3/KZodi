import { Pool } from "pg";

// Strip sslmode from URL — we handle SSL config explicitly below
const DATABASE_URL = (process.env.DATABASE_URL || "").replace(/[?&]sslmode=[^&]*/g, "");

// Maintain a single pool instance across hot reloads in development
const globalForDb = global as unknown as { pool: Pool };

export const pool =
  globalForDb.pool ||
  new Pool({
    connectionString: DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.pool = pool;
}

// Helper specific for raw postgres queries similar to the old `neon` syntax if needed, 
// though standard Pool.query is preferred.
export async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

let _initialized = false;

export async function ensureSchema() {
  if (_initialized) return;
  try {
    // NextAuth required tables for the pg-adapter
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        name VARCHAR(255),
        email VARCHAR(255),
        "emailVerified" TIMESTAMPTZ,
        image TEXT,
        language VARCHAR(50) DEFAULT 'English (Default)',
        PRIMARY KEY (id)
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS accounts (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        type VARCHAR(255) NOT NULL,
        provider VARCHAR(255) NOT NULL,
        "providerAccountId" VARCHAR(255) NOT NULL,
        refresh_token TEXT,
        access_token TEXT,
        expires_at BIGINT,
        id_token TEXT,
        scope TEXT,
        session_state TEXT,
        token_type TEXT,
        PRIMARY KEY (id),
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        expires TIMESTAMPTZ NOT NULL,
        "sessionToken" VARCHAR(255) NOT NULL,
        PRIMARY KEY (id),
        FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
      );
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS verification_token (
        identifier TEXT,
        expires TIMESTAMPTZ NOT NULL,
        token TEXT,
        PRIMARY KEY (identifier, token)
      );
    `);

    // Existing App Tables
    await query(`
      CREATE TABLE IF NOT EXISTS feedbacks (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        zodiac_sign TEXT,
        mbti_type TEXT,
        birth_chart JSONB,
        section TEXT,
        accuracy_percent INTEGER,
        feedback_text TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS readings (
        id SERIAL PRIMARY KEY,
        session_id TEXT,
        user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        birth_chart JSONB,
        ai_response JSONB,
        zodiac_sign TEXT,
        mbti_type TEXT,
        name TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // New Data Tables for Chat and Stickers
    await query(`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        conversation_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        role VARCHAR(50) NOT NULL,
        content TEXT,
        timestamp BIGINT NOT NULL,
        status VARCHAR(50) DEFAULT 'sent',
        reply_to_id VARCHAR(255),
        reactions JSONB,
        attachment JSONB,
        sender_id VARCHAR(255),
        sender_name VARCHAR(255),
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Index for fast message retrieval by conversation + user
    await query(`CREATE INDEX IF NOT EXISTS msg_conv_idx ON messages (conversation_id);`);
    await query(`CREATE INDEX IF NOT EXISTS msg_user_idx ON messages (user_id);`);
    await query(`CREATE INDEX IF NOT EXISTS msg_conv_user_idx ON messages (conversation_id, user_id);`);

    await query(`
      CREATE TABLE IF NOT EXISTS user_stickers (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255),
        character_name VARCHAR(255),
        prompt TEXT NOT NULL,
        image_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user_id, character_name, prompt)
      )
    `);

    // --- Characters Table ---
    await query(`
      CREATE TABLE IF NOT EXISTS characters (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        tag VARCHAR(100) NOT NULL,
        tags JSONB,
        description TEXT NOT NULL,
        long_description TEXT,
        scenario TEXT,
        example_dialogue TEXT,
        image TEXT NOT NULL,
        greeting TEXT NOT NULL,
        personality TEXT NOT NULL,
        visibility VARCHAR(50) DEFAULT 'public',
        source VARCHAR(255),
        zodiac_sign VARCHAR(50),
        birthday VARCHAR(50),
        creator_id VARCHAR(255),
        likes_count INTEGER DEFAULT 0,
        msg_count INTEGER DEFAULT 0,
        chatter_count INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Make searches and sorting fast
    await query(`CREATE INDEX IF NOT EXISTS char_tag_idx ON characters (tag);`);
    await query(`CREATE INDEX IF NOT EXISTS char_visibility_idx ON characters (visibility);`);
    await query(`CREATE INDEX IF NOT EXISTS char_likes_idx ON characters (likes_count DESC);`);
    await query(`CREATE INDEX IF NOT EXISTS char_msg_count_idx ON characters (msg_count DESC);`);

    // --- Character Likes Table ---
    await query(`
      CREATE TABLE IF NOT EXISTS character_likes (
        character_id VARCHAR(255) NOT NULL,
        user_id VARCHAR(255) NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        PRIMARY KEY (character_id, user_id),
        FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
      )
    `);

    _initialized = true;
    console.log("Database schema initialized successfully.");

    // Alter existing tables just in case they were already created without user_id
    try {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS language VARCHAR(50) DEFAULT 'English (Default)';`);
      await query(`ALTER TABLE feedbacks ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL;`);
      await query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS zodiac_sign TEXT;`);
      await query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS mbti_type TEXT;`);
      await query(`ALTER TABLE readings ADD COLUMN IF NOT EXISTS name TEXT;`);
    } catch (e) { /* ignore if already exists */ }

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
  await ensureSchema();
  await query(
    `INSERT INTO feedbacks (session_id, zodiac_sign, mbti_type, birth_chart, section, accuracy_percent, feedback_text) 
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [data.sessionId, data.zodiacSign, data.mbtiType, JSON.stringify(data.birthChart), data.section, data.accuracyPercent, data.feedbackText]
  );
}

export async function insertReading(data: {
  sessionId: string;
  birthChart: Record<string, unknown> | null;
  aiResponse: Record<string, unknown>;
  zodiacSign?: string;
  mbtiType?: string;
  name?: string;
}) {
  await ensureSchema();
  await query(
    `INSERT INTO readings (session_id, birth_chart, ai_response, zodiac_sign, mbti_type, name) VALUES ($1, $2, $3, $4, $5, $6)`,
    [data.sessionId, JSON.stringify(data.birthChart), JSON.stringify(data.aiResponse), data.zodiacSign || null, data.mbtiType || null, data.name || null]
  );
}

export async function getAggregateFeedback(zodiacSign: string): Promise<string> {
  await ensureSchema();
  try {
    const res = await query(
      `SELECT section, 
              ROUND(AVG(accuracy_percent)) as avg_accuracy,
              COUNT(*) as count,
              array_agg(feedback_text) FILTER (WHERE feedback_text != '') as feedback_samples
       FROM feedbacks
       WHERE zodiac_sign = $1
       GROUP BY section
       HAVING COUNT(*) >= 3`,
      [zodiacSign]
    );

    if (!res.rows || res.rows.length === 0) return "";
    return res.rows.map((r: any) => {
      const samples = (r.feedback_samples || []).slice(0, 3);
      return `Section "${r.section}": avg accuracy ${r.avg_accuracy}% from ${r.count} users. ${samples.length ? `Common feedback: ${samples.join("; ")}` : ""}`;
    }).join("\n");
  } catch {
    return "";
  }
}

export async function linkReadingToUser(sessionId: string, userId: string) {
  await ensureSchema();
  await query(`UPDATE readings SET user_id = $1 WHERE session_id = $2`, [userId, sessionId]);
  await query(`UPDATE feedbacks SET user_id = $1 WHERE session_id = $2`, [userId, sessionId]);
}

export async function getLatestReadingForUser(userId: string) {
  await ensureSchema();
  const res = await query(
    `SELECT * FROM readings WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [userId]
  );
  return res.rows[0];
}
