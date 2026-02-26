const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: { rejectUnauthorized: false }
});

async function run() {
    const client = await pool.connect();
    try {
        const id = "char_001_test";

        // 1. Create a dummy character
        await client.query(`
      INSERT INTO characters (
          id, name, nickname, tag, tags, description, long_description, scenario, example_dialogue,
          image, greeting, personality, visibility, source, zodiac_sign, birthday, creator_id
      ) VALUES (
          $1, 'Test Char', 'Old Nick', 'Anime', '[]', 'desc', 'long_desc', 'scenario', 'example',
          'image.png', 'Hi', 'Cold', 'public', 'source', 'Aries', 'Jan 1', 'user_1'
      ) ON CONFLICT (id) DO NOTHING;
    `, [id]);

        // 2. Simulate Edit Character (Upsert)
        const newNickname = "The Tester";
        await client.query(`
      INSERT INTO characters (
          id, name, nickname, tag, tags, description, long_description, scenario, example_dialogue,
          image, greeting, personality, visibility, source, zodiac_sign, birthday, creator_id
      ) VALUES (
          $1, 'Test Char', $2, 'Anime', '[]', 'desc', 'long_desc', 'scenario', 'example',
          'image.png', 'Hi', 'Cold', 'public', 'source', 'Aries', 'Jan 1', 'user_1'
      ) ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          nickname = EXCLUDED.nickname,
          tag = EXCLUDED.tag,
          tags = EXCLUDED.tags,
          description = EXCLUDED.description,
          long_description = EXCLUDED.long_description,
          scenario = EXCLUDED.scenario,
          example_dialogue = EXCLUDED.example_dialogue,
          image = EXCLUDED.image,
          greeting = EXCLUDED.greeting,
          personality = EXCLUDED.personality,
          visibility = EXCLUDED.visibility,
          source = EXCLUDED.source,
          zodiac_sign = EXCLUDED.zodiac_sign,
          birthday = EXCLUDED.birthday,
          updated_at = NOW()
    `, [id, newNickname]);

        // 3. Fetch to confirm
        const row = await client.query('SELECT nickname FROM characters WHERE id = $1', [id]);
        console.log("Updated Nickname:", row.rows[0].nickname);

    } catch (err) {
        console.error("Error:", err.message);
    } finally {
        client.release();
        pool.end();
    }
}

run();
