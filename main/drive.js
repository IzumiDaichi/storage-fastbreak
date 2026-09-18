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
    state.pendingPayload = null;
    state.driveUploadTimer = null;
    state.lastDriveUploadTime = Date.now();

    try {
      console.log("\n========== DRIVE SYNC ==========");
      console.log("[DRIVE] Preparing upload...");

      const accessToken = await getValidAccessToken();
      const existingFile = await findDriveFile(accessToken);

      console.log("[DRIVE] Existing file:", existingFile ? existingFile.id : "NONE");

      const response = await uploadDriveFile(accessToken, dataToUpload, existingFile?.id || null);

      console.log("[DRIVE] Upload response:");
      console.log(JSON.stringify(response, null, 2));

      if (response.status >= 200 && response.status < 300) {
        console.log("[DRIVE] Upload successful.");
        state.lastDriveUploadHash = payloadHash;

        if (state.mainWindow) {
          state.mainWindow.webContents.send("drive:sync-status", { synced: true });
        }
      } else {
        throw new Error(JSON.stringify(response.body));
      }
    } catch (error) {
      console.error("[DRIVE] Upload FAILED");
      console.error(error);

      if (state.mainWindow) {
        state.mainWindow.webContents.send("drive:sync-status", {
          synced: false,
          error: error.message,
        });
      }
    }

    console.log("================================\n");
  }, delay);

  console.log(`[DRIVE] Upload scheduled in ${delay}ms`);
}

async function flushPendingDriveUpload() {
  if (!state.pendingPayload) return;

  console.log("[QUIT] Flushing pending Drive upload...");
  if (state.driveUploadTimer) clearTimeout(state.driveUploadTimer);

  const payloadHash = hashPayload(state.pendingPayload);
  try {
    const accessToken = await getValidAccessToken();
    const existingFile = await findDriveFile(accessToken);
    await uploadDriveFile(accessToken, state.pendingPayload, existingFile?.id || null);
    state.lastDriveUploadHash = payloadHash;
    console.log("[QUIT] Final Drive sync complete.");
  } catch (error) {
    console.warn("[QUIT] Final Drive sync failed:", error.message);
  }

  clearPendingDriveUpload();
}

module.exports = {
  clearPendingDriveUpload,
  downloadDriveFile,
  findDriveFile,
  flushPendingDriveUpload,
  scheduleDriveUpload,
  uploadDriveFile,
};
