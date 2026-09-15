#!/usr/bin/env node
/** Puente conservador con 1Password CLI: solo metadatos y referencias op://. */
import { execFileSync } from 'node:child_process';

const vault = process.env.OP_VAULT || 'Personal';
function op(args) {
  return execFileSync('op', args, { env: { ...process.env }, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}
function metadata() {
  const items = JSON.parse(op(['item', 'list', '--vault', vault, '--format', 'json']));
  return items.map(({ id, title, category, vault: itemVault, urls, fields }) => ({
    id, title, category, vault: itemVault?.name || vault,
    urls: (urls || []).map(({ href }) => href).filter(Boolean),
    fieldCount: Array.isArray(fields) ? fields.length : 0
  }));
}
const [command, item, field] = process.argv.slice(2);
try {
  if (command === 'list') process.stdout.write(`${JSON.stringify(metadata(), null, 2)}\n`);
  else if (command === 'ref' && item) process.stdout.write(`op://${vault}/${item}/${field || 'password'}\n`);
  else { console.error('Uso: node onepassword-bridge.mjs list | ref <item> [campo]'); process.exitCode = 2; }
} catch (error) {
  console.error(`No se pudo consultar 1Password: ${error.message}`);
  console.error('Autentica primero el CLI con una cuenta de servicio de mínimo privilegio.');
  process.exitCode = 1;
}
