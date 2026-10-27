const { contextBridge, ipcRenderer } = require('electron');
const invoke = channel => (...args) => ipcRenderer.invoke(channel, ...args);
contextBridge.exposeInMainWorld('myjong', {
  load: invoke('load'), save: invoke('save'), importPhotos: invoke('import'),
  library: invoke('library'), changePhoto: invoke('change'), backup: invoke('backup'), restore: invoke('restore'),
  phone: invoke('phone'), stopPhone: invoke('stop-phone'), update: invoke('update'),
  checkUpdate:invoke('check-update'),
  identifyPet:invoke('identify-pet'),
  onImport: callback => { ipcRenderer.on('imported', (_,ids,sessionId) => callback(ids,sessionId)); },
  onUpdate: callback => { ipcRenderer.on('update-status', (_, message) => callback(message)); },
  onUpdateAvailable:callback=>{ipcRenderer.on('update-available',(_,info)=>callback(info));},
  onClose: callback => { ipcRenderer.on('prepare-close', () => callback()); },
  finishClose: invoke('finish-close'),
});
