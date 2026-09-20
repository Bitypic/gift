// validate-email.js  –  replaces rsa.php
// Validates email format. Returns { success: true } for any valid email.

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { email } = JSON.parse(event.body || '{}');

    if (!email || typeof email !== 'string') {
      return ok({ success: false, message: 'Please enter an email or phone number' });
    }

    const trimmed = email.trim();
    const valid = trimmed.length > 3 && (trimmed.includes('@') || /^\+?[\d\s\-()]{7,}$/.test(trimmed));

    if (!valid) {
      return ok({ success: false, message: 'Enter a valid email or phone number' });
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
