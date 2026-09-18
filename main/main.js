require("dotenv").config();

const path = require("path");
const { app, BrowserWindow } = require("electron");
const { state } = require("./state");
const { registerIpcHandlers } = require("./ipcHandlers");
const { startLocalAuthListenerServer } = require("./auth");
const { flushPendingDriveUpload } = require("./drive");

function createMainWindow() {
  state.mainWindow = new BrowserWindow({
    minWidth: 1920,
    minHeight: 1050,
    center: true,
    backgroundColor: "#f5f7f4",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  state.mainWindow.loadURL("http://localhost:3000");
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
  });
}

app.whenReady().then(() => {
  registerIpcHandlers();
  startLocalAuthListenerServer();
  createMainWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on("before-quit", async () => {
  await flushPendingDriveUpload();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
