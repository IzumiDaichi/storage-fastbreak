const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { app, BrowserWindow, dialog } = require("electron");

if (app.isPackaged && process.env.PORTABLE_EXECUTABLE_DIR) {
  const portableDataPath = path.join(
    process.env.PORTABLE_EXECUTABLE_DIR,
    "storage-fastbreak-data",
  );
  fs.mkdirSync(portableDataPath, { recursive: true });
  app.setPath("userData", portableDataPath);
}

const envPath = app.isPackaged
  ? path.join(
      process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(process.execPath),
      ".env",
    )
  : path.resolve(__dirname, "../.env");
const envResult = dotenv.config({ path: envPath });
if (envResult.error && envResult.error.code !== "ENOENT") {
  console.error("[ENV] Could not load environment configuration:", envResult.error);
}

const { state } = require("./state");
const { registerIpcHandlers } = require("./ipcHandlers");
const { startLocalAuthListenerServer, signOutCurrentAuth } = require("./auth");
const { flushPendingDriveUpload } = require("./drive");

function createMainWindow(url) {
  state.mainWindow = new BrowserWindow({
    minWidth: 1920,
    minHeight: 1050,
    center: true,
    backgroundColor: "#f6f8fa",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  state.mainWindow.loadURL(url);
  state.mainWindow.on("closed", () => {
    state.mainWindow = null;
  });
}

async function startProductionWebServer() {
  const next = require("next");
  const nextApp = next({
    dev: false,
    dir: app.getAppPath(),
  });

  await nextApp.prepare();
  state.nextApp = nextApp;

  const server = require("http").createServer((request, response) => {
    nextApp.getRequestHandler()(request, response);
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.removeListener("error", reject);
      resolve();
    });
  });
  state.webServer = server;
  return `http://127.0.0.1:${server.address().port}`;
}

app.whenReady().then(async () => {
  try {
    registerIpcHandlers();
    startLocalAuthListenerServer();
    const url = app.isPackaged
      ? await startProductionWebServer()
      : "http://localhost:3000";
    createMainWindow(url);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createMainWindow(url);
    });
  } catch (error) {
    console.error("[STARTUP] Application failed to start:", error);
    await dialog.showMessageBox({
      type: "error",
      title: "Storage Fastbreak could not start",
      message: "The application failed to start.",
      detail: error instanceof Error ? error.message : String(error),
    });
    app.quit();
  }
});

let isCompletingQuit = false;
let shutdownPromise = null;

function quitAfterCleanup() {
  if (shutdownPromise) return shutdownPromise;

  shutdownPromise = (async () => {
    try {
      await flushPendingDriveUpload();
      await state.nextApp?.close();
      if (state.webServer?.listening) {
        await new Promise((resolve) => state.webServer.close(resolve));
      }
      const { revoked } = await signOutCurrentAuth();
      if (!revoked) {
        console.warn("[QUIT] Local credentials removed, but Google token revocation did not complete.");
      }
    } catch (error) {
      console.error("[QUIT] Could not complete sign-out cleanly:", error);
    } finally {
      isCompletingQuit = true;
      app.quit();
    }
  })();
  return shutdownPromise;
}

app.on("before-quit", (event) => {
  if (isCompletingQuit) return;

  event.preventDefault();
  void quitAfterCleanup();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
