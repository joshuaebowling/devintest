const fs = require('fs');

// QuickBooks rotates refresh tokens, so the latest one must be persisted.
// This stores tokens in a local JSON file, seeded from QBO_REFRESH_TOKEN / QBO_REALM_ID.
function createFileTokenStore({ filePath, refreshToken, realmId }) {
  let state = { refreshToken, realmId };
  if (filePath && fs.existsSync(filePath)) {
    state = { ...state, ...JSON.parse(fs.readFileSync(filePath, 'utf8')) };
  }

  return {
    get: () => ({ ...state }),
    set(update) {
      state = { ...state, ...update };
      if (filePath) {
        const { accessToken, accessTokenExpiresAt, ...persisted } = state;
        fs.writeFileSync(filePath, JSON.stringify(persisted, null, 2), { mode: 0o600 });
      }
    },
  };
}

module.exports = { createFileTokenStore };
