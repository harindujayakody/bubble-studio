// The only bridge between the page and the desktop shell: version info and updates.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("bubbleDesktop", {
  getVersion: () => ipcRenderer.invoke("app:version"),
  checkForUpdates: () => ipcRenderer.invoke("update:check"),
  installUpdate: () => ipcRenderer.invoke("update:install"),
  onUpdate: (callback) => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
});
