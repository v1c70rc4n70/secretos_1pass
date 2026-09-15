#!/usr/bin/env node
/**
 * HIBP bridge for v4lt3s.
 * Password checks use k-anonymity: only the first 5 SHA-1 chars leave the PC.
 * Email breach checks require HIBP_API_KEY and must run server-side.
 */
import crypto from 'node:crypto';

const HIBP_PASSWORDS = 'https://api.pwnedpasswords.com/range/';
const HIBP_API = 'https://haveibeenpwned.com/api/v3/';
const USER_AGENT = 'v4lt3s-secret-security/0.1';

function sha1(value) {
  return crypto.createHash('sha1').update(value, 'utf8').digest('hex').toUpperCase();
}

export async function checkPassword(password) {
  if (typeof password !== 'string' || !password) throw new Error('Falta la contraseña');
  const hash = sha1(password);
  const prefix = hash.slice(0, 5);
  const response = await fetch(HIBP_PASSWORDS + prefix, { headers: { 'user-agent': USER_AGENT, 'add-padding': 'true' } });
  if (!response.ok) throw new Error(`HIBP respondió ${response.status}`);
  const rows = (await response.text()).split('\n');
  const match = rows.find(row => row.slice(0, 35).trim().toUpperCase() === hash.slice(5));
  return { exposed: Boolean(match), occurrences: match ? Number(match.split(':')[1]) : 0, checkedWith: 'k-anonymity' };
}

export async function checkEmail(email) {
  const key = process.env.HIBP_API_KEY;
  if (!key) throw new Error('Configura HIBP_API_KEY solo en el backend');
  const response = await fetch(HIBP_API + `breachedaccount/${encodeURIComponent(email.trim())}?truncateResponse=true`, {
    headers: { 'user-agent': USER_AGENT, 'hibp-api-key': key }
  });
  if (response.status === 404) return { exposed: false, breaches: [] };
  if (!response.ok) throw new Error(`HIBP respondió ${response.status}`);
  return { exposed: true, breaches: await response.json(), source: 'Have I Been Pwned' };
}

export async function checkStealerLogs(email) {
  const key = process.env.HIBP_API_KEY;
  if (!key) throw new Error('Configura HIBP_API_KEY solo en el backend');
  const response = await fetch(HIBP_API + `stealerLogsByEmail/${encodeURIComponent(email.trim())}`, {
    headers: { 'user-agent': USER_AGENT, 'hibp-api-key': key }
  });
  if (response.status === 404) return { exposed: false, websites: [], source: 'Have I Been Pwned stealer logs' };
  if (!response.ok) throw new Error(`HIBP stealer logs respondió ${response.status}`);
  return { exposed: true, websites: await response.json(), source: 'Have I Been Pwned stealer logs' };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [type, value] = process.argv.slice(2);
  const result = type === 'password' ? await checkPassword(value) : type === 'email' ? await checkEmail(value) : type === 'stealer' ? await checkStealerLogs(value) : null;
  if (!result) { console.error('Uso: HIBP_API_KEY=... node hibp-bridge.mjs password <valor> | email <correo>'); process.exitCode = 2; }
  else console.log(JSON.stringify(result, null, 2));
}
