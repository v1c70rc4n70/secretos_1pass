#!/usr/bin/env node
/**
 * Analiza exportaciones CSV de Chrome/Firefox de forma local.
 * No guarda contraseñas ni imprime sus valores. El CSV debe ser seleccionado
 * explícitamente por el usuario y eliminado manualmente tras la importación.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';

function csv(text) {
  const rows=[]; let row=[], cell='', quoted=false;
  for (let i=0;i<text.length;i++) { const c=text[i], n=text[i+1];
    if (c==='"' && quoted && n==='"') { cell+='"'; i++; continue; }
    if (c==='"') { quoted=!quoted; continue; }
    if (c===',' && !quoted) { row.push(cell); cell=''; continue; }
    if ((c==='\n' || c==='\r') && !quoted) { if(c==='\r'&&n==='\n')i++; row.push(cell); if(row.some(Boolean))rows.push(row); row=[]; cell=''; continue; }
    cell+=c;
  }
  if(cell||row.length){row.push(cell);rows.push(row)}
  return rows;
}
function fingerprint(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
const file=process.argv[2];
if(!file){console.error('Uso: node browser-import.mjs /ruta/export.csv');process.exit(2)}
const rows=csv(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const headers=(rows.shift()||[]).map(x=>x.trim().toLowerCase());
const col=(...names)=>headers.findIndex(h=>names.includes(h));
const site=col('url','login url','hostname'), user=col('username','user name','email'), pass=col('password');
if(pass<0) throw new Error('No encuentro una columna password compatible');
const items=rows.map(r=>({site:r[site]||'Sin URL',user:r[user]||'Sin usuario',fp:fingerprint(r[pass]||'')})).filter(x=>x.fp!==fingerprint(''));
const groups=new Map(); for(const item of items){const a=groups.get(item.fp)||[];a.push(item);groups.set(item.fp,a)}
const repeated=[...groups.values()].filter(a=>a.length>1).map(a=>a.map(({site,user})=>({site,user})));
console.log(JSON.stringify({file,entries:items.length,repeatedGroups:repeated.length,repeated,warning:'Los valores de contraseña no se han guardado ni mostrado. Elimina el CSV después de completar la migración.'},null,2));
