// _supabase.js — Direct REST API calls to Supabase (no WebSocket, no SDK needed)

const BASE  = () => process.env.SUPABASE_URL + '/rest/v1';
const KEY   = () => process.env.SUPABASE_SERVICE_ROLE_KEY;

function headers(extra = {}) {
  return {
    'Content-Type':  'application/json',
    'apikey':        KEY(),
    'Authorization': `Bearer ${KEY()}`,
    ...extra,
  };
}

// SELECT — returns array of rows
export async function dbSelect(table, filters = {}, columns = '*') {
  let url = `${BASE()}/${table}?select=${columns}`;
  for (const [col, val] of Object.entries(filters)) {
    url += `&${col}=eq.${encodeURIComponent(val)}`;
  }
  const r = await fetch(url, { headers: headers({ 'Prefer': 'return=representation' }) });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`dbSelect ${table}: ${r.status} ${e}`);
  }
  return r.json(); // always array
}

// SELECT single row — returns object or null
export async function dbSelectOne(table, filters = {}, columns = '*') {
  const rows = await dbSelect(table, filters, columns);
  return rows[0] || null;
}

// UPSERT — insert or update on conflict with id column
export async function dbUpsert(table, data) {
  const r = await fetch(`${BASE()}/${table}`, {
    method:  'POST',
    headers: headers({ 'Prefer': 'resolution=merge-duplicates,return=minimal' }),
    body:    JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`dbUpsert ${table}: ${r.status} ${e}`);
  }
  return true;
}

// UPDATE rows matching filters
export async function dbUpdate(table, data, filters = {}) {
  let url = `${BASE()}/${table}?`;
  for (const [col, val] of Object.entries(filters)) {
    url += `${col}=eq.${encodeURIComponent(val)}&`;
  }
  url = url.replace(/&$/, '');
  const r = await fetch(url, {
    method:  'PATCH',
    headers: headers({ 'Prefer': 'return=minimal' }),
    body:    JSON.stringify(data),
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error(`dbUpdate ${table}: ${r.status} ${e}`);
  }
  return true;
}
