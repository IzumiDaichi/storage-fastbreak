const state = {
  mainWindow: null,
  webServer: null,
  nextApp: null,
  driveUploadTimer: null,
  lastDriveUploadTime: 0,
  pendingPayload: null,
  pendingPayloadHash: null,
  driveUploadPromise: Promise.resolve(),
  lastDriveUploadHash: null,
};

module.exports = { state };
