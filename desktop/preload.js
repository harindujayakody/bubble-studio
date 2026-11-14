// The only bridge between the page and the desktop shell.
const { contextBridge, ipcRenderer } = require("electron");

const subscribe = (channel) => (callback) => {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld("bubbleDesktop", {
  getVersion: () => ipcRenderer.invoke("app:version"),
  setTheme: (pref) => ipcRenderer.invoke("theme:set", pref),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  openDownload: () => ipcRenderer.invoke("update:openDownload"),
  onUpdate: subscribe("update:status"),

  getSettings: () => ipcRenderer.invoke("settings:get"),
  chooseDownloadDir: () => ipcRenderer.invoke("settings:chooseDownloadDir"),
  clearDownloadDir: () => ipcRenderer.invoke("settings:clearDownloadDir"),
  openDownloadDir: () => ipcRenderer.invoke("shell:openFolder"),
  showInFolder: (file) => ipcRenderer.invoke("shell:showItem", file),
  onDownloadDone: subscribe("download:done"),
  setDownloadKind: (kind) => ipcRenderer.invoke("download:kind", kind),

  clearCache: () => ipcRenderer.invoke("storage:clearCache"),
  resetAll: () => ipcRenderer.invoke("storage:resetAll"),

  aiStatus: () => ipcRenderer.invoke("ai:status"),
  aiSetKey: (key, model) => ipcRenderer.invoke("ai:setKey", key, model),
  aiClear: () => ipcRenderer.invoke("ai:clear"),
  aiChat: (body) => ipcRenderer.invoke("ai:chat", body),

  modelStatus: (name) => ipcRenderer.invoke("model:status", name),
  downloadModel: (name) => ipcRenderer.invoke("model:download", name),
  cancelModelDownload: () => ipcRenderer.invoke("model:cancel"),
  removeModel: (name) => ipcRenderer.invoke("model:remove", name),
  onModelProgress: subscribe("model:progress"),
});
