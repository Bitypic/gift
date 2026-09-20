import { dbUpsert } from './_supabase.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };

  try {
    const { sessionId, email } = JSON.parse(event.body || '{}');
    if (!sessionId || sessionId.length !== 32) return ok({ success: false, error: 'Invalid sessionId' });

    await dbUpsert('sessions', {
      id:          sessionId,
      email:       email || null,
      status:      'pending',
      last_update: new Date().toISOString(),
    });

    return ok({ success: true, sessionId });
  } catch (e) {
    console.error('create-session error:', e.message);
    return ok({ success: false, error: e.message });
  }
};

const ok = (b) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
