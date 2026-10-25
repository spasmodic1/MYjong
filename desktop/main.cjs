const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');
const { Library, accepted } = require('./library.cjs');
const { startPhone } = require('./phone.cjs');
const root = path.resolve(__dirname, '..');
protocol.registerSchemesAsPrivileged([{ scheme: 'myjong', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }]);
let window, library, phone, closeReady = false;
const testingRoot = process.env.MYJONG_TEST_DATA;
if (testingRoot) app.setPath('userData', path.resolve(testingRoot));
app.setName('MYjong');
if (!app.requestSingleInstanceLock()) app.quit();
app.on('second-instance', () => { window?.show(); window?.focus(); });
async function walk(dir, depth = 0) {
  if (depth > 10) return [];
  const files = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (files.length >= 500) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...await walk(full, depth + 1));
    else if (entry.isFile() && accepted.test(entry.name)) files.push(full);
  }
  return files.slice(0, 500);
}
const handle = (channel, fn) => ipcMain.handle(channel, async (event, ...args) => {
  if (event.sender !== window.webContents || event.senderFrame !== window.webContents.mainFrame) throw Error('Untrusted window');
  return fn(...args);
});
app.whenReady().then(async () => {
  const hasLibrary=await fs.stat(path.join(app.getPath('userData'),'library.json')).then(()=>true,()=>false);
  library = await new Library(app.getPath('userData')).init();
  const starter=path.join(root,'assets','starter-collection.zip');
  if(app.isPackaged && !hasLibrary && await fs.stat(starter).then(()=>true,()=>false)) {
    const previous=await library.read('state.json',null);
    await library.restore(starter);
    if(previous)await library.atomic('state.json',previous);
  }
  if (!app.isPackaged && !testingRoot && !library.data.seeded) {
    try {
      const catalog = JSON.parse(await fs.readFile(path.join(root, 'photo-catalog.json'), 'utf8'));
      for (const name of new Set(catalog.map(p => p.name))) {
        await library.import(catalog.filter(p => p.name === name).map(p => path.resolve(root, p.src)), name);
      }
      library.data.seeded = true; await library.commit();
    } catch { /* Optional private development collection. */ }
  }
  protocol.handle('myjong', async request => {
    try {
      const url = new URL(request.url);
      if (url.hostname === 'app') {
        const filename = decodeURIComponent(url.pathname.slice(1)) || 'index.html';
        if (filename.startsWith('photo/')) {
          const [,id,variant]=filename.split('/');
          return net.fetch(pathToFileURL(library.file(id,variant || 'tile')).href);
        }
        if (filename.includes('..') || filename.includes('\\') || !(filename === 'index.html' || /^(src|assets)\//.test(filename))) return new Response('',{status:404});
        return net.fetch(pathToFileURL(path.join(root,filename)).href);
      }
      if (url.hostname !== 'photo') return new Response('', { status: 404 });
      const [id, variant] = url.pathname.slice(1).split('/');
      const response=await net.fetch(pathToFileURL(library.file(id, variant || 'tile')).href);
      response.headers.set('Access-Control-Allow-Origin','myjong://app');
      return response;
    } catch { return new Response('', { status: 404 }); }
  });
  window = new BrowserWindow({ width: 1380, height: 900, minWidth: 900, minHeight: 650,
    title: 'MYjong', icon:path.join(root,'assets/icon.png'), backgroundColor: '#123e36', autoHideMenuBar: true, show: process.env.MYJONG_SMOKE !== '1',
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, sandbox: true, nodeIntegration: false, backgroundThrottling: false } });
  window.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false));
  window.on('close', event => {
    if (closeReady || window.webContents.isLoading()) return;
    event.preventDefault(); window.webContents.send('prepare-close');
    // Leave a recovery route if the renderer has failed.
    setTimeout(() => { closeReady=true; window?.destroy(); },5000).unref();
  });
  handle('finish-close', () => { closeReady = true; setImmediate(() => window.close()); return true; });
  handle('load', async () => {
    let state, recovered=false;
    try{state=await library.read('state.json',null);}catch{state=null;recovered=true;}
    if(recovered || state && !(await import('../src/game.js')).validState(state)) {
      await fs.copyFile(path.join(library.root,'state.json'),path.join(library.root,`unreadable-state-${Date.now()}.json`));
      state=null;
      recovered=true;
    }
    return {state,library:library.snapshot(),version:app.getVersion(),desktop:true,recovered};
  });
  handle('save', state => {
    if (!state || state.version !== 2 || JSON.stringify(state).length > 4 * 1024 * 1024) throw Error('Invalid game save');
    return library.exclusive(async () => { await library.atomic('state.json', state); return true; });
  });
  handle('library', () => library.snapshot());
  handle('change', action => library.change(action));
  handle('import', async (folder = false) => {
    const result = await dialog.showOpenDialog(window, { title: folder ? 'Choose a photo folder' : 'Choose photos', properties: folder ? ['openDirectory'] : ['openFile', 'multiSelections'],
      filters: [{ name: 'Photos', extensions: ['jpg','jpeg','png','webp','heic','heif','avif'] }] });
    if (result.canceled) return null;
    const files = folder ? await walk(result.filePaths[0]) : result.filePaths;
    return library.import(files);
  });
  handle('backup', async () => {
    const result = await dialog.showSaveDialog(window, { title: 'Back up MYjong', defaultPath: `MYjong-backup-${new Date().toISOString().slice(0,10)}.zip`, filters: [{ name: 'MYjong backup', extensions: ['zip'] }] });
    if (result.canceled) return false;
    await library.backup(result.filePath); return true;
  });
  handle('restore', async () => {
    const result = await dialog.showOpenDialog(window, { title:'Restore a MYjong backup', properties:['openFile'], filters:[{name:'MYjong backup',extensions:['zip']}] });
    if (result.canceled) return null;
    return library.restore(result.filePaths[0]);
  });
  handle('phone', async () => { phone?.close(); phone = await startPhone(library, () => window.webContents.send('imported')); return { url: phone.url, qr: phone.qr }; });
  handle('stop-phone', () => { phone?.close(); phone = null; });
  handle('update', async () => {
    let config;
    try { config = JSON.parse(await fs.readFile(path.join(root, 'release-config.json'), 'utf8')); } catch { /* An offline build has no feed. */ }
    if (!app.isPackaged || !config?.owner || !config?.repo) return 'This build has no release channel yet. Your photos and saves are safe to keep using.';
    const { autoUpdater } = require('electron-updater');
    autoUpdater.setFeedURL({ provider: 'github', owner: config.owner, repo: config.repo });
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    const result = await autoUpdater.checkForUpdates();
    if (!result || !result.isUpdateAvailable) return 'You have the latest version.';
    const answer = await dialog.showMessageBox(window, { type: 'question', buttons: ['Download update', 'Later'], defaultId: 0, cancelId: 1, message: `MYjong ${result.updateInfo.version} is available.`, detail: 'Your photo library and saved games will stay on this computer.' });
    if (answer.response !== 0) return 'Update postponed.';
    await autoUpdater.downloadUpdate();
    const install = await dialog.showMessageBox(window, { buttons: ['Restart and install', 'Later'], cancelId: 1, message: 'The update is ready.' });
    if (install.response === 0) autoUpdater.quitAndInstall();
    return 'Update downloaded. Use Update game when you are ready to install.';
  });
  await window.loadURL('myjong://app/index.html');
}).catch(error => { dialog.showErrorBox('MYjong could not start', error.message); app.quit(); });
app.on('window-all-closed', () => { phone?.close(); app.quit(); });
