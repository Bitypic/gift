// polling-only-config.js
// Sets up polling config and registers Telegram webhook (once) via Netlify function.

window.POLLING_CONFIG = {
  mode: 'webhook',
  pollInterval: 500,
  initialized: true,
};

// Register webhook on first load (fire-and-forget)
fetch('/api/webhook-setup')
  .then(r => r.json())
  .then(d => console.log('Webhook:', d.success ? '✅ ' + d.webhook : '⚠️ ' + (d.error || d.reason)))
  .catch(() => {});
