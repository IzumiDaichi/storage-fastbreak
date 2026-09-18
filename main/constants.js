const path = require("path");
const { app } = require("electron");

const AUTH_PATH = path.join(app.getPath("userData"), "gdrive_auth_token.json");
const DRIVE_FILE_NAME = "fastbreak_ledger.json";
const DRIVE_DEBOUNCE_MS = 5000;
const DRIVE_MIN_INTERVAL_MS = 10000;
const PORT = 4567;
const REDIRECT_URI = `http://localhost:${PORT}/api/auth/callback`;

function getDataPath(email) {
  const safeName = email.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  return path.join(app.getPath("userData"), `storage_${safeName}.json`);
}

module.exports = {
  AUTH_PATH,
  DRIVE_FILE_NAME,
  DRIVE_DEBOUNCE_MS,
  DRIVE_MIN_INTERVAL_MS,
  PORT,
  REDIRECT_URI,
  getDataPath,
};
