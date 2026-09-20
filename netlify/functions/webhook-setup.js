// webhook-setup.js
// Deletes any existing Telegram webhook so getUpdates works.
// Called once on page load — cached so it only runs once.

import { dbSelectOne, dbUpsert } from './_supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const handler = async (event) => {
  try {
    // Check if already done
    const cached = await dbSelectOne('webhook_registration', { id: 1 }, 'webhook_url').catch(() => null);
    const force  = event.queryStringParameters?.force === 'true';

    if (!force && cached?.webhook_url === 'POLLING_MODE') {
      return ok({ success: true, mode: 'polling', cached: true });
    }

    // Delete webhook from Telegram so getUpdates works
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`, {
      signal: AbortSignal.timeout(8000),
    });
    const result = await r.json();
    console.log('deleteWebhook result:', JSON.stringify(result));

    if (result.ok) {
      // Cache that we're in polling mode
      await dbUpsert('webhook_registration', {
        id:            1,
        webhook_url:   'POLLING_MODE',
        registered_at: new Date().toISOString(),
      }).catch(() => {});

      return ok({ success: true, mode: 'polling', cached: false, telegram: result.description });
    } else {
      return ok({ success: false, error: result.description });
    }
  } catch (e) {
    console.error('webhook-setup error:', e.message);
    return ok({ success: false, error: e.message });
  }
};

const ok = (b) => ({
  statusCode: 200,
  headers:    { 'Content-Type': 'application/json' },
  body:       JSON.stringify(b),
});
