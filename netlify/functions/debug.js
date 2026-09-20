// debug.js — Live monitoring dashboard
// Access: /api/debug?p=viewlogs123

import { dbSelect, dbSelectOne } from './_supabase.js';

const PASSWORD = 'viewlogs123';
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

export const handler = async (event) => {
  if (event.queryStringParameters?.p !== PASSWORD) {
    return { statusCode: 403, body: 'Forbidden' };
  }

  const action = event.queryStringParameters?.action || 'dashboard';

  // ── Force re-register webhook ──────────────────────────────────────────────
  if (action === 'register_webhook') {
    // In polling mode we DELETE the webhook so getUpdates works
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook?drop_pending_updates=true`, {
      signal: AbortSignal.timeout(8000),
    });
    const result = await r.json();
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'polling', telegram: result }) };
  }

  // ── Delete webhook ─────────────────────────────────────────────────────────
  if (action === 'delete_webhook') {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`, {
      method: 'POST', signal: AbortSignal.timeout(5000),
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: await r.text() };
  }

  // ── getUpdates (manual poll — only works when webhook is deleted) ──────────
  if (action === 'get_updates') {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates?limit=10`, {
      signal: AbortSignal.timeout(5000),
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: await r.text() };
  }

  // ── Send test message ──────────────────────────────────────────────────────
  if (action === 'send_test') {
    const chatId = process.env.TELEGRAM_CHAT_ID;
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text: '🔬 Debug test — ' + new Date().toISOString(), parse_mode: 'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
    return { statusCode: 200, headers: { 'Content-Type': 'application/json' },
      body: await r.text() };
  }

  // ── Check env vars ─────────────────────────────────────────────────────────
  if (action === 'check_env') {
    const token  = BOT_TOKEN || '';
    const chatId = process.env.TELEGRAM_CHAT_ID || '';
    const sbUrl  = process.env.SUPABASE_URL || '';
    const sbKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        TELEGRAM_BOT_TOKEN:        token  ? token.substring(0,10)  + '...' + token.slice(-6)  : '❌ MISSING',
        TELEGRAM_CHAT_ID:          chatId ? chatId                                              : '❌ MISSING',
        SUPABASE_URL:              sbUrl  ? sbUrl                                               : '❌ MISSING',
        SUPABASE_SERVICE_ROLE_KEY: sbKey  ? sbKey.substring(0,10)  + '...' + sbKey.slice(-6)  : '❌ MISSING',
        URL:                       process.env.URL        || '❌ MISSING',
        DEPLOY_URL:                process.env.DEPLOY_URL || '❌ MISSING',
      }),
    };
  }

  // ── Webhook info from Telegram ─────────────────────────────────────────────
  let webhookInfo  = null;
  let botInfo      = null;
  let sessions     = [];
  let envOk        = true;

  try {
    const [wi, bi, sess] = await Promise.all([
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`, { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
      fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`,          { signal: AbortSignal.timeout(5000) }).then(r => r.json()),
      dbSelect('sessions', {}, 'id,email,status,response_type,created_at,last_update').catch(() => []),
    ]);
    webhookInfo = wi;
    botInfo     = bi;
    sessions    = sess.slice(0, 20); // latest 20
  } catch (e) {
    envOk = false;
  }

  const wh         = webhookInfo?.result || {};
  const bot        = botInfo?.result     || {};
  const siteUrl    = process.env.URL || process.env.DEPLOY_URL || '(not set)';
  const expectedWh = siteUrl.replace(/\/$/, '') + '/.netlify/functions/bot-webhook';
  const whMatch    = wh.url === expectedWh;
  const whSet      = !!wh.url;

  const token  = BOT_TOKEN || '';
  const chatId = process.env.TELEGRAM_CHAT_ID || '';
  const sbUrl  = process.env.SUPABASE_URL || '';
  const sbKey  = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // Status colour helper
  const ok  = (v) => `<span class="ok">✅ ${v}</span>`;
  const err = (v) => `<span class="err">❌ ${v}</span>`;
  const warn= (v) => `<span class="warn">⚠️ ${v}</span>`;

  const sessionRows = sessions.map(s => `
    <tr>
      <td>${esc(s.created_at?.replace('T',' ').split('.')[0]||'')}</td>
      <td>${esc(s.email||'')}</td>
      <td><span class="badge badge-${s.status||'pending'}">${s.status||'pending'}</span></td>
      <td>${esc(s.response_type||'—')}</td>
      <td>${esc(s.last_update?.replace('T',' ').split('.')[0]||'')}</td>
      <td style="font-size:10px;word-break:break-all">${esc(s.id||'')}</td>
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>🔬 Debug Dashboard — Invitely</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Monaco,'Courier New',monospace;background:#0d1117;color:#c9d1d9;padding:20px;font-size:12px}
    h1{color:#58a6ff;margin-bottom:6px;font-size:18px}
    .subtitle{color:#8b949e;margin-bottom:24px;font-size:11px}
    h2{color:#58a6ff;font-size:13px;margin:20px 0 10px}
    .card{background:#0d1117;border:1px solid #30363d;border-radius:8px;padding:16px;margin-bottom:16px}
    .row{display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:1px solid #1e2636}
    .row:last-child{border-bottom:none}
    .label{color:#8b949e;flex:0 0 220px}
    .value{flex:1;word-break:break-all}
    .ok{color:#3fb950;font-weight:bold}
    .err{color:#f85149;font-weight:bold}
    .warn{color:#d29922;font-weight:bold}
    .actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:20px}
    .btn{background:#238636;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:11px;text-decoration:none;display:inline-block}
    .btn:hover{background:#2ea043}
    .btn-red{background:#da3633}.btn-red:hover{background:#f85149}
    .btn-blue{background:#0d419f}.btn-blue:hover{background:#1f6feb}
    .btn-gray{background:#21262d;color:#c9d1d9;border:1px solid #30363d}.btn-gray:hover{background:#30363d}
    table{width:100%;border-collapse:collapse;background:#010409;border:1px solid #30363d;border-radius:6px;overflow:hidden}
    th{background:#0d419f;padding:8px 10px;text-align:left;border-bottom:1px solid #30363d}
    td{padding:7px 10px;border-bottom:1px solid #1e2636;vertical-align:top}
    tr:hover{background:#0d1117}
    .badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:bold}
    .badge-pending{background:#21262d;color:#8b949e}
    .badge-responded{background:#238636;color:#fff}
    .badge-waiting{background:#21262d;color:#8b949e}
    .pre{background:#010409;border:1px solid #30363d;border-radius:6px;padding:12px;white-space:pre-wrap;word-break:break-all;max-height:300px;overflow-y:auto;font-size:11px;margin-top:10px}
    #result{display:none}
  </style>
</head>
<body>
  <h1>🔬 Invitely — Debug Dashboard</h1>
  <p class="subtitle">Auto-refreshes every 10s · ${new Date().toISOString().replace('T',' ').split('.')[0]} UTC</p>

  <div class="actions">
    <button class="btn btn-blue" onclick="runAction('register_webhook')">🔗 Enable Polling Mode (Delete Webhook)</button>
    <button class="btn btn-red"  onclick="runAction('delete_webhook')">🗑 Delete Webhook</button>
    <button class="btn"          onclick="runAction('send_test')">📤 Send Test Message</button>
    <button class="btn btn-gray" onclick="runAction('check_env')">⚙️ Check Env Vars</button>
    <button class="btn btn-gray" onclick="location.reload()">🔄 Refresh</button>
  </div>
  <div id="result" class="pre"></div>

  <h2>🤖 Bot Status</h2>
  <div class="card">
    <div class="row"><span class="label">Bot Connected</span><span class="value">${botInfo?.ok ? ok('@' + bot.username) : err('Connection failed — check bot token')}</span></div>
    <div class="row"><span class="label">Bot Name</span><span class="value">${esc(bot.first_name || '—')}</span></div>
    <div class="row"><span class="label">Bot ID</span><span class="value">${esc(String(bot.id || '—'))}</span></div>
  </div>

  <h2>🔗 Webhook Status</h2>
  <div class="card">
    <div class="row">
      <span class="label">Webhook Set</span>
      <span class="value">${whSet ? ok('Yes') : err('No webhook registered — buttons will NOT work')}</span>
    </div>
    <div class="row">
      <span class="label">Current Webhook URL</span>
      <span class="value">${esc(wh.url || '(none)')}</span>
    </div>
    <div class="row">
      <span class="label">Expected URL</span>
      <span class="value">${esc(expectedWh)}</span>
    </div>
    <div class="row">
      <span class="label">URL Matches</span>
      <span class="value">${whMatch ? ok('Yes — correct') : (whSet ? err('No — URL mismatch, click Force Register') : err('No webhook set'))}</span>
    </div>
    <div class="row">
      <span class="label">Pending Updates</span>
      <span class="value">${wh.pending_update_count > 0 ? warn(wh.pending_update_count + ' pending (click Force Register to flush)') : ok('0 — clear')}</span>
    </div>
    <div class="row">
      <span class="label">Last Error</span>
      <span class="value">${wh.last_error_message ? err(esc(wh.last_error_message) + ' at ' + (wh.last_error_date ? new Date(wh.last_error_date * 1000).toISOString() : '')) : ok('None')}</span>
    </div>
    <div class="row">
      <span class="label">Max Connections</span>
      <span class="value">${esc(String(wh.max_connections || '—'))}</span>
    </div>
  </div>

  <h2>⚙️ Environment Variables</h2>
  <div class="card">
    <div class="row"><span class="label">TELEGRAM_BOT_TOKEN</span><span class="value">${token ? ok(token.substring(0,10)+'...'+token.slice(-6)) : err('MISSING')}</span></div>
    <div class="row"><span class="label">TELEGRAM_CHAT_ID</span><span class="value">${chatId ? ok(chatId) : err('MISSING')}</span></div>
    <div class="row"><span class="label">SUPABASE_URL</span><span class="value">${sbUrl ? ok(sbUrl) : err('MISSING')}</span></div>
    <div class="row"><span class="label">SUPABASE_SERVICE_ROLE_KEY</span><span class="value">${sbKey ? ok(sbKey.substring(0,10)+'...') : err('MISSING')}</span></div>
    <div class="row"><span class="label">Netlify URL (process.env.URL)</span><span class="value">${siteUrl !== '(not set)' ? ok(esc(siteUrl)) : warn('Not set — webhook URL may be wrong')}</span></div>
  </div>

  <h2>👥 Recent Sessions (last 20)</h2>
  <div style="overflow-x:auto">
    <table>
      <thead><tr>
        <th>Created</th><th>Email</th><th>Status</th>
        <th>Response</th><th>Last Update</th><th>Session ID</th>
      </tr></thead>
      <tbody>${sessionRows || '<tr><td colspan="6" style="text-align:center;padding:30px;color:#8b949e">No sessions yet</td></tr>'}</tbody>
    </table>
  </div>

  <script>
    const P = '?p=viewlogs123';

    async function runAction(action) {
      const el = document.getElementById('result');
      el.style.display = 'block';
      el.textContent = 'Running ' + action + '...';
      try {
        const r = await fetch('/api/debug' + P + '&action=' + action);
        const text = await r.text();
        try {
          el.textContent = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          el.textContent = text;
        }
      } catch(e) {
        el.textContent = 'Error: ' + e.message;
      }
    }

    // Auto-refresh every 10 seconds
    setTimeout(() => location.reload(), 10000);
  </script>
</body>
</html>`;

  return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
};

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
