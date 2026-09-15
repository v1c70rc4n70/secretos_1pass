const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');

const vaultFile = () => path.join(app.getPath('userData'), 'v4lt3s-vault.json');
let win;

function getVaultKey() {
  if (!safeStorage.isEncryptionAvailable()) throw new Error('El llavero seguro del sistema no está disponible');
  const file = vaultFile();
  if (!fs.existsSync(file)) {
    const key = crypto.randomBytes(32);
    const wrapped = safeStorage.encryptString(key.toString('base64')).toString('base64');
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    fs.writeFileSync(file, JSON.stringify({ wrappedKey: wrapped, version: 1 }), { mode: 0o600 });
  }
  const metadata = JSON.parse(fs.readFileSync(file, 'utf8'));
  return Buffer.from(safeStorage.decryptString(Buffer.from(metadata.wrappedKey, 'base64')), 'base64');
}

function loadVault() {
  const file = vaultFile();
  if (!fs.existsSync(file)) return null;
  const envelope = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!envelope.ciphertext) return null;
  const decipher = crypto.createDecipheriv('aes-256-gcm', getVaultKey(), Buffer.from(envelope.iv, 'base64'));
  decipher.setAuthTag(Buffer.from(envelope.authTag, 'base64'));
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64')), decipher.final()]).toString('utf8'));
}

function saveVault(value) {
  const key = getVaultKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  const previous = JSON.parse(fs.readFileSync(vaultFile(), 'utf8'));
  fs.writeFileSync(vaultFile(), JSON.stringify({ ...previous, iv: iv.toString('base64'), authTag: cipher.getAuthTag().toString('base64'), ciphertext: ciphertext.toString('base64') }), { mode: 0o600 });
  return true;
}

function createWindow() {
  win = new BrowserWindow({ width: 1440, height: 920, minWidth: 1000, minHeight: 700, backgroundColor: '#f7f8fc', webPreferences: { preload: path.join(__dirname, 'desktop-preload.cjs'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
  win.loadFile('index.html');
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https:\/\//.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

ipcMain.handle('vault:load', () => loadVault());
ipcMain.handle('vault:save', (_event, value) => saveVault(value));
ipcMain.handle('vault:location', () => vaultFile());
app.whenReady().then(() => { createWindow(); app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); }); });
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
