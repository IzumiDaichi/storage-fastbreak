const fs = require("fs");
const https = require("https");
const crypto = require("crypto");
const { state } = require("./state");
const {
  DRIVE_DEBOUNCE_MS,
  DRIVE_FILE_NAME,
  DRIVE_MIN_INTERVAL_MS,
  getDataPath,
} = require("./constants");
const { getValidAccessToken, getCurrentEmail } = require("./auth");

function driveRequest(options, body = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.setTimeout(5000, () => {
      req.destroy(new Error("Google Drive request timed out."));
    });
    req.on("error", reject);
    if (body) req.write(body);
    req.end();
  });
}

async function findDriveFile(accessToken) {
  const params = new URLSearchParams({
    spaces: "appDataFolder",
    q: `'appDataFolder' in parents and name='${DRIVE_FILE_NAME}' and trashed=false`,
    orderBy: "modifiedTime desc",
    fields: "files(id,name,modifiedTime)",
  });

  const res = await driveRequest({
    hostname: "www.googleapis.com",
    path: `/drive/v3/files?${params.toString()}`,
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  console.log("[DRIVE] Search Response:", JSON.stringify(res.body, null, 2));
  return res.body?.files?.[0] || null;
}

async function downloadDriveFile(accessToken, fileId) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: "www.googleapis.com",
        path: `/drive/v3/files/${fileId}?alt=media`,
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          try {
            resolve(JSON.parse(data));
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    req.setTimeout(5000, () => {
      req.destroy(new Error("Google Drive download timed out."));
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

  return driveRequest(
    {
      hostname: "www.googleapis.com",
      path: filePath,
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": Buffer.byteLength(body),
      },
    },
    body
  );
}

function clearPendingDriveUpload() {
  if (state.driveUploadTimer) {
    clearTimeout(state.driveUploadTimer);
    state.driveUploadTimer = null;
  }
  state.pendingPayload = null;
  state.pendingPayloadHash = null;
}

function hashPayload(payload) {
  const { lastBackup, ...data } = payload || {};
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(data))
    .digest("hex");
}

function scheduleDriveUpload(payload) {
  const payloadHash = hashPayload(payload);
  if (state.lastDriveUploadHash === payloadHash) {
    console.log("[DRIVE] Payload unchanged from last successful upload. Skipping upload.");
    return;
  }
  if (state.pendingPayloadHash === payloadHash) {
    console.log("[DRIVE] Pending upload already matches new payload. Skipping.");
    return;
  }
  state.pendingPayload = payload;
  state.pendingPayloadHash = payloadHash;
  if (state.driveUploadTimer) {
    clearTimeout(state.driveUploadTimer);
    state.driveUploadTimer = null;
  }

  const now = Date.now();
  const elapsed = now - state.lastDriveUploadTime;
  const delay = Math.max(DRIVE_DEBOUNCE_MS, DRIVE_MIN_INTERVAL_MS - elapsed);

  state.driveUploadTimer = setTimeout(async () => {
    if (!state.pendingPayload) return;

    const dataToUpload = state.pendingPayload;
    const dataHash = state.pendingPayloadHash;
    state.pendingPayload = null;
    state.pendingPayloadHash = null;
    state.driveUploadTimer = null;

    const activeUpload = uploadPendingPayload(
      dataToUpload,
      dataHash || hashPayload(dataToUpload),
    );
    state.driveUploadPromise = Promise.all([
      state.driveUploadPromise,
      activeUpload,
    ]).then(() => undefined);
    await activeUpload;
  }, delay);

  console.log(`[DRIVE] Upload scheduled in ${delay}ms`);
}

async function flushPendingDriveUpload() {
  if (state.driveUploadTimer) {
    clearTimeout(state.driveUploadTimer);
    state.driveUploadTimer = null;
  }

  await state.driveUploadPromise;

  if (state.driveUploadTimer) {
    clearTimeout(state.driveUploadTimer);
    state.driveUploadTimer = null;
  }

  if (!state.pendingPayload) return;

  console.log("[QUIT] Flushing pending Drive upload...");
  const payload = state.pendingPayload;
  const payloadHash = state.pendingPayloadHash || hashPayload(payload);
  state.pendingPayload = null;
  state.pendingPayloadHash = null;
  await uploadPendingPayload(payload, payloadHash, true);
}

async function uploadPendingPayload(payload, payloadHash, isQuitFlush = false) {
  state.lastDriveUploadTime = Date.now();
  try {
    const accessToken = await getValidAccessToken();
    const existingFile = await findDriveFile(accessToken);
    const response = await uploadDriveFile(accessToken, payload, existingFile?.id || null);

    if (response.status < 200 || response.status >= 300) {
      throw new Error(JSON.stringify(response.body));
    }

    state.lastDriveUploadHash = payloadHash;
    console.log(isQuitFlush ? "[QUIT] Final Drive sync complete." : "[DRIVE] Upload successful.");
    if (state.mainWindow) {
      state.mainWindow.webContents.send("drive:sync-status", { synced: true });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(isQuitFlush ? "[QUIT] Final Drive sync failed:" : "[DRIVE] Upload failed:", error);
    if (state.mainWindow) {
      state.mainWindow.webContents.send("drive:sync-status", {
        synced: false,
        error: message,
      });
    }
  }
}

module.exports = {
  clearPendingDriveUpload,
  downloadDriveFile,
  findDriveFile,
  flushPendingDriveUpload,
  scheduleDriveUpload,
  uploadDriveFile,
};
