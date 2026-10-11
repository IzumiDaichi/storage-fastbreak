const fs = require("fs");
const { ipcMain, shell } = require("electron");
const { AUTH_PATH, getDataPath } = require("./constants");
const { getCurrentEmail, getValidAccessToken, signOutCurrentAuth } = require("./auth");
const {
  clearPendingDriveUpload,
  downloadDriveFile,
  findDriveFile,
  scheduleDriveUpload,
} = require("./drive");

function registerIpcHandlers() {
  console.log("[INIT] Registering IPC handlers...");

  ipcMain.handle("data:read", async () => {
    try {
      const email = getCurrentEmail();

      if (!email) {
        return { success: true, data: null };
      }

      const dataPath = getDataPath(email);
      let localData = null;
      let localMtime = null;

      if (fs.existsSync(dataPath)) {
        try {
          localMtime = fs.statSync(dataPath).mtime.toISOString();
          const raw = fs.readFileSync(dataPath, "utf8");
          localData = JSON.parse(raw);
        } catch (localReadError) {
          console.warn("[LOCAL] Failed to read local backup, will attempt drive fetch:", localReadError);
          localData = null;
          localMtime = null;
        }
      }

      try {
        console.log("\n========== DRIVE READ ==========");

        const accessToken = await getValidAccessToken();
        const driveFile = await findDriveFile(accessToken);

        if (driveFile) {
          const driveModified = driveFile.modifiedTime ? new Date(driveFile.modifiedTime).toISOString() : null;
          const shouldDownloadFromDrive = !localData || (driveModified && localMtime && driveModified > localMtime);

          if (!shouldDownloadFromDrive && localData) {
            console.log("[DRIVE] Found drive backup, but local copy is newer or equal. Using local backup.");
            return { success: true, data: localData, source: "local" };
          }

          console.log("[DRIVE] Downloading:", driveFile.id);
          const driveData = await downloadDriveFile(accessToken, driveFile.id);
          console.log("[DRIVE] Download complete.");
          console.log("[DRIVE] Transactions:", driveData.transactions?.length || 0);

          fs.writeFileSync(dataPath, JSON.stringify(driveData, null, 2), "utf8");
          return { success: true, data: driveData, source: "drive" };
        }

        console.log("[DRIVE] No cloud backup exists.");
      } catch (error) {
        console.error("[DRIVE] Download failed:", error);
      }

      if (!localData) {
        return { success: true, data: null };
      }

      console.log("[LOCAL] Loading local backup...");
      console.log("[LOCAL] Transactions:", localData.transactions?.length || 0);

      return { success: true, data: localData, source: "local" };
    } catch (error) {
      console.error(error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("data:save", async (event, payload) => {
    try {
      const email = getCurrentEmail();
      if (!email) return { success: false, error: "No authenticated user." };

      const dataPath = getDataPath(email);
      if (fs.existsSync(dataPath)) {
        try {
          const existingRaw = fs.readFileSync(dataPath, "utf8");
          const existingData = JSON.parse(existingRaw);
          const { lastBackup: existingLastBackup, ...existingContent } = existingData;
          const { lastBackup, ...newContent } = payload;
          if (JSON.stringify(existingContent) === JSON.stringify(newContent)) {
            console.log("[SAVE] Payload unchanged from local backup. Skipping write and upload.");
            return { success: true, synced: "unchanged" };
          }
        } catch (compareError) {
          console.warn("[SAVE] Could not compare existing payload:", compareError);
        }
      }

      fs.writeFileSync(dataPath, JSON.stringify(payload, null, 2), "utf8");
      scheduleDriveUpload(payload);

      return { success: true, synced: "pending" };
    } catch (error) {
      console.error("[ERROR] Save error:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("google:check-auth", async () => {
    try {
      if (!fs.existsSync(AUTH_PATH)) return { success: true, isLinked: false };

      const authData = JSON.parse(fs.readFileSync(AUTH_PATH, "utf8"));

      // Check that the stored token includes drive.appdata scope.
      // Tokens granted before Drive was added won't have it — force re-login.
      const scope = authData.tokens?.scope || "";
      const hasDriveScope = scope.includes("drive.appdata") || scope.includes("drive");

      if (authData.tokens && !hasDriveScope) {
        console.warn("[AUTH] Stored token missing drive.appdata scope — deleting stale token.");
        fs.unlinkSync(AUTH_PATH);
        return { success: true, isLinked: false, reason: "scope_mismatch" };
      }

      console.log("[AUTH] Check auth — linked:", !!authData.tokens, "| email:", authData.email);
      return {
        success: true,
        isLinked: !!authData.tokens,
        email: authData.email || "Synchronized Account",
      };
    } catch {
      return { success: true, isLinked: false };
    }
  });

  ipcMain.handle("google:request-auth", async () => {
    if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
      return {
        success: false,
        error: "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to the .env file beside the portable executable, then restart the app.",
      };
    }

    const scopes = [
      "https://www.googleapis.com/auth/drive.appdata",
      "https://www.googleapis.com/auth/userinfo.email",
    ].join(" ");

    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.append("client_id", process.env.GOOGLE_CLIENT_ID);
    authUrl.searchParams.append("redirect_uri", "http://localhost:4567/api/auth/callback");
    authUrl.searchParams.append("response_type", "code");
    authUrl.searchParams.append("scope", scopes);
    authUrl.searchParams.append("access_type", "offline");
    authUrl.searchParams.append("prompt", "consent");

    console.log("[AUTH] Opening Google authorization request.");

    try {
      await shell.openExternal(authUrl.toString());
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("google:sign-out", async () => {
    try {
      const { revoked } = await signOutCurrentAuth();
      clearPendingDriveUpload();
      console.log("[AUTH] Signed out and local credentials removed.");
      return { success: true, revoked };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("system:open-link", async (event, url) => {
    try {
      if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
        await shell.openExternal(url);
        return { success: true };
      }
      return { success: false, error: "Invalid URL." };
    } catch (error) {
      return { success: false, error: error.message };
    }
  });
}

module.exports = { registerIpcHandlers };