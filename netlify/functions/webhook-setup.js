import { dbSelectOne, dbUpsert } from './_supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const handler = async (event) => {
  try {
    // Build webhook URL from the actual request host — most reliable approach.
    // process.env.URL can return Netlify's auto-generated subdomain instead of
    // the real site name, causing Telegram to call the wrong URL.
    const proto = event.headers['x-forwarded-proto'] || 'https';
    const host  = event.headers['x-forwarded-host'] || event.headers['host'] || '';
    let base    = host ? `${proto}://${host}` : (process.env.URL || '').replace(/\/$/, '');

    const webhookUrl = `${base}/.netlify/functions/bot-webhook`;
    const force      = event.queryStringParameters?.force === 'true';

    console.log('webhookUrl:', webhookUrl, '| force:', force);

    // Check what Telegram currently has
    const currentInfo = await getTelegramWebhookInfo();
    const currentUrl  = currentInfo?.result?.url || '';

    console.log('Telegram current webhook:', currentUrl);

    // Check cached URL in Supabase
    const cached = await dbSelectOne('webhook_registration', { id: 1 }, 'webhook_url');

    // Skip if already registered correctly (unless forced)
    if (!force && cached?.webhook_url === webhookUrl && currentUrl === webhookUrl) {
      return ok({ success: true, cached: true, webhook: webhookUrl, telegramConfirmed: true });
    }

    // Register with Telegram
    console.log('Calling setWebhook with:', webhookUrl);
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url: webhookUrl, drop_pending_updates: true }),
      signal:  AbortSignal.timeout(10000),
    });

    const result = await r.json();
    console.log('setWebhook result:', JSON.stringify(result));

    if (result.ok) {
      await dbUpsert('webhook_registration', {
        id:            1,
        webhook_url:   webhookUrl,
        registered_at: new Date().toISOString(),
      });
      return ok({ success: true, cached: false, webhook: webhookUrl, telegram: result.description });
    } else {
      return ok({ success: false, error: result.description, webhook: webhookUrl, currentTelegramUrl: currentUrl });
    }
  } catch (e) {
    console.error('webhook-setup error:', e.message);
    return ok({ success: false, error: e.message });
  }
};

async function getTelegramWebhookInfo() {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, {
      signal: AbortSignal.timeout(5000),
    });
    return r.json();
  } catch { return null; }
}

const ok = (b) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
