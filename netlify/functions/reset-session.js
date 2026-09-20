// reset-session.js — resets session to pending so SUA / waiting pages can poll cleanly
import { dbUpsert } from './_supabase.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'POST') return { statusCode: 405, body: 'Method not allowed' };
  try {
    const { sessionId } = JSON.parse(event.body || '{}');
    if (!sessionId) return ok({ success: false, error: 'No sessionId' });
    await dbUpsert('sessions', {
      id:            sessionId,
      status:        'pending',
      response_type: null,
      last_update:   new Date().toISOString(),
    });
    return ok({ success: true });
  } catch (e) {
    return ok({ success: false, error: e.message });
  }
};

const ok = (b) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
