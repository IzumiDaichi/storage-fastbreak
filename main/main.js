require("dotenv").config();

const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const http = require("http");
const https = require("https");

let mainWindow = null;

const AUTH_PATH = path.join(app.getPath("userData"), "gdrive_auth_token.json");

// ── RATE LIMITING SAFEGUARDS ──────────────────────────────────────────
const DRIVE_DEBOUNCE_MS = 5000;      // wait 5s of inactivity before uploading
const DRIVE_MIN_INTERVAL_MS = 10000; // never upload more than once per 10s
let driveUploadTimer = null;
let lastDriveUploadTime = 0;
let pendingPayload = null;

function getDataPath(email) {
  const safeName = email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return path.join(app.getPath("userData"), `storage_${safeName}.json`);
}

function getCurrentAuth() {
  try {
    if (!fs.existsSync(AUTH_PATH)) return null;
    const raw = fs.readFileSync(AUTH_PATH, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function getCurrentEmail() {
  return getCurrentAuth()?.email || null;
}

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const PORT = 4567;
const REDIRECT_URI = `http://localhost:${PORT}/api/auth/callback`;
const DRIVE_FILE_NAME = "fastbreak_ledger.json";

// ── TOKEN REFRESH ─────────────────────────────────────────────────────
function refreshAccessToken(refreshToken) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    }).toString();

    const options = {
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function getValidAccessToken() {
  const auth = getCurrentAuth();
  if (!auth?.tokens) throw new Error("No auth tokens found.");

  const { access_token, refresh_token, expiry_date } = auth.tokens;
  const isExpired = expiry_date && Date.now() >= expiry_date - 60000;

  if (!isExpired) return access_token;

  console.log("🔄 Refreshing expired access token...");
  const refreshed = await refreshAccessToken(refresh_token);
  if (refreshed.error) throw new Error(`Token refresh failed: ${refreshed.error}`);

  auth.tokens = {
    ...auth.tokens,
    access_token: refreshed.access_token,
    expiry_date: Date.now() + refreshed.expires_in * 1000,
  };
  fs.writeFileSync(AUTH_PATH, JSON.stringify(auth, null, 2), "utf8");

  return refreshed.access_token;
}

// ── DRIVE API HELPERS ─────────────────────────────────────────────────
function driveRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function findDriveFile(accessToken) {
  const query = encodeURIComponent(`name='${DRIVE_FILE_NAME}' and trashed=false`);
  const res = await driveRequest({
    hostname: "www.googleapis.com",
    path: `/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`,
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return res.body?.files?.[0] || null;
}

async function downloadDriveFile(accessToken, fileId) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "www.googleapis.com",
      path: `/drive/v3/files/${fileId}?alt=media`,
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

async function uploadDriveFile(accessToken, payload, existingFileId = null) {
  const content = JSON.stringify(payload, null, 2);
  const boundary = "fastbreak_boundary";
  const metadata = JSON.stringify({
    name: DRIVE_FILE_NAME,
    ...(existingFileId ? {} : { parents: ["appDataFolder"] }),
  });

  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    metadata,
    `--${boundary}`,
    "Content-Type: application/json",
    "",
    content,
    `--${boundary}--`,
  ].join("\r\n");

  const method = existingFileId ? "PATCH" : "POST";
  const filePath = existingFileId
    ? `/upload/drive/v3/files/${existingFileId}?uploadType=multipart`
    : `/upload/drive/v3/files?uploadType=multipart`;

  return driveRequest({
    hostname: "www.googleapis.com",
    path: filePath,
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": Buffer.byteLength(body),
    },
  }, body);
}

// ── DEBOUNCED DRIVE UPLOAD ────────────────────────────────────────────
// Batches rapid saves into a single Drive upload to stay well within limits.
// At most 1 upload per 10 seconds, only fires after 5s of no new saves.
function scheduleDriveUpload(payload) {
  pendingPayload = payload; // always keep the latest version

  // Clear any existing debounce timer
  if (driveUploadTimer) {
    clearTimeout(driveUploadTimer);
    driveUploadTimer = null;
  }

  const now = Date.now();
  const timeSinceLast = now - lastDriveUploadTime;
  const delay = Math.max(DRIVE_DEBOUNCE_MS, DRIVE_MIN_INTERVAL_MS - timeSinceLast);

  driveUploadTimer = setTimeout(async () => {
    if (!pendingPayload) return;
    const dataToUpload = pendingPayload;
    pendingPayload = null;
    driveUploadTimer = null;
    lastDriveUploadTime = Date.now();

    try {
      const accessToken = await getValidAccessToken();
      const existingFile = await findDriveFile(accessToken);
      await uploadDriveFile(accessToken, dataToUpload, existingFile?.id || null);
      console.log("☁️ Drive sync complete.");
      if (mainWindow) mainWindow.webContents.send("drive:sync-status", { synced: true });
    } catch (err) {
      console.warn("⚠️ Drive upload failed:", err.message);
      if (mainWindow) mainWindow.webContents.send("drive:sync-status", { synced: false, error: err.message });
    }
  }, delay);

  console.log(`⏳ Drive upload scheduled in ${Math.round(delay / 1000)}s`);
}

// ── IPC HANDLERS ──────────────────────────────────────────────────────
console.log("⚙️ Registering IPC handlers...");

ipcMain.handle("data:read", async () => {
  try {
    const email = getCurrentEmail();
    if (!email) return { success: true, data: null };

    // Try Drive first
    try {
      const accessToken = await getValidAccessToken();
      const driveFile = await findDriveFile(accessToken);
      if (driveFile) {
        console.log("☁️ Loading data from Google Drive...");
        const driveData = await downloadDriveFile(accessToken, driveFile.id);
        // Cache locally as backup
        fs.writeFileSync(getDataPath(email), JSON.stringify(driveData, null, 2), "utf8");
        return { success: true, data: driveData, source: "drive" };
      }
    } catch (driveErr) {
      console.warn("⚠️ Drive read failed, using local fallback:", driveErr.message);
    }

    // Local fallback
    const DATA_PATH = getDataPath(email);
    if (!fs.existsSync(DATA_PATH)) return { success: true, data: null };
    const raw = fs.readFileSync(DATA_PATH, "utf8");
    return { success: true, data: JSON.parse(raw), source: "local" };
  } catch (err) {
    console.error("❌ Read error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("data:save", async (event, payload) => {
  try {
    const email = getCurrentEmail();
    if (!email) return { success: false, error: "No authenticated user." };

    // 1. Save locally immediately (never blocked by Drive)
    fs.writeFileSync(getDataPath(email), JSON.stringify(payload, null, 2), "utf8");

    // 2. Schedule Drive upload (debounced — won't spam the API)
    scheduleDriveUpload(payload);

    return { success: true, synced: "pending" };
  } catch (err) {
    console.error("❌ Save error:", err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle("google:check-auth", async () => {
  try {
    if (!fs.existsSync(AUTH_PATH)) return { success: true, isLinked: false };
    const authData = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));
    return { success: true, isLinked: !!authData.tokens, email: authData.email || "Synchronized Account" };
  } catch {
    return { success: true, isLinked: false };
  }
});

ipcMain.handle("google:request-auth", async () => {
  const scopes = [
    "https://www.googleapis.com/auth/drive.appdata",
    "https://www.googleapis.com/auth/userinfo.email",
  ].join(" ");

  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  authUrl.searchParams.append("client_id", GOOGLE_CLIENT_ID);
  authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.append("response_type", "code");
  authUrl.searchParams.append("scope", scopes);
  authUrl.searchParams.append("access_type", "offline");
  authUrl.searchParams.append("prompt", "consent");

  try {
    await shell.openExternal(authUrl.toString());
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("google:sign-out", async () => {
  try {
    if (fs.existsSync(AUTH_PATH)) fs.unlinkSync(AUTH_PATH);
    // Cancel any pending Drive upload on logout
    if (driveUploadTimer) {
      clearTimeout(driveUploadTimer);
      driveUploadTimer = null;
      pendingPayload = null;
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle("system:open-link", async (event, url) => {
  try {
    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
      await shell.openExternal(url);
      return { success: true };
    }
    return { success: false, error: "Invalid URL." };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ── WINDOW ────────────────────────────────────────────────────────────
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: "#0b0f19",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  mainWindow.loadURL("http://localhost:3000");
  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createMainWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

// Flush any pending Drive upload before quitting
app.on("before-quit", async () => {
  if (pendingPayload) {
    console.log("💾 Flushing pending Drive upload before quit...");
    if (driveUploadTimer) clearTimeout(driveUploadTimer);
    try {
      const accessToken = await getValidAccessToken();
      const existingFile = await findDriveFile(accessToken);
      await uploadDriveFile(accessToken, pendingPayload, existingFile?.id || null);
      console.log("☁️ Final Drive sync complete.");
    } catch (err) {
      console.warn("⚠️ Final Drive sync failed:", err.message);
    }
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ── OAUTH EXCHANGE ────────────────────────────────────────────────────
function exchangeCodeForTokens(code) {
  return new Promise((resolve, reject) => {
    const postData = new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString();

    const req = https.request({
      hostname: "oauth2.googleapis.com",
      path: "/token",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(postData),
      },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => { try { resolve(JSON.parse(data)); } catch (e) { reject(e); } });
    });
    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

function fetchUserEmail(accessToken) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: "www.googleapis.com",
      path: "/oauth2/v2/userinfo",
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        try { resolve(JSON.parse(data).email || "active-vault@gmail.com"); } catch (e) { reject(e); }
      });
    });
    req.on("error", reject);
    req.end();
  });
}

// ── AUTH CALLBACK SERVER ──────────────────────────────────────────────
function startLocalAuthListenerServer() {
  const server = http.createServer(async (req, res) => {
    if (!req.url.startsWith("/api/auth/callback")) return;

    const code = new URL(req.url, `http://${req.headers.host}`).searchParams.get("code");
    if (!code) {
      res.writeHead(400, { "Content-Type": "text/html" });
      res.end("<h3>Authentication failed.</h3>");
      return;
    }

    try {
      const tokenResponse = await exchangeCodeForTokens(code);
      if (tokenResponse.error)
        throw new Error(tokenResponse.error_description || tokenResponse.error);

      const realUserEmail = await fetchUserEmail(tokenResponse.access_token);
      fs.writeFileSync(AUTH_PATH, JSON.stringify({
        tokens: {
          ...tokenResponse,
          expiry_date: Date.now() + tokenResponse.expires_in * 1000,
        },
        email: realUserEmail,
      }, null, 2), "utf8");

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html style="background:#0b0f19;color:#fff;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;">
          <div style="text-align:center;padding:2.5rem;background:#111827;border:1px solid #1f2937;border-radius:1rem;max-width:420px;">
            <h1 style="color:#00c97a;font-size:1.4rem;margin:0 0 0.5rem;">Authentication Successful!</h1>
            <p style="color:#9ca3af;font-size:0.85rem;margin:0;">You can close this tab safely.</p>
          </div>
        </html>
      `);

      if (mainWindow)
        mainWindow.webContents.send("google:auth-success", { email: realUserEmail });
    } catch (err) {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(`<h3>Auth failed: ${err.message}</h3>`);
    }
  });
  server.listen(PORT, "localhost");
}

startLocalAuthListenerServer();