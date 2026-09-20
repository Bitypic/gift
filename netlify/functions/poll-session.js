import { dbSelectOne } from './_supabase.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') return { statusCode: 405, body: 'Method not allowed' };

  const sessionId = event.queryStringParameters?.sessionId;
  if (!sessionId) return ok({ status: 'waiting' });

  try {
    const row = await dbSelectOne('sessions', { id: sessionId }, 'status,response_type,email');
    if (!row) return ok({ status: 'waiting' });

    return ok({
      status:       row.status,
      responseType: row.response_type,
      email:        row.email,
    });
  } catch (e) {
    console.error('poll-session error:', e.message);
    return ok({ status: 'waiting', error: e.message });
  }
};

const ok = (b) => ({ statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
