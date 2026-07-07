const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  readLocalData: () => ipcRenderer.invoke("data:read"),
  saveLocalData: (data) => ipcRenderer.invoke("data:save", data),
  checkGoogleAuthStatus: () => ipcRenderer.invoke("google:check-auth"),
  requestGoogleAuthLink: () => ipcRenderer.invoke("google:request-auth"),
  signOutGoogleAccount: () => ipcRenderer.invoke("google:sign-out"),
  openExternalLink: (url) => ipcRenderer.invoke("system:open-link", url),
  onAuthSuccess: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on("google:auth-success", subscription);
    return () => ipcRenderer.removeListener("google:auth-success", subscription);
  },
  // Drive sync status pushed from main process after debounced upload completes
  onDriveSyncStatus: (callback) => {
    const subscription = (event, value) => callback(value);
    ipcRenderer.on("drive:sync-status", subscription);
    return () => ipcRenderer.removeListener("drive:sync-status", subscription);
  },
});