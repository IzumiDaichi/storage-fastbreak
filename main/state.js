const state = {
  mainWindow: null,
  driveUploadTimer: null,
  lastDriveUploadTime: 0,
  pendingPayload: null,
  pendingPayloadHash: null,
  lastDriveUploadHash: null,
};

module.exports = { state };
